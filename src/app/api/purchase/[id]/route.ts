// PUT /api/purchases/[id] - Update purchase
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

interface PurchaseItem {
  id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
}

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const body = await request.json();
    const items = body.items as PurchaseItem[];

    if (!body || 
        typeof body.vendor_id !== "number" || 
        typeof body.invoice_number !== "string" ||
        typeof body.subtotal !== "number" ||
        typeof body.total_amount !== "number" ||
        !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid purchase details" }, { status: 400 });
    }

    await client.query('BEGIN');

    // Check if purchase exists
    const purchaseCheck = await client.query("SELECT * FROM purchases WHERE id = $1", [id]);
    if (purchaseCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Check invoice number uniqueness
    const invoiceCheck = await client.query(
      'SELECT id FROM purchases WHERE invoice_number = $1 AND id != $2',
      [body.invoice_number, id]
    );
    if (invoiceCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
    }

    // Verify vendor exists
    const vendorCheck = await client.query('SELECT id FROM vendors WHERE id = $1', [body.vendor_id]);
    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Get original purchase items
    const originalItemsRes = await client.query(
      "SELECT product_id, quantity FROM purchase_items WHERE purchase_id = $1", 
      [id]
    );
    const originalItems = originalItemsRes.rows;

    // Build map of original quantities
    const originalQuantities: Record<number, number> = {};
    originalItems.forEach(item => {
      originalQuantities[item.product_id] = item.quantity;
    });

    // Update purchase record
    const res = await client.query(
      "UPDATE purchases SET invoice_number = $1, vendor_id = $2, subtotal = $3, tax_amount = $4, total_amount = $5, purchase_date = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *", 
      [body.invoice_number, body.vendor_id, body.subtotal, body.tax_amount, body.total_amount, body.purchase_date, id]
    );
    
    const updatedPurchase = res.rows[0];
    const purchase_date = new Date(updatedPurchase.purchase_date).toISOString().split('T')[0];

    // Build new items map
    const newQuantities: Record<number, { quantity: number, unit_price: number, line_total: number }> = {};
    items.forEach(item=> {
      newQuantities[item.id] = {
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      };
    });

    let totalInventoryCost = 0;

    // 1. Handle updates + new items
    for (const productId in newQuantities) {
      const pid = parseInt(productId);
      const newItem = newQuantities[pid];
      const oldQty = originalQuantities[pid] || 0;
      const qtyDiff = newItem.quantity - oldQty;

      if (oldQty > 0) {
        // Update existing purchase item
        await client.query(
          `UPDATE purchase_items 
           SET quantity = $1, unit_price = $2, line_total = $3, updated_at = CURRENT_TIMESTAMP
           WHERE purchase_id = $4 AND product_id = $5`,
          [newItem.quantity, newItem.unit_price, newItem.line_total, id, pid]
        );
      } else {
        // Insert new purchase item
        await client.query(
          `INSERT INTO purchase_items (product_id, purchase_id, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [pid, id, newItem.quantity, newItem.unit_price, newItem.line_total]
        );
      }

      // Adjust stock
      if (qtyDiff !== 0) {
        await client.query(
          "UPDATE products SET stock = stock + $1, cost_price = $2 WHERE id = $3",
          [qtyDiff, newItem.unit_price, pid]
        );
      }

      totalInventoryCost += newItem.quantity * newItem.unit_price;
    }

    // 2. Handle removed products
    for (const productId in originalQuantities) {
      const pid = parseInt(productId);
      if (!newQuantities[pid]) {
        const oldQty = originalQuantities[pid];
        // Delete purchase item
        await client.query(
          "DELETE FROM purchase_items WHERE purchase_id = $1 AND product_id = $2",
          [id, pid]
        );
        // Reduce stock
        await client.query(
          "UPDATE products SET stock = stock - $1 WHERE id = $2",
          [oldQty, pid]
        );
      }
    }

    // ⚖️ Rebuild accounting entries (same as your code)
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'PURCHASE' AND reference_id = $1",
      [id]
    );

    let journalId: number;
    if (journalRes.rows.length > 0) {
      journalId = journalRes.rows[0].journal_id;
      await client.query(
        "UPDATE journal_entries SET entry_date = $1, description = $2 WHERE journal_id = $3",
        [purchase_date, `Purchase #${body.invoice_number}`, journalId]
      );
      await client.query("DELETE FROM journal_entry_lines WHERE journal_id = $1", [journalId]);
      await client.query("DELETE FROM general_ledger WHERE journal_entry_id = $1", [journalId]);
    } else {
      const newJournalRes = await client.query(
        `INSERT INTO journal_entries (entry_date, description, reference_type, reference_id)
         VALUES ($1, $2, $3, $4) RETURNING journal_id`,
        [purchase_date, `Purchase #${body.invoice_number}`, 'PURCHASE', id]
      );
      journalId = newJournalRes.rows[0].journal_id;
    }

    // Insert accounting entries
    await client.query(
      `INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
       VALUES ($1, $2, $3, $4)`,
      [journalId, 4, totalInventoryCost, `Inventory purchase #${body.invoice_number}`]
    );

    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO journal_entry_lines (journal_id, account_id, debit_amount, description)
         VALUES ($1, $2, $3, $4)`,
        [journalId, 99, body.tax_amount, `Tax paid on purchase #${body.invoice_number}`]
      );
    }

    await client.query(
      `INSERT INTO journal_entry_lines (journal_id, account_id, credit_amount, description)
       VALUES ($1, $2, $3, $4)`,
      [journalId, 5, body.total_amount, `Amount owed to vendor for purchase #${body.invoice_number}`]
    );

    // Mirror to general_ledger
    await client.query(
      `INSERT INTO general_ledger (transaction_date, account_id, debit_amount, description, reference_type, reference_id, journal_entry_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [purchase_date, 4, totalInventoryCost, `Inventory purchase #${body.invoice_number}`, 'PURCHASE', id, journalId]
    );

    if (body.tax_amount > 0) {
      await client.query(
        `INSERT INTO general_ledger (transaction_date, account_id, debit_amount, description, reference_type, reference_id, journal_entry_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [purchase_date, 99, body.tax_amount, `Tax paid on purchase #${body.invoice_number}`, 'PURCHASE', id, journalId]
      );
    }

    await client.query(
      `INSERT INTO general_ledger (transaction_date, account_id, credit_amount, description, reference_type, reference_id, journal_entry_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [purchase_date, 5, body.total_amount, `Amount owed to vendor for purchase #${body.invoice_number}`, 'PURCHASE', id, journalId]
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
