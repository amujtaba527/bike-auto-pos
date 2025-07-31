import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/purchase-returns - Get all purchase returns or specific return by ID
export async function GET() {
  try {
      // Fetch all purchase returns
      const res = await pool.query(`
        SELECT pr.*, v.name as vendor_name 
        FROM purchase_returns pr 
        LEFT JOIN vendors v ON pr.vendor_id = v.id 
        ORDER BY pr.id ASC
      `);
      return NextResponse.json(res.rows);
    } catch (error) {
    return NextResponse.json({ error: "Error fetching purchase returns: " + error }, { status: 500 });
  }
}

// POST /api/purchase-returns - Create a new purchase return
export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body || 
        typeof body.return_number !== "string" || 
        typeof body.original_purchase_id !== "number" ||
        typeof body.vendor_id !== "number" ||
        typeof body.subtotal !== "number" ||
        typeof body.tax_amount !== "number" ||
        typeof body.total_amount !== "number" || 
        typeof body.refund_received !== "number" ||
        typeof body.items !== "object") {
      return NextResponse.json({ error: "Invalid return details" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Check if return number already exists
    const returnCheck = await client.query(
      'SELECT id FROM purchase_returns WHERE return_number = $1',
      [body.return_number]
    );

    if (returnCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Return number already exists" }, { status: 400 });
    }

    // Verify original purchase exists
    const purchaseCheck = await client.query(
      'SELECT * FROM purchases WHERE id = $1',
      [body.original_purchase_id]
    );

    if (purchaseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Original purchase not found" }, { status: 404 });
    }

    // Verify vendor exists
    const vendorCheck = await client.query(
      'SELECT * FROM vendors WHERE id = $1',
      [body.vendor_id]
    );

    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Validate return items against original purchase items
    for (const item of body.items) {
      // Check if this item was in the original purchase
      const purchaseItemCheck = await client.query(
        'SELECT quantity, unit_price FROM purchase_items WHERE purchase_id = $1 AND product_id = $2',
        [body.original_purchase_id, item.product_id]
      );

      if (purchaseItemCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: `Product ID ${item.product_id} was not in the original purchase` 
        }, { status: 400 });
      }

      const originalItem = purchaseItemCheck.rows[0];
      
      // Check if return quantity exceeds original quantity
      if (item.quantity > originalItem.quantity) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: `Return quantity (${item.quantity}) exceeds original quantity (${originalItem.quantity}) for product ID ${item.product_id}` 
        }, { status: 400 });
      }
    }

    // Insert purchase return record
    const res = await client.query(
      `INSERT INTO purchase_returns (
        return_number, original_purchase_id, vendor_id, subtotal, tax_amount, 
        total_amount, refund_received, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, 
      [
        body.return_number, 
        body.original_purchase_id, 
        body.vendor_id,
        body.subtotal,
        body.tax_amount,
        body.total_amount,
        body.refund_received,
        body.reason || '',
        'COMPLETED'
      ]
    );
    
    const purchaseReturn = res.rows[0];
    const returnId = purchaseReturn.id;
    const returnDate = new Date(purchaseReturn.return_date).toISOString().split('T')[0];

    // Insert return items and update inventory
    let totalCOGS = 0;
    
    for (const item of body.items) {
      // Insert return item
      await client.query(
        "INSERT INTO purchase_return_items (purchase_return_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
        [returnId, item.product_id, item.quantity, item.unit_price, item.line_total]
      );
      
      // Calculate COGS for returned items
      const productResult = await client.query(
        'SELECT cost_price FROM products WHERE id = $1',
        [item.product_id]
      );
      
      const costPrice = productResult.rows[0].cost_price;
      const itemCOGS = item.quantity * costPrice;
      totalCOGS += itemCOGS;

      // Update product stock (decrease inventory)
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Create journal entry for the purchase return
    const journalRes = await client.query(
      `INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING journal_id`,
      [
        returnDate,
        `Purchase Return #${body.return_number}`,
        'PURCHASE_RETURN',
        returnId
      ]
    );

    const journalId = journalRes.rows[0].journal_id;

    // Create journal entry lines (Double-entry accounting for purchase returns)
    
    // 1. Debit: Cash Account (Account ID: 1) - Receive refund money
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        1, // Cash Account ID
        body.refund_received,
        `Refund received for purchase return #${body.return_number}`
      ]
    );

    // 2. Credit: Inventory Account (Account ID: 2) - Decrease inventory
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, credit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        2, // Inventory Account ID
        totalCOGS,
        `Inventory decrease for purchase return #${body.return_number}`
      ]
    );

    // 3. Debit: Cost of Goods Sold Account (Account ID: 8) - Increase COGS (expense for returned items)
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        8, // COGS Account ID
        totalCOGS,
        `COGS increase for purchase return #${body.return_number}`
      ]
    );

    // 4. Credit: Accounts Payable Account (Account ID: 5) - Reduce amount owed to vendor
    if (body.total_amount > 0) {
      await client.query(
        `INSERT INTO journal_entry_lines (
          journal_id, account_id, credit_amount, description
        ) VALUES ($1, $2, $3, $4)`,
        [
          journalId,
          5, // Accounts Payable Account ID
          body.total_amount,
          `Reduction in amount owed for purchase return #${body.return_number}`
        ]
      );
    }

    // Post to General Ledger
    // Debit entries
    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, debit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        returnDate,
        1, // Cash Account
        body.refund_received,
        `Refund received for purchase return #${body.return_number}`,
        'PURCHASE_RETURN',
        returnId,
        journalId
      ]
    );

    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, debit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        returnDate,
        8, // COGS Account
        totalCOGS,
        `COGS increase for purchase return #${body.return_number}`,
        'PURCHASE_RETURN',
        returnId,
        journalId
      ]
    );

    // Credit entries
    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, credit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        returnDate,
        2, // Inventory Account
        totalCOGS,
        `Inventory decrease for purchase return #${body.return_number}`,
        'PURCHASE_RETURN',
        returnId,
        journalId
      ]
    );

    if (body.total_amount > 0) {
      await client.query(
        `INSERT INTO general_ledger (
          transaction_date, account_id, credit_amount, description, 
          reference_type, reference_id, journal_entry_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          returnDate,
          5, // Accounts Payable Account
          body.total_amount,
          `Reduction in amount owed for purchase return #${body.return_number}`,
          'PURCHASE_RETURN',
          returnId,
          journalId
        ]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Purchase return processed successfully with accounting entries", 
      purchase_return: purchaseReturn,
      accounting: {
        journal_entry_id: journalId,
        total_cogs: totalCOGS
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error processing purchase return:", error);
    return NextResponse.json({ error: "Error processing purchase return: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}