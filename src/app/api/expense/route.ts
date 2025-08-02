import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/expense - Get all expenses
export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM expenses ORDER BY expense_date DESC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching expenses: " + error }, { status: 500 });
  }
}

// POST /api/expense - Create a new expense with accounting entries
export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const { description, amount, expense_date, category, notes } = await request.json();
    
    // Validate required fields
    if (!description || !amount) {
      return NextResponse.json({ error: "Description and amount are required" }, { status: 400 });
    }
    
    await client.query('BEGIN');
    
    // Insert expense record
    const expenseRes = await client.query(
      "INSERT INTO expenses (description, amount, expense_date, category, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [description, amount, expense_date, category, notes]
    );
    
    const expense = expenseRes.rows[0];
    
    // Create journal entry for the expense
    const journalRes = await client.query(
      `INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING journal_id`,
      [
        expense_date,
        `Expense: ${description}`,
        'EXPENSE',
        expense.id
      ]
    );
    
    const journalId = journalRes.rows[0].journal_id;
    
    // Determine expense account based on category (using your existing chart of accounts)
    let expenseAccountId = 11; // Default to Operating Expenses account
    console.log(category.toLowerCase());
    // Map common categories to specific accounts if they exist
    switch (category?.toLowerCase()) {
      case 'rent':
        expenseAccountId = 12; // Rent Expense account
        break;
      case 'utilities':
      case 'electricity':
      case 'internet':
        expenseAccountId = 13; // Utilities Expense account
        break;
      case 'salaries':
      case 'wages':
        expenseAccountId = 14; // Salaries Expense account
        break;
      case 'maintenance':
        expenseAccountId = 15; // Maintenance Expense account
        break;
      default:
        expenseAccountId = 11; // Default Operating Expenses
    }
    
    // Create journal entry lines (Double-entry accounting)
    
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
    
    // 2. Credit: Cash Account (decrease cash) - assuming cash payment
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
    
    // Post to General Ledger
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
        expense.id,
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
        expense.id,
        journalId
      ]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({ 
      message: "Expense added successfully with accounting entries", 
      expense: expense,
      accounting: {
        journal_entry_id: journalId
      }
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Error creating expense: " + error }, { status: 500 });
  } finally {
    client.release();
  }
}