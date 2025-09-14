import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/sales/[id] - Fetch a specific sale by ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch the specific sale by ID
    const res = await pool.query("SELECT * FROM sales WHERE id = $1", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    const saleItemsRes = await pool.query("SELECT * FROM sales_items WHERE sale_id = $1", [id]);
    return NextResponse.json({ sale: res.rows[0], items: saleItemsRes.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching sale: " + error }, { status: 500 });
  }
}

// PUT /api/sales/[id] - Update a sale
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body || 
        typeof body.customer_id !== "number" || 
        typeof body.invoice_number !== "string" || 
        typeof body.subtotal !== "number" ||
        typeof body.discount !== "number" || 
        typeof body.tax_amount !== "number" ||
        typeof body.total_amount !== "number" || 
        typeof body.amount_paid !== "number" ||
        typeof body.sale_date !== "string" ||
        !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid sale details" }, { status: 400 });
    }

    // Validate that amount_paid equals total_amount (cash-only system)
    if (body.amount_paid !== body.total_amount) {
      return NextResponse.json({ error: "Amount paid must equal total amount in cash-only system" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Check if sale exists
    const saleCheck = await client.query("SELECT * FROM sales WHERE id = $1", [id]);
    if (saleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Check if invoice number already exists (excluding current sale)
    const invoiceCheck = await client.query(
      'SELECT id FROM sales WHERE invoice_number = $1 AND id != $2',
      [body.invoice_number, id]
    );

    if (invoiceCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
    }

    // Validate product stock availability (considering original quantities)
    const originalItemsRes = await client.query(
      "SELECT product_id, quantity FROM sales_items WHERE sale_id = $1", 
      [id]
    );
    
    const originalItems = originalItemsRes.rows;
    
    // Create map of original quantities
    const originalQuantities: Record<number, number> = {};
    originalItems.forEach(item => {
      originalQuantities[item.product_id] = item.quantity;
    });

    // Validate new items stock
    for (const item of body.items) {
      const productCheck = await client.query(
        'SELECT stock, name FROM products WHERE id = $1',
        [item.id]
      );

      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `Product with ID ${item.id} not found` }, { status: 400 });
      }

      const product = productCheck.rows[0];
      const originalQuantity = originalQuantities[item.id] || 0;
      const quantityDifference = item.quantity - originalQuantity;
      
      // Check if we have enough stock for the difference
      if (product.stock < quantityDifference) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: `Insufficient stock for product: ${product.name}. Need ${quantityDifference} more units.` 
        }, { status: 400 });
      }
    }

    // Update sale record
    const res = await client.query(
      "UPDATE sales SET invoice_number = $1, customer_id = $2, subtotal = $3, discount = $4, tax_amount = $5, total_amount = $6, amount_paid = $7, sale_date = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *", 
      [body.invoice_number, body.customer_id, body.subtotal, body.discount, body.tax_amount, body.total_amount, body.amount_paid, body.sale_date, id]
    );
    
    const updatedSale = res.rows[0];
    const sale_date = new Date(updatedSale.sale_date).toISOString().split('T')[0];

    // Delete original sale items
    await client.query("DELETE FROM sales_items WHERE sale_id = $1", [id]);

    // Insert new sale items, update inventory, and calculate COGS
    let totalCOGS = 0;
    
    for (const item of body.items) {
      // Insert sale item
      await client.query(
        "INSERT INTO sales_items (product_id, sale_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
        [item.id, id, item.quantity, item.sale_price, item.line_total]
      );
      
      // Calculate COGS for this item
      const productResult = await client.query(
        'SELECT cost_price FROM products WHERE id = $1',
        [item.id]
      );
      
      const costPrice = productResult.rows[0].cost_price;
      const itemCOGS = item.quantity * costPrice;
      totalCOGS += itemCOGS;

      // Update product stock (adjust based on original quantity)
      const originalQuantity = originalQuantities[item.id] || 0;
      const quantityDifference = item.quantity - originalQuantity;
      
      if (quantityDifference !== 0) {
        await client.query(
          "UPDATE products SET stock = stock - $1 WHERE id = $2", 
          [quantityDifference, item.id]
        );
      }
    }

    // Handle removed products (items that existed before but are not in the new list)
    const newItemIds = new Set(body.items.map((i: any) => i.id));
    for (const productId in originalQuantities) {
      const pid = parseInt(productId);
      if (!newItemIds.has(pid)) {
        const oldQty = originalQuantities[pid];
        // Add back stock for removed sale item
        await client.query(
          "UPDATE products SET stock = stock + $1 WHERE id = $2",
          [oldQty, pid]
        );
      }
    }

    // Get existing journal entry
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'SALE' AND reference_id = $1",
      [id]
    );
    
    let journalId: number;
    
    if (journalRes.rows.length > 0) {
      // Update existing journal entry
      journalId = journalRes.rows[0].journal_id;
      
      // Update journal entry header
      await client.query(
        "UPDATE journal_entries SET entry_date = $1, description = $2 WHERE journal_id = $3",
        [sale_date, `Cash Sale #${body.invoice_number}`, journalId]
      );
      
      // Delete existing journal entry lines
      await client.query("DELETE FROM journal_entry_lines WHERE journal_id = $1", [journalId]);
      
      // Delete existing general ledger entries
      await client.query("DELETE FROM general_ledger WHERE journal_entry_id = $1", [journalId]);
    } else {
      // Create new journal entry
      const newJournalRes = await client.query(
        `INSERT INTO journal_entries (
          entry_date, description, reference_type, reference_id
        ) VALUES ($1, $2, $3, $4)
        RETURNING journal_id`,
        [
          sale_date,
          `Cash Sale #${body.invoice_number}`,
          'SALE',
          id
        ]
      );
      journalId = newJournalRes.rows[0].journal_id;
    }

    // Create journal entry lines (Double-entry accounting)
    
    // 1. Debit: Cash Account (Account ID: 1) - Money received
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        1, // Cash Account ID
        body.total_amount,
        `Cash received from sale #${body.invoice_number}`
      ]
    );

    // 2. Credit: Sales Revenue Account (Account ID: 8) - Income earned
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, credit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        8, // Sales Revenue Account ID
        body.subtotal,
        `Sales revenue from sale #${body.invoice_number}`
      ]
    );

    // 3. Credit: Tax Payable Account (Account ID: 6) - Taxes collected (if applicable)
    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO journal_entry_lines (
          journal_id, account_id, credit_amount, description
        ) VALUES ($1, $2, $3, $4)`,
        [
          journalId,
          6, // Tax Payable Account ID
          body.tax_amount,
          `Tax collected from sale #${body.invoice_number}`
        ]
      );
    }

    // 4. Debit: Cost of Goods Sold Account (Account ID: 10) - Expenses
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        10, // COGS Account ID
        totalCOGS,
        `Cost of goods sold for sale #${body.invoice_number}`
      ]
    );

    // 5. Credit: Inventory Account (Account ID: 4) - Inventory reduction
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, credit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        4, // Inventory Account ID
        totalCOGS,
        `Inventory reduction for sale #${body.invoice_number}`
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
        sale_date,
        1, // Cash Account
        body.total_amount,
        `Cash received from sale #${body.invoice_number}`,
        'SALE',
        id,
        journalId
      ]
    );

    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, debit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sale_date,
        10, // COGS Account
        totalCOGS,
        `Cost of goods sold for sale #${body.invoice_number}`,
        'SALE',
        id,
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
        sale_date,
        8, // Sales Revenue Account
        body.subtotal,
        `Sales revenue from sale #${body.invoice_number}`,
        'SALE',
        id,
        journalId
      ]
    );

    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO general_ledger (
          transaction_date, account_id, credit_amount, description, 
          reference_type, reference_id, journal_entry_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sale_date,
          6, // Tax Payable Account
          body.tax_amount,
          `Tax collected from sale #${body.invoice_number}`,
          'SALE',
          id,
          journalId
        ]
      );
    }

    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, credit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sale_date,
        4, // Inventory Account
        totalCOGS,
        `Inventory reduction for sale #${body.invoice_number}`,
        'SALE',
        id,
        journalId
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Sale updated successfully with accounting entries", 
      sale: updatedSale,
      accounting: {
        journal_entry_id: journalId,
        total_cogs: totalCOGS
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating sale:", error);
    return NextResponse.json({ error: "Error updating sale: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/sales/[id] - Delete a sale
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    
    await client.query('BEGIN');

    // Check if sale exists
    const saleCheck = await client.query("SELECT * FROM sales WHERE id = $1", [id]);
    if (saleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Get sale items to restore inventory
    const saleItemsRes = await client.query(
      "SELECT product_id, quantity FROM sales_items WHERE sale_id = $1", 
      [id]
    );
    
    const saleItems = saleItemsRes.rows;

    // Restore inventory (add back the quantities)
    for (const item of saleItems) {
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Delete associated journal entries
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'SALE' AND reference_id = $1",
      [id]
    );
    
    if (journalRes.rows.length > 0) {
      const journalId = journalRes.rows[0].journal_id;
      
      // Delete journal entry lines
      await client.query("DELETE FROM journal_entry_lines WHERE journal_id = $1", [journalId]);
      
      // Delete from general ledger
      await client.query("DELETE FROM general_ledger WHERE journal_entry_id = $1", [journalId]);
      
      // Delete journal entry
      await client.query("DELETE FROM journal_entries WHERE journal_id = $1", [journalId]);
    }

    // Delete sale items
    await client.query("DELETE FROM sales_items WHERE sale_id = $1", [id]);

    // Delete the sale
    await client.query("DELETE FROM sales WHERE id = $1", [id]);

    await client.query('COMMIT');

    return NextResponse.json({ message: "Sale deleted successfully and inventory restored" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting sale:", error);
    return NextResponse.json({ error: "Error deleting sale: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}