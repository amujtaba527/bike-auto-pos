import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM brands ORDER BY id ASC");
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching brands" + error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    const res = await pool.query(
      "INSERT INTO brands (name) VALUES ($1) RETURNING *",
      [name]
    );
    
    return NextResponse.json({message: "Brand added successfully", brand: res.rows[0]}, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating brand: " + error }, { status: 500 });
  }
}