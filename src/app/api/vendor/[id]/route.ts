import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    
    // Fetch the specific vendor by ID
    const res = await pool.query("SELECT * FROM vendors WHERE id = $1", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    
    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching vendor" + error }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const vendorId = Number((await params).id);
      if (isNaN(vendorId)) {
          return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
      }

      const res = await pool.query("DELETE FROM vendors WHERE id = $1 RETURNING *", [vendorId]);
      if (res.rowCount === 0) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error) {
      console.error("Error deleting vendor:", error);
      return NextResponse.json({ error: "Error deleting vendor" }, { status: 500 });
  }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    try {
        const { name, phone, email, address } = await request.json();
        const vendorId = Number((await params).id);
        if (isNaN(vendorId)) {
            return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
        }
        const res = await pool.query("UPDATE vendors SET name = $1, phone = $2, email = $3, address = $4 WHERE id = $5 RETURNING *", [name, phone, email, address, vendorId]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating vendor:", error);
        return NextResponse.json({ error: "Error updating vendor" }, { status: 500 });
    }
}
