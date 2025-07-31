import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
      console.log("Fetching products...");
      const res = await pool.query("SELECT * FROM products WHERE stock < min_stock_level ORDER BY id ASC");
      return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching products" + error }, { status: 500 });
  }
}