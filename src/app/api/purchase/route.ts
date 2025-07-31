import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM purchases ORDER BY id ASC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching purchases: " + error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body || 
        typeof body.vendor_id !== "number" || 
        typeof body.invoice_number !== "string" ||
        typeof body.subtotal !== "number" ||
        typeof body.total_amount !== "number" ||
        typeof body.items !== "object") {
      return NextResponse.json({ error: "Invalid purchase details" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Check if invoice number already exists
    const invoiceCheck = await client.query(
      'SELECT id FROM purchases WHERE invoice_number = $1',
      [body.invoice_number]
    );

    if (invoiceCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
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
    const amountPaid = body.total_amount;
    // Insert purchase record
    const res = await client.query(
      "INSERT INTO purchases (invoice_number, vendor_id, subtotal, tax_amount, total_amount,amount_paid) VALUES ($1, $2, $3, $4, $5,$6) RETURNING *", 
      [body.invoice_number, body.vendor_id, body.subtotal, body.tax_amount, body.total_amount,amountPaid]
    );
    
    const purchase = res.rows[0];
    const purchase_id = purchase.id;
    const purchase_date = new Date(purchase.purchase_date).toISOString().split('T')[0];

    // Insert purchase items and update inventory
    let totalInventoryCost = 0;
    for (const item of body.items) {
      const line_total = item.stock * item.cost_price;
      // Insert purchase item
      await client.query(
        "INSERT INTO purchase_items (product_id, purchase_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
        [item.id, purchase_id, item.stock, item.cost_price, line_total]
      );
      
      const itemCost = item.stock * item.cost_price;
      totalInventoryCost += itemCost;

      // Update product stock and cost price
      await client.query(
        "UPDATE products SET stock = stock + $1, cost_price = $2 WHERE id = $3", 
        [item.stock, item.cost_price, item.id]
      );
    }

    // Create journal entry for the purchase
    const journalRes = await client.query(
      `INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING journal_id`,
      [
        purchase_date,
        `Purchase #${body.invoice_number}`,
        'PURCHASE',
        purchase_id
      ]
    );

    const journalId = journalRes.rows[0].journal_id;

    // Create journal entry lines (Double-entry accounting)
    
    // 1. Debit: Inventory Account (Account ID: 4) - Increase inventory
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, debit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        4, // Inventory Account ID
        totalInventoryCost,
        `Inventory purchase #${body.invoice_number}`
      ]
    );

    // 2. Debit: Tax Asset Account (Account ID:99 ) - Tax paid (if recoverable)
    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO journal_entry_lines (
          journal_id, account_id, debit_amount, description
        ) VALUES ($1, $2, $3, $4)`,
        [
          journalId,
          99, // Tax Asset Account ID
          body.tax_amount,
          `Tax paid on purchase #${body.invoice_number}`
        ]
      );
    }

    // 3. Credit: Accounts Payable Account (Account ID: 5) - Money owed to vendor
    await client.query(
      `INSERT INTO journal_entry_lines (
        journal_id, account_id, credit_amount, description
      ) VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        5, // Accounts Payable Account ID
        body.total_amount,
        `Amount owed to vendor for purchase #${body.invoice_number}`
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
        purchase_date,
        4, // Inventory Account
        totalInventoryCost,
        `Inventory purchase #${body.invoice_number}`,
        'PURCHASE',
        purchase_id,
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
          purchase_date,
          99, // Tax Asset Account
          body.tax_amount,
          `Tax paid on purchase #${body.invoice_number}`,
          'PURCHASE',
          purchase_id,
          journalId
        ]
      );
    }

    // Credit entry
    await client.query(
      `INSERT INTO general_ledger (
        transaction_date, account_id, credit_amount, description, 
        reference_type, reference_id, journal_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        purchase_date,
        5, // Accounts Payable Account
        body.total_amount,
        `Amount owed to vendor for purchase #${body.invoice_number}`,
        'PURCHASE',
        purchase_id,
        journalId
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Purchase added successfully with accounting entries", 
      purchase: purchase,
      accounting: {
        journal_entry_id: journalId,
        total_inventory_cost: totalInventoryCost
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding purchase:", error);
    return NextResponse.json({ error: "Error adding purchase: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}