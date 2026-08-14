import { query } from './mysql'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

function scopedKey(key: string): string {
  return RID === 'default' ? key : `${RID}:${key}`
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const rows = await query<{ value: string }>('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [scopedKey(key)])
  return rows[0]?.value ?? fallback
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [scopedKey(key), value],
  )
}
