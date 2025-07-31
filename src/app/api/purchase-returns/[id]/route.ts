import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/purchase-returns/[id] - Get specific purchase return
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch the specific purchase return by ID
    const res = await pool.query("SELECT * FROM purchase_returns WHERE id = $1", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Purchase return not found" }, { status: 404 });
    }
    const returnItemsRes = await pool.query("SELECT * FROM purchase_return_items WHERE purchase_return_id = $1", [id]);
    
    return NextResponse.json({ purchase_return: res.rows[0], items: returnItemsRes.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching purchase return: " + error }, { status: 500 });
  }
}

// PUT /api/purchase-returns/[id] - Update purchase return including items
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    await client.query('BEGIN');

    // Check if purchase return exists
    const returnCheck = await client.query("SELECT * FROM purchase_returns WHERE id = $1", [id]);
    if (returnCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Purchase return not found" }, { status: 404 });
    }

    const originalReturn = returnCheck.rows[0];

    // Validate required fields if updating financial data
    if (body.items && body.items.length > 0) {
      if (typeof body.subtotal !== "number" ||
          typeof body.tax_amount !== "number" ||
          typeof body.total_amount !== "number" || 
          typeof body.refund_received !== "number") {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Financial fields are required when updating items" }, { status: 400 });
      }
    }

    // If updating items, validate against original purchase
    if (body.items && body.items.length > 0) {
      // Verify original purchase exists
      const purchaseCheck = await client.query(
        'SELECT * FROM purchases WHERE id = $1',
        [originalReturn.original_purchase_id]
      );

      if (purchaseCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Original purchase not found" }, { status: 404 });
      }

      // Validate return items against original purchase items
      for (const item of body.items) {
        // Check if this item was in the original purchase
        const purchaseItemCheck = await client.query(
          'SELECT quantity, unit_price FROM purchase_items WHERE purchase_id = $1 AND product_id = $2',
          [originalReturn.original_purchase_id, item.product_id]
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
    }

    let updatedReturn = originalReturn;
    let totalCOGS = 0;

    // Update financial fields if provided
    if (body.subtotal !== undefined || 
        body.tax_amount !== undefined || 
        body.total_amount !== undefined || 
        body.refund_received !== undefined ||
        body.reason !== undefined) {
      
      const res = await client.query(
        `UPDATE purchase_returns SET 
          subtotal = COALESCE($1, subtotal),
          tax_amount = COALESCE($2, tax_amount),
          total_amount = COALESCE($3, total_amount),
          refund_received = COALESCE($4, refund_received),
          reason = COALESCE($5, reason),
          notes = COALESCE($6, notes),
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $7 RETURNING *`,
        [
          body.subtotal,
          body.tax_amount,
          body.total_amount,
          body.refund_received,
          body.reason,
          body.notes,
          id
        ]
      );
      
      updatedReturn = res.rows[0];
    }

    // Update items if provided
    if (body.items && body.items.length > 0) {
      // Get original return items to calculate inventory differences
      const originalItemsRes = await client.query(
        "SELECT product_id, quantity FROM purchase_return_items WHERE purchase_return_id = $1", 
        [id]
      );
      
      const originalItems = originalItemsRes.rows;
      
      // Create map of original quantities
      const originalQuantities: Record<number, number> = {};
      originalItems.forEach(item => {
        originalQuantities[item.product_id] = item.quantity;
      });

      // Delete original return items
      await client.query("DELETE FROM purchase_return_items WHERE purchase_return_id = $1", [id]);

      // Insert new return items and calculate COGS
      for (const item of body.items) {
        // Insert return item
        await client.query(
          "INSERT INTO purchase_return_items (purchase_return_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
          [id, item.product_id, item.quantity, item.unit_price, item.line_total]
        );
        
        // Calculate COGS for returned items
        const productResult = await client.query(
          'SELECT cost_price FROM products WHERE id = $1',
          [item.product_id]
        );
        
        const costPrice = productResult.rows[0].cost_price;
        const itemCOGS = item.quantity * costPrice;
        totalCOGS += itemCOGS;
      }

      // Adjust inventory based on quantity differences
      for (const item of body.items) {
        const originalQuantity = originalQuantities[item.product_id] || 0;
        const quantityDifference = item.quantity - originalQuantity;
        
        if (quantityDifference !== 0) {
          // Update product stock (negative difference increases stock, positive decreases)
          await client.query(
            "UPDATE products SET stock = stock - $1 WHERE id = $2", 
            [quantityDifference, item.product_id]
          );
        }
      }

      // Update associated journal entries
      const journalRes = await client.query(
        "SELECT journal_id FROM journal_entries WHERE reference_type = 'PURCHASE_RETURN' AND reference_id = $1",
        [id]
      );
      
      let journalId: number;
      
      if (journalRes.rows.length > 0) {
        journalId = journalRes.rows[0].journal_id;
        const returnDate = new Date(updatedReturn.return_date).toISOString().split('T')[0];
        
        // Update journal entry header
        await client.query(
          "UPDATE journal_entries SET entry_date = $1, description = $2 WHERE journal_id = $3",
          [returnDate, `Purchase Return #${updatedReturn.return_number}`, journalId]
        );
        
        // Delete existing journal entry lines
        await client.query("DELETE FROM journal_entry_lines WHERE journal_id = $1", [journalId]);
        
        // Delete existing general ledger entries
        await client.query("DELETE FROM general_ledger WHERE journal_entry_id = $1", [journalId]);
        
        // Create new journal entry lines with updated values
        
        // 1. Debit: Cash Account (Account ID: 1) - Receive refund money
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_id, account_id, debit_amount, description
          ) VALUES ($1, $2, $3, $4)`,
          [
            journalId,
            1, // Cash Account ID
            updatedReturn.refund_received,
            `Refund received for purchase return #${updatedReturn.return_number}`
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
            `Inventory decrease for purchase return #${updatedReturn.return_number}`
          ]
        );

        // 3. Debit: Cost of Goods Sold Account (Account ID: 8) - Increase COGS
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_id, account_id, debit_amount, description
          ) VALUES ($1, $2, $3, $4)`,
          [
            journalId,
            8, // COGS Account ID
            totalCOGS,
            `COGS increase for purchase return #${updatedReturn.return_number}`
          ]
        );

        // 4. Credit: Accounts Payable Account (Account ID: 5) - Reduce amount owed
        if (updatedReturn.total_amount > 0) {
          await client.query(
            `INSERT INTO journal_entry_lines (
              journal_id, account_id, credit_amount, description
            ) VALUES ($1, $2, $3, $4)`,
            [
              journalId,
              5, // Accounts Payable Account ID
              updatedReturn.total_amount,
              `Reduction in amount owed for purchase return #${updatedReturn.return_number}`
            ]
          );
        }

        // Post updated entries to General Ledger
        // Debit entries
        await client.query(
          `INSERT INTO general_ledger (
            transaction_date, account_id, debit_amount, description, 
            reference_type, reference_id, journal_entry_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            returnDate,
            1, // Cash Account
            updatedReturn.refund_received,
            `Refund received for purchase return #${updatedReturn.return_number}`,
            'PURCHASE_RETURN',
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
            returnDate,
            8, // COGS Account
            totalCOGS,
            `COGS increase for purchase return #${updatedReturn.return_number}`,
            'PURCHASE_RETURN',
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
            returnDate,
            2, // Inventory Account
            totalCOGS,
            `Inventory decrease for purchase return #${updatedReturn.return_number}`,
            'PURCHASE_RETURN',
            id,
            journalId
          ]
        );

        if (updatedReturn.total_amount > 0) {
          await client.query(
            `INSERT INTO general_ledger (
              transaction_date, account_id, credit_amount, description, 
              reference_type, reference_id, journal_entry_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              returnDate,
              5, // Accounts Payable Account
              updatedReturn.total_amount,
              `Reduction in amount owed for purchase return #${updatedReturn.return_number}`,
              'PURCHASE_RETURN',
              id,
              journalId
            ]
          );
        }
      }
    } else {
      // Just update notes/reason without changing items
      await client.query(
        "UPDATE purchase_returns SET notes = COALESCE($1, notes), reason = COALESCE($2, reason), updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [body.notes, body.reason, id]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Purchase return updated successfully", 
      purchase_return: updatedReturn,
      accounting: totalCOGS > 0 ? {
        total_cogs: totalCOGS
      } : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating purchase return:", error);
    return NextResponse.json({ error: "Error updating purchase return: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/purchase-returns/[id] - Delete purchase return
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    
    await client.query('BEGIN');

    // Check if purchase return exists
    const returnCheck = await client.query("SELECT * FROM purchase_returns WHERE id = $1", [id]);
    if (returnCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Purchase return not found" }, { status: 404 });
    }

    // Get return items to reverse inventory changes
    const returnItemsRes = await client.query(
      "SELECT product_id, quantity FROM purchase_return_items WHERE purchase_return_id = $1", 
      [id]
    );
    
    const returnItems = returnItemsRes.rows;

    // Reverse inventory changes (increase stock)
    for (const item of returnItems) {
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Delete associated journal entries
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'PURCHASE_RETURN' AND reference_id = $1",
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

    // Delete return items
    await client.query("DELETE FROM purchase_return_items WHERE purchase_return_id = $1", [id]);

    // Delete the purchase return
    await client.query("DELETE FROM purchase_returns WHERE id = $1", [id]);

    await client.query('COMMIT');

    return NextResponse.json({ message: "Purchase return deleted successfully and inventory adjusted" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting purchase return:", error);
    return NextResponse.json({ error: "Error deleting purchase return: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}