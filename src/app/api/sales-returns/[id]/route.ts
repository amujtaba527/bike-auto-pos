import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/sales-returns/[id] - Get specific sale return
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch the specific sale return by ID
    const res = await pool.query("SELECT * FROM sale_returns WHERE id = $1", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Sale return not found" }, { status: 404 });
    }
    const returnItemsRes = await pool.query("SELECT * FROM sale_return_items WHERE sale_return_id = $1", [id]);
    return NextResponse.json({ sale_return: res.rows[0], items: returnItemsRes.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching sale return: " + error }, { status: 500 });
  }
}

// PUT /api/sales-returns/[id] - Update sale return including items
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    await client.query('BEGIN');

    // Check if sale return exists
    const returnCheck = await client.query("SELECT * FROM sale_returns WHERE id = $1", [id]);
    if (returnCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Sale return not found" }, { status: 404 });
    }

    const originalReturn = returnCheck.rows[0];

    // Validate required fields if updating financial data
    if (body.items && body.items.length > 0) {
      if (typeof body.subtotal !== "number" ||
          typeof body.tax_amount !== "number" ||
          typeof body.total_amount !== "number" || 
          typeof body.refund_amount !== "number") {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Financial fields are required when updating items" }, { status: 400 });
      }
    }

    // If updating items, validate against original sale
    if (body.items && body.items.length > 0) {
      // Verify original sale exists
      const saleCheck = await client.query(
        'SELECT * FROM sales WHERE id = $1',
        [originalReturn.original_sale_id]
      );

      if (saleCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Original sale not found" }, { status: 404 });
      }

      // Validate return items against original sale items
      for (const item of body.items) {
        // Check if this item was in the original sale
        const saleItemCheck = await client.query(
          'SELECT quantity, unit_price FROM sales_items WHERE sale_id = $1 AND product_id = $2',
          [originalReturn.original_sale_id, item.product_id]
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
    }

    let updatedReturn = originalReturn;
    let totalCOGS = 0;

    // Update financial fields if provided
    if (body.subtotal !== undefined || 
        body.tax_amount !== undefined || 
        body.total_amount !== undefined || 
        body.refund_amount !== undefined ||
        body.reason !== undefined) {
      
      const res = await client.query(
        `UPDATE sale_returns SET 
          subtotal = COALESCE($1, subtotal),
          tax_amount = COALESCE($2, tax_amount),
          total_amount = COALESCE($3, total_amount),
          refund_amount = COALESCE($4, refund_amount),
          reason = COALESCE($5, reason),
          notes = COALESCE($6, notes),
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $7 RETURNING *`,
        [
          body.subtotal,
          body.tax_amount,
          body.total_amount,
          body.refund_amount,
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
        "SELECT product_id, quantity FROM sale_return_items WHERE sale_return_id = $1", 
        [id]
      );
      
      const originalItems = originalItemsRes.rows;
      
      // Create map of original quantities
      const originalQuantities: Record<number, number> = {};
      originalItems.forEach(item => {
        originalQuantities[item.product_id] = item.quantity;
      });

      // Delete original return items
      await client.query("DELETE FROM sale_return_items WHERE sale_return_id = $1", [id]);

      // Insert new return items and calculate COGS
      for (const item of body.items) {
        // Insert return item
        await client.query(
          "INSERT INTO sale_return_items (sale_return_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)", 
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
          // Update product stock
          await client.query(
            "UPDATE products SET stock = stock + $1 WHERE id = $2", 
            [quantityDifference, item.product_id]
          );
        }
      }

      // Update associated journal entries
      const journalRes = await client.query(
        "SELECT journal_id FROM journal_entries WHERE reference_type = 'SALE_RETURN' AND reference_id = $1",
        [id]
      );
      
      let journalId: number;
      
      if (journalRes.rows.length > 0) {
        journalId = journalRes.rows[0].journal_id;
        const returnDate = new Date(updatedReturn.return_date).toISOString().split('T')[0];
        
        // Update journal entry header
        await client.query(
          "UPDATE journal_entries SET entry_date = $1, description = $2 WHERE journal_id = $3",
          [returnDate, `Sale Return #${updatedReturn.return_number}`, journalId]
        );
        
        // Delete existing journal entry lines
        await client.query("DELETE FROM journal_entry_lines WHERE journal_id = $1", [journalId]);
        
        // Delete existing general ledger entries
        await client.query("DELETE FROM general_ledger WHERE journal_entry_id = $1", [journalId]);
        
        // Create new journal entry lines with updated values
        
        // 1. Debit: Sales Revenue Account (Account ID: 7) - Reverse revenue
        await client.query(
          `INSERT INTO journal_entry_lines (
            journal_id, account_id, debit_amount, description
          ) VALUES ($1, $2, $3, $4)`,
          [
            journalId,
            7, // Sales Revenue Account ID
            updatedReturn.subtotal,
            `Sales return #${updatedReturn.return_number} - Revenue reversal`
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
            updatedReturn.refund_amount,
            `Refund for return #${updatedReturn.return_number}`
          ]
        );

        // 3. Debit: Tax Payable Account (Account ID: 4) - Reverse collected tax (if applicable)
        if (updatedReturn.tax_amount > 0) {
          await client.query(
            `INSERT INTO journal_entry_lines (
              journal_id, account_id, debit_amount, description
            ) VALUES ($1, $2, $3, $4)`,
            [
              journalId,
              4, // Tax Payable Account ID
              updatedReturn.tax_amount,
              `Tax refund for return #${updatedReturn.return_number}`
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
            `COGS reversal for return #${updatedReturn.return_number}`
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
            `Inventory increase for return #${updatedReturn.return_number}`
          ]
        );

        // Post updated entries to General Ledger
        // Debit entries
        await client.query(
          `INSERT INTO general_ledger (
            transaction_date, account_id, debit_amount, description, 
            reference_type, reference_id, journal_entry_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            returnDate,
            7, // Sales Revenue Account
            updatedReturn.subtotal,
            `Sales return #${updatedReturn.return_number} - Revenue reversal`,
            'SALE_RETURN',
            id,
            journalId
          ]
        );

        if (updatedReturn.tax_amount > 0) {
          await client.query(
            `INSERT INTO general_ledger (
              transaction_date, account_id, debit_amount, description, 
              reference_type, reference_id, journal_entry_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              returnDate,
              4, // Tax Payable Account
              updatedReturn.tax_amount,
              `Tax refund for return #${updatedReturn.return_number}`,
              'SALE_RETURN',
              id,
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
            `Inventory increase for return #${updatedReturn.return_number}`,
            'SALE_RETURN',
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
            1, // Cash Account
            updatedReturn.refund_amount,
            `Refund for return #${updatedReturn.return_number}`,
            'SALE_RETURN',
            id,
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
            `COGS reversal for return #${updatedReturn.return_number}`,
            'SALE_RETURN',
            id,
            journalId
          ]
        );
      }
    } else {
      // Just update notes/reason without changing items
      await client.query(
        "UPDATE sale_returns SET notes = COALESCE($1, notes), reason = COALESCE($2, reason), updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [body.notes, body.reason, id]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: "Sale return updated successfully", 
      sale_return: updatedReturn,
      accounting: totalCOGS > 0 ? {
        total_cogs: totalCOGS
      } : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating sale return:", error);
    return NextResponse.json({ error: "Error updating sale return: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/sales-returns/[id] - Delete sale return
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    
    await client.query('BEGIN');

    // Check if sale return exists
    const returnCheck = await client.query("SELECT * FROM sale_returns WHERE id = $1", [id]);
    if (returnCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Sale return not found" }, { status: 404 });
    }

    // Get return items to reverse inventory changes
    const returnItemsRes = await client.query(
      "SELECT product_id, quantity FROM sale_return_items WHERE sale_return_id = $1", 
      [id]
    );
    
    const returnItems = returnItemsRes.rows;

    // Reverse inventory changes (decrease stock)
    for (const item of returnItems) {
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2", 
        [item.quantity, item.product_id]
      );
    }

    // Delete associated journal entries
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'SALE_RETURN' AND reference_id = $1",
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
    await client.query("DELETE FROM sale_return_items WHERE sale_return_id = $1", [id]);

    // Delete the sale return
    await client.query("DELETE FROM sale_returns WHERE id = $1", [id]);

    await client.query('COMMIT');

    return NextResponse.json({ message: "Sale return deleted successfully and inventory adjusted" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting sale return:", error);
    return NextResponse.json({ error: "Error deleting sale return: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}