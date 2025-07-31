import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
      console.log("Fetching products...");
      const res = await pool.query("SELECT * FROM products ORDER BY id ASC");
      return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching products" + error }, { status: 500 });
  }
}

function generateSKU(initialCode: string, sale_price: number): string {
    // Remove non-alphanumerics from user-provided initial code and convert to uppercase
  const cleaned = initialCode
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase();
  const pricePart = Math.round(sale_price).toString();
  return `${cleaned}-${pricePart}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.name || typeof body.name !== "string" || !body.sku || typeof body.sku !== "string" || !body.cost_price || typeof body.cost_price !== "number" || !body.sale_price || typeof body.sale_price !== "number" || !body.stock || typeof body.stock !== "number") {
      return NextResponse.json({ error: "Invalid product details" }, { status: 400 });
    }
    const sku = generateSKU(body.sku, body.sale_price);
    const res = await pool.query("INSERT INTO products (name, sku, description, cost_price, sale_price, stock, min_stock_level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [body.name, sku, body.description, body.cost_price, body.sale_price, body.stock, body.min_stock_level]);

    return NextResponse.json({ message: "Product added successfully", product: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Error adding product" + error }, { status: 500 });
  }
}