import { pool } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const brandId = Number((await params).id);
        if (isNaN(brandId)) {
            return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
        }

        const res = await pool.query("DELETE FROM brands WHERE id = $1 RETURNING *", [brandId]);
        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Brand deleted successfully" });
    } catch (error) {
        console.error("Error deleting brand:", error);
        return NextResponse.json({ error: "Error deleting brand" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    try {
        const { name } = await request.json();
        const brandId = Number((await params).id);
        if (isNaN(brandId)) {
            return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
        }
        const res = await pool.query("UPDATE brands SET name = $1 WHERE id = $2 RETURNING *", [name, brandId]);
        if (res.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Error updating brand:", error);
        return NextResponse.json({ error: "Error updating brand" }, { status: 500 });
    }
}
