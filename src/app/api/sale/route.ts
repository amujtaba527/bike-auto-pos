import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    // Fetch all sales
    const res = await pool.query("SELECT * FROM sales ORDER BY sale_date DESC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching sales" + error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body || 
        typeof body.customer_id !== "number" || 
        typeof body.subtotal !== "number" || 
        typeof body.invoice_number !== "string" || 
        typeof body.total_amount !== "number" || 
        typeof body.items !== "object") {
      return NextResponse.json({ error: "Invalid sale details" }, { status: 400 });
    }
    const amountPaid = body.total_amount;

    await client.query('BEGIN');

    // Check if invoice number already exists
    const invoiceCheck = await client.query(
      'SELECT id FROM sales WHERE invoice_number = $1',
      [body.invoice_number]
    );

    if (invoiceCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
    }

    // Validate product stock availability
    for (const item of body.items) {
      const productCheck = await client.query(
        'SELECT stock, name FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `Product with ID ${item.product_id} not found` }, { status: 400 });
      }

      const product = productCheck.rows[0];
      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `Insufficient stock for product: ${product.name}` }, { status: 400 });
      }
    }

    let sale_date;
    if(!body.sale_date){
      sale_date = new Date().toISOString().split('T')[0];
    }else{
      sale_date = body.sale_date;
    }

    // Insert sale record
    const res = await client.query(
      "INSERT INTO sales (invoice_number, customer_id, subtotal, discount, tax_amount, total_amount, amount_paid, sale_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", 
      [body.invoice_number, body.customer_id, body.subtotal, body.discount, body.tax_amount, body.total_amount, amountPaid, sale_date]
    );
    
    const sale = res.rows[0];
    const sale_id = sale.id;

    // Insert sale items, update inventory, and calculate COGS
    let totalCOGS = 0;
    
    for (const item of body.items) {
      const lineTotal = item.quantity * item.price;

      // Calculate COGS for this item
      const productResult = await client.query(
        'SELECT cost_price FROM products WHERE id = $1',
        [item.product_id]
      );

      // Insert sale item
      await client.query(
        "INSERT INTO sales_items (product_id, sale_id, quantity, unit_price, line_total, cost_price) VALUES ($1, $2, $3, $4, $5, $6)", 
        [item.product_id, sale_id, item.quantity, item.price, lineTotal, productResult.rows[0].cost_price]
      );
    
      const costPrice = productResult.rows[0].cost_price;
      const itemCOGS = item.quantity * costPrice;
      totalCOGS += itemCOGS;

      // Update product stock
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Create journal entry for the sale
    const journalRes = await client.query(
      `INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING journal_id`,
      [
        sale_date,
        `Cash Sale #${body.invoice_number}`,
        'SALE',
        sale_id
      ]
    );

    const journalId = journalRes.rows[0].journal_id;

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
        sale_id,
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
        sale_id,
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
        sale_id,
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
          4, // Tax Payable Account
          body.tax_amount,
          `Tax collected from sale #${body.invoice_number}`,
          'SALE',
          sale_id,
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
        sale_id,
        journalId
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Sale added successfully with accounting entries", 
      sale: sale,
      accounting: {
        journal_entry_id: journalId,
        total_cogs: totalCOGS
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding sale:", error);
    return NextResponse.json({ error: "Error adding sale: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}