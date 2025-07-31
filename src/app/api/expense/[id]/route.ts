import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// DELETE /api/expense/[id] - Delete an expense and reverse accounting entries
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    
    await client.query('BEGIN');
    
    // Get the expense details before deleting
    const expenseRes = await client.query("SELECT * FROM expenses WHERE id = $1", [id]);
    
    if (expenseRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    // Delete associated journal entries
    // First, get journal entry ID
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'EXPENSE' AND reference_id = $1",
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
    
    // Delete the expense
    const deleteRes = await client.query("DELETE FROM expenses WHERE id = $1 RETURNING *", [id]);
    
    await client.query('COMMIT');
    
    return NextResponse.json({ message: "Expense deleted successfully" ,expense: deleteRes.rows[0]});
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Error deleting expense: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT /api/expense/[id] - Update an expense and update accounting entries
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  
  try {
    const { id } = await params;
    const { description, amount, expense_date, category, notes } = await request.json();
    
    // Validate required fields
    if (!description || !amount || !expense_date) {
      return NextResponse.json({ error: "Description, amount, and date are required" }, { status: 400 });
    }
    
    await client.query('BEGIN');
    
    // Update expense record
    const expenseRes = await client.query(
      "UPDATE expenses SET description = $2, amount = $3, expense_date = $4, category = $5, notes = $6 WHERE id = $1 RETURNING *",
      [id, description, amount, expense_date, category, notes]
    );
    
    if (expenseRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    const expense = expenseRes.rows[0];
    
    // Get existing journal entry
    const journalRes = await client.query(
      "SELECT journal_id FROM journal_entries WHERE reference_type = 'EXPENSE' AND reference_id = $1",
      [id]
    );
    
    if (journalRes.rows.length > 0) {
      const journalId = journalRes.rows[0].journal_id;
      
      // Update journal entry header
      await client.query(
        "UPDATE journal_entries SET entry_date = $1, description = $2 WHERE journal_id = $3",
        [expense_date, `Expense: ${description}`, journalId]
      );
      
      // Determine expense account based on category
      let expenseAccountId = 9; // Default to Operating Expenses account
      
      switch (category?.toLowerCase()) {
        case 'rent':
          expenseAccountId = 10; // Rent Expense account
          break;
        case 'utilities':
        case 'electricity':
        case 'water':
        case 'internet':
          expenseAccountId = 11; // Utilities Expense account
          break;
        case 'salaries':
        case 'wages':
          expenseAccountId = 12; // Salaries Expense account
          break;
        case 'marketing':
        case 'advertising':
          expenseAccountId = 13; // Marketing Expense account
          break;
        case 'maintenance':
          expenseAccountId = 14; // Maintenance Expense account
          break;
        default:
          expenseAccountId = 9; // Default Operating Expenses
      }
      
      // Delete existing journal entry lines
      await client.query("DELETE FROM journal_entry_lines WHERE journal_id = $1", [journalId]);
      
      // Delete existing general ledger entries
      await client.query("DELETE FROM general_ledger WHERE journal_entry_id = $1", [journalId]);
      
      // Create new journal entry lines with updated values
      
      // 1. Debit: Expense Account (increase expense)
      await client.query(
        `INSERT INTO journal_entry_lines (
          journal_id, account_id, debit_amount, description
        ) VALUES ($1, $2, $3, $4)`,
        [
          journalId,
          expenseAccountId,
          amount,
          `Expense: ${description}`
        ]
      );
      
      // 2. Credit: Cash Account (decrease cash)
      await client.query(
        `INSERT INTO journal_entry_lines (
          journal_id, account_id, credit_amount, description
        ) VALUES ($1, $2, $3, $4)`,
        [
          journalId,
          1, // Cash Account ID
          amount,
          `Cash paid for expense: ${description}`
        ]
      );
      
      // Post updated entries to General Ledger
      // Debit entry
      await client.query(
        `INSERT INTO general_ledger (
          transaction_date, account_id, debit_amount, description, 
          reference_type, reference_id, journal_entry_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          expense_date,
          expenseAccountId,
          amount,
          `Expense: ${description}`,
          'EXPENSE',
          id,
          journalId
        ]
      );
      
      // Credit entry
      await client.query(
        `INSERT INTO general_ledger (
          transaction_date, account_id, credit_amount, description, 
          reference_type, reference_id, journal_entry_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          expense_date,
          1, // Cash Account
          amount,
          `Cash paid for expense: ${description}`,
          'EXPENSE',
          id,
          journalId
        ]
      );
    }
    
    await client.query('COMMIT');
    
    return NextResponse.json({ 
      message: "Expense updated successfully with accounting entries", 
      expense: expense 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Error updating expense: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}