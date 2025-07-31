import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/purchases/[id] - Get specific purchase
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch the specific purchase by ID
    const res = await pool.query("SELECT * FROM purchases WHERE id = $1", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }   
    
    const purchaseItemsRes = await pool.query("SELECT * FROM purchase_items WHERE purchase_id = $1", [id]);
    return NextResponse.json({ purchase: res.rows[0], items: purchaseItemsRes.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching purchase: " + error }, { status: 500 });
  }
}

// PUT /api/purchases/[id] - Update purchase
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const body = await request.json();
    console.log(body);
    
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

    // Check if purchase exists
    const purchaseCheck = await client.query("SELECT * FROM purchases WHERE id = $1", [id]);
    if (purchaseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Check if invoice number already exists (excluding current purchase)
    const invoiceCheck = await client.query(
      'SELECT id FROM purchases WHERE invoice_number = $1 AND id != $2',
      [body.invoice_number, id]
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

    // Get original purchase items to calculate inventory differences
    const originalItemsRes = await client.query(
      "SELECT product_id, quantity FROM purchase_items WHERE purchase_id = $1", 
      [id]
    );
    
    const originalItems = originalItemsRes.rows;
    
    // Create map of original quantities
    const originalQuantities: Record<number, number> = {};
    originalItems.forEach(item => {
      originalQuantities[item.product_id] = item.quantity;
    });

    // Update purchase record
    const res = await client.query(
      "UPDATE purchases SET invoice_number = $1, vendor_id = $2, subtotal = $3, tax_amount = $4, total_amount = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *", 
      [body.invoice_number, body.vendor_id, body.subtotal, body.tax_amount, body.total_amount, id]
    );
    
    const updatedPurchase = res.rows[0];
    const purchase_date = new Date(updatedPurchase.purchase_date).toISOString().split('T')[0];

    // Delete original purchase items
    await client.query("DELETE FROM purchase_items WHERE purchase_id = $1", [id]);

    // Insert new purchase items and update inventory
    let totalInventoryCost = 0;
    
    for (const item of body.items) {
      // Insert purchase item
      await client.query(
        "INSERT INTO purchase_items (product_id, purchase_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
        [item.id, id, item.quantity, item.unit_price, item.line_total]
      );
      
      const itemCost = item.quantity * item.unit_price;
      totalInventoryCost += itemCost;

      // Update product stock (adjust based on original quantity)
      const originalQuantity = originalQuantities[item.id] || 0;
      const quantityDifference = item.quantity - originalQuantity;
      
      if (quantityDifference !== 0) {
        await client.query(
          "UPDATE products SET stock = stock + $1, cost_price = $2 WHERE id = $3", 
          [quantityDifference, item.unit_price, item.id]
        );
      }
    }

    // Get existing journal entry
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'PURCHASE' AND reference_id = $1",
      [id]
    );
    
    let journalId: number;
    
    if (journalRes.rows.length > 0) {
      // Update existing journal entry
      journalId = journalRes.rows[0].journal_id;
      
      // Update journal entry header
      await client.query(
        "UPDATE journal_entries SET entry_date = $1, description = $2 WHERE journal_id = $3",
        [purchase_date, `Purchase #${body.invoice_number}`, journalId]
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
          purchase_date,
          `Purchase #${body.invoice_number}`,
          'PURCHASE',
          id
        ]
      );
      journalId = newJournalRes.rows[0].journal_id;
    }

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

    // 2. Debit: Tax Asset Account (Account ID: 99) - Tax paid (if recoverable)
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
        id,
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
          id,
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
        id,
        journalId
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Purchase updated successfully with accounting entries", 
      purchase: updatedPurchase,
      accounting: {
        journal_entry_id: journalId,
        total_inventory_cost: totalInventoryCost
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating purchase:", error);
    return NextResponse.json({ error: "Error updating purchase: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/purchases/[id] - Delete purchase
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    
    await client.query('BEGIN');

    // Check if purchase exists
    const purchaseCheck = await client.query("SELECT * FROM purchases WHERE id = $1", [id]);
    if (purchaseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Get purchase items to reverse inventory changes
    const purchaseItemsRes = await client.query(
      "SELECT product_id, quantity FROM purchase_items WHERE purchase_id = $1", 
      [id]
    );
    
    const purchaseItems = purchaseItemsRes.rows;

    // Reverse inventory changes (decrease stock)
    for (const item of purchaseItems) {
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Delete associated journal entries
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'PURCHASE' AND reference_id = $1",
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

    // Delete purchase items
    await client.query("DELETE FROM purchase_items WHERE purchase_id = $1", [id]);

    // Delete the purchase
    await client.query("DELETE FROM purchases WHERE id = $1", [id]);

    await client.query('COMMIT');

    return NextResponse.json({ message: "Purchase deleted successfully and inventory adjusted" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting purchase:", error);
    return NextResponse.json({ error: "Error deleting purchase: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}