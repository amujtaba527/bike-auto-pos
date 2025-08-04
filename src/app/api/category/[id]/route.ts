import { pool } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const categoryId = Number((await params).id);
        if (isNaN(categoryId)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }

        const res = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING *", [categoryId]);
        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json({ error: "Error deleting category" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    try {
        const { name } = await request.json();
        const categoryId = Number((await params).id);
        if (isNaN(categoryId)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }
        const res = await pool.query("UPDATE categories SET name = $1 WHERE id = $2 RETURNING *", [name, categoryId]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating category:", error);
        return NextResponse.json({ error: "Error updating category" }, { status: 500 });
    }
}
