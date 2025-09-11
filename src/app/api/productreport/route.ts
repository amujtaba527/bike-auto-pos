import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function buildConditions(baseIndex: number, filters: { brandId?: number; productId?: number; from?: string; to?: string }, dateColumn: string) {
  const clauses: string[] = [];
  const params: any[] = [];
  let i = baseIndex;

  if (filters.brandId) {
    clauses.push(`p.brand_id = $${i++}`);
    params.push(filters.brandId);
  }
  if (filters.productId) {
    clauses.push(`p.id = $${i++}`);
    params.push(filters.productId);
  }
  if (filters.from) {
    clauses.push(`${dateColumn} >= $${i++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push(`${dateColumn} <= $${i++}`);
    params.push(filters.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params, nextIndex: i };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") ? Number(searchParams.get("brandId")) : undefined;
    const productId = searchParams.get("productId") ? Number(searchParams.get("productId")) : undefined;
    const from = searchParams.get("from") || undefined; // ISO string/date
    const to = searchParams.get("to") || undefined; // ISO string/date

    const filters = { brandId, productId, from, to };

    const purchaseCond = buildConditions(1, filters, "pu.purchase_date");
    const saleCond = buildConditions(purchaseCond.nextIndex, filters, "s.sale_date");

    const sql = `
      SELECT 'purchase' AS type,
             p.name AS product_name,
             p.sku,
             pu.invoice_number,
             pi.unit_price AS price,
             pi.quantity AS qty,
             pu.purchase_date AS date
      FROM purchase_items pi
      JOIN purchases pu ON pi.purchase_id = pu.id
      JOIN products p ON pi.product_id = p.id
      ${purchaseCond.where}
      UNION ALL
      SELECT 'sale' AS type,
             p.name AS product_name,
             p.sku,
             s.invoice_number,
             si.unit_price AS price,
             si.quantity AS qty,
             s.sale_date AS date
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      ${saleCond.where}
      ORDER BY date DESC
    `;

    const params = [...purchaseCond.params, ...saleCond.params];
    const result = await pool.query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("/api/productreport error:", error);
    return NextResponse.json({ error: "Error generating product report" }, { status: 500 });
  }
}