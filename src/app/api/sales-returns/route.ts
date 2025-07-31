import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/sales-returns - Get all sales returns or specific return by ID
export async function GET() {
  try {
      // Fetch all sales returns
      const res = await pool.query(`
        SELECT sr.*, c.name as customer_name 
        FROM sale_returns sr 
        LEFT JOIN customers c ON sr.customer_id = c.id 
        ORDER BY sr.id ASC
      `);
      return NextResponse.json(res.rows);
    
  } catch (error) {
    return NextResponse.json({ error: "Error fetching sales returns: " + error }, { status: 500 });
  }
}

// POST /api/sales-returns - Create a new sales return
export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body || 
        typeof body.return_number !== "string" || 
        typeof body.original_sale_id !== "number" ||
        typeof body.customer_id !== "number" ||
        typeof body.subtotal !== "number" ||
        typeof body.tax_amount !== "number" ||
        typeof body.total_amount !== "number" || 
        typeof body.refund_amount !== "number" ||
        typeof body.items !== "object") {
      return NextResponse.json({ error: "Invalid return details" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Check if return number already exists
    const returnCheck = await client.query(
      'SELECT id FROM sale_returns WHERE return_number = $1',
      [body.return_number]
    );

    if (returnCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Return number already exists" }, { status: 400 });
    }

    // Verify original sale exists
    const saleCheck = await client.query(
      'SELECT * FROM sales WHERE id = $1',
      [body.original_sale_id]
    );

    if (saleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Original sale not found" }, { status: 404 });
    }

    // Verify customer exists
    const customerCheck = await client.query(
      'SELECT * FROM customers WHERE id = $1',
      [body.customer_id]
    );

    if (customerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Validate return items against original sale items
    for (const item of body.items) {
      // Check if this item was in the original sale
      const saleItemCheck = await client.query(
        'SELECT quantity, unit_price FROM sales_items WHERE sale_id = $1 AND product_id = $2',
        [body.original_sale_id, item.product_id]
      );

      if (saleItemCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: `Product ID ${item.product_id} was not in the original sale` 
        }, { status: 400 });
      }

      const originalItem = saleItemCheck.rows[0];
      
      // Check if return quantity exceeds original quantity
      if (item.quantity > originalItem.quantity) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: `Return quantity (${item.quantity}) exceeds original quantity (${originalItem.quantity}) for product ID ${item.product_id}` 
        }, { status: 400 });
      }
    }

    // Insert sale return record
    const res = await client.query(
      `INSERT INTO sale_returns (
        return_number, original_sale_id, customer_id, subtotal, tax_amount, 
        total_amount, refund_amount, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, 
      [
        body.return_number, 
        body.original_sale_id, 
        body.customer_id,
        body.subtotal,
        body.tax_amount,
        body.total_amount,
        body.refund_amount,
        body.reason || '',
        'COMPLETED'
      ]
    );
    
    const saleReturn = res.rows[0];
    const returnId = saleReturn.id;
    const returnDate = new Date(saleReturn.return_date).toISOString().split('T')[0];

    // Insert return items and update inventory
    let totalCOGS = 0;
    
    for (const item of body.items) {
      // Insert return item
      await client.query(
        "INSERT INTO sale_return_items (sale_return_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
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

      // Update product stock (increase inventory)
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Create journal entry for the sale return
    const journalRes = await client.query(
      `INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING journal_id`,
      [
        returnDate,
        `Sale Return #${body.return_number}`,
        'SALE_RETURN',
        returnId
      ]
    );

    const journalId = journalRes.rows[0].journal_id;

    // Create journal entry lines (Double-entry accounting for returns)
    
    // 1. Debit: Sales Revenue Account (Account ID: 7) - Reverse revenue
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        7, // Sales Revenue Account ID
        body.subtotal,
        `Sales return #${body.return_number} - Revenue reversal`
      ]
    );

    // 2. Credit: Cash Account (Account ID: 1) - Refund money
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, credit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        1, // Cash Account ID
        body.refund_amount,
        `Refund for return #${body.return_number}`
      ]
    );

    // 3. Debit: Tax Payable Account (Account ID: 4) - Reverse collected tax (if applicable)
    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO journal_entry_lines (
          journal_id, account_id, debit_amount, description
        ) VALUES ($1, $2, $3, $4)`,
        [
          journalId,
          4, // Tax Payable Account ID
          body.tax_amount,
          `Tax refund for return #${body.return_number}`
        ]
      );
    }

    // 4. Credit: Cost of Goods Sold Account (Account ID: 8) - Reverse COGS
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, credit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        8, // COGS Account ID
        totalCOGS,
        `COGS reversal for return #${body.return_number}`
      ]
    );

    // 5. Debit: Inventory Account (Account ID: 2) - Increase inventory
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        2, // Inventory Account ID
        totalCOGS,
        `Inventory increase for return #${body.return_number}`
      ]
    );

    // Post to General Ledger
    // Debit entries
    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, debit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        returnDate,
        7, // Sales Revenue Account
        body.subtotal,
        `Sales return #${body.return_number} - Revenue reversal`,
        'SALE_RETURN',
        returnId,
        journalId
      ]
    );

    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO general_ledger (
          transaction_date, account_id, debit_amount, description, 
          reference_type, reference_id, journal_entry_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          returnDate,
          4, // Tax Payable Account
          body.tax_amount,
          `Tax refund for return #${body.return_number}`,
          'SALE_RETURN',
          returnId,
          journalId
        ]
      );
    }

    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, debit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        returnDate,
        2, // Inventory Account
        totalCOGS,
        `Inventory increase for return #${body.return_number}`,
        'SALE_RETURN',
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
        1, // Cash Account
        body.refund_amount,
        `Refund for return #${body.return_number}`,
        'SALE_RETURN',
        returnId,
        journalId
      ]
    );

    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, credit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        returnDate,
        8, // COGS Account
        totalCOGS,
        `COGS reversal for return #${body.return_number}`,
        'SALE_RETURN',
        returnId,
        journalId
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Sale return processed successfully with accounting entries", 
      sale_return: saleReturn,
      accounting: {
        journal_entry_id: journalId,
        total_cogs: totalCOGS
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error processing sale return:", error);
    return NextResponse.json({ error: "Error processing sale return: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}