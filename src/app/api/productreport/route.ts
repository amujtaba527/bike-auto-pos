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
    const rawType = searchParams.get("transactionType");
    const transactionType: 'all' | 'sale' | 'purchase' = rawType === 'sale' || rawType === 'purchase' ? rawType : 'all';
    const from = searchParams.get("from") || undefined; // ISO string/date
    const to = searchParams.get("to") || undefined; // ISO string/date

    const baseFilters = { brandId, productId, from, to };

    let paramIndex = 1;
    const parts: string[] = [];
    const allParams: any[] = [];

    // Include purchases unless explicitly filtered to only 'sale'
    if (transactionType !== 'sale') {
      const purchaseCond = buildConditions(paramIndex, baseFilters, "pu.purchase_date");
      paramIndex = purchaseCond.nextIndex;
      parts.push(`
      SELECT 'purchase' AS type,
             p.name AS product_name,
             p.sku,
             pu.id AS id,
             pu.invoice_number,
             pi.unit_price AS price,
             pi.quantity AS qty,
             pu.purchase_date AS date
      FROM purchase_items pi
      JOIN purchases pu ON pi.purchase_id = pu.id
      JOIN products p ON pi.product_id = p.id
      ${purchaseCond.where}
      `);
      allParams.push(...purchaseCond.params);
    }

    // Include sales unless explicitly filtered to only 'purchase'
    if (transactionType !== 'purchase') {
      const saleCond = buildConditions(paramIndex, baseFilters, "s.sale_date");
      paramIndex = saleCond.nextIndex;
      parts.push(`
      SELECT 'sale' AS type,
             p.name AS product_name,
             p.sku,
             s.id AS id,
             s.invoice_number,
             si.unit_price AS price,
             si.quantity AS qty,
             s.sale_date AS date
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      ${saleCond.where}
      `);
      allParams.push(...saleCond.params);
    }

    // If nothing selected (shouldn't happen), return empty array
    if (parts.length === 0) {
      return NextResponse.json([]);
    }

    const sql = `
      SELECT * FROM (
        ${parts.join(" UNION ALL ")}
      ) AS t
      ORDER BY
        CASE WHEN t.type = 'purchase' THEN 0 ELSE 1 END,
        t.date DESC
    `;

    const result = await pool.query(sql, allParams);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("/api/productreport error:", error);
    return NextResponse.json({ error: "Error generating product report" }, { status: 500 });
  }
}