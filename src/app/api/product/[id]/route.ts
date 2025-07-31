import { pool } from "@/lib/db";
import { NextResponse } from 'next/server';

function generateSKU(initialCode: string, sale_price: number): string {
    const cleaned = initialCode
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .toUpperCase();
    const pricePart = Math.round(sale_price).toString();
    return `${cleaned}-${pricePart}`;
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const productId = Number((await params).id);
        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const res = await pool.query("DELETE FROM products WHERE id = $1 RETURNING *", [productId]);
        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Error deleting product" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    try {
        const { name, cost_price, sale_price, stock, sku } = await request.json();
        const productId = Number((await params).id);
        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }
        const generatedSku = generateSKU(sku, sale_price).toUpperCase();
        const res = await pool.query("UPDATE products SET name = $1, sku = $2, cost_price = $3, sale_price = $4, stock = $5 WHERE id = $6 RETURNING *", [name, generatedSku, cost_price, sale_price, stock, productId]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Error updating product" }, { status: 500 });
    }
}
