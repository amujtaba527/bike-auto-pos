import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: Request, { params }: { params:Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    console.log("Fetching purchase items...");
    const res = await pool.query("SELECT * FROM purchase_items WHERE purchase_id = $1", [id]);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching purchase items" + error }, { status: 500 });
  }
}