import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    
    // Fetch the specific customer by ID
    const res = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching customer" + error }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const customerId = Number((await params).id);
      if (isNaN(customerId)) {
          return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
      }

      const res = await pool.query("DELETE FROM customers WHERE id = $1 RETURNING *", [customerId]);
      if (res.rowCount === 0) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
      console.error("Error deleting customer:", error);
      return NextResponse.json({ error: "Error deleting customer" }, { status: 500 });
  }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    try {
        const { name, phone, email, address } = await request.json();
        const customerId = Number((await params).id);
        if (isNaN(customerId)) {
            return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
        }
        const res = await pool.query("UPDATE customers SET name = $1, phone = $2, email = $3, address = $4 WHERE id = $5 RETURNING *", [name, phone, email, address, customerId]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating customer:", error);
        return NextResponse.json({ error: "Error updating customer" }, { status: 500 });
    }
}
