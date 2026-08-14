import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  // Sin esto, mysql2 devuelve las columnas DECIMAL (price/total/cost/stock) como
  // strings en vez de number, a diferencia de Postgres/supabase-js.
  decimalNumbers: true,
})

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params)
  return rows as T[]
}

// Columnas DATETIME llegan como objetos Date; las convertimos a ISO string
// para mantener el mismo formato que devolvía supabase-js.
export function toIso(value: unknown): string | undefined {
  if (value == null) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

// Columnas JSON: mysql2 normalmente ya las parsea a objetos/arrays JS, pero si
// llegan como string (driver/versión distinta) las parseamos manualmente.
export function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return fallback }
  }
  return value as T
}
