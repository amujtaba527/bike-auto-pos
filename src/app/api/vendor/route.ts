import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM vendors ORDER BY id ASC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching vendors" + error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, email, address } = await request.json();
    
    const res = await pool.query(
      "INSERT INTO vendors (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, phone, email, address]
    );
    
    return NextResponse.json({message: "Vendor added successfully", vendor: res.rows[0]}, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating vendor: " + error }, { status: 500 });
  }
}