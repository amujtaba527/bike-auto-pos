import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching categories" + error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    const res = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name]
    );
    
    return NextResponse.json({message: "Category added successfully", category: res.rows[0]}, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating category: " + error }, { status: 500 });
  }
}