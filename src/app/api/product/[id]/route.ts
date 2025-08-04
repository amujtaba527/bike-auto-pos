import { pool } from "@/lib/db";
import { NextResponse } from 'next/server';

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
        const { name, sku, cost_price, sale_price, brand_id, category_id, min_stock_level } = await request.json();
        const productId = Number((await params).id);
        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }
        const res = await pool.query("UPDATE products SET name = $1, sku = $2, cost_price = $3, sale_price = $4, brand_id = $5, category_id = $6, min_stock_level = $7 WHERE id = $8 RETURNING *", [name, sku, cost_price, sale_price, brand_id, category_id, min_stock_level, productId]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Error updating product" }, { status: 500 });
    }
}
