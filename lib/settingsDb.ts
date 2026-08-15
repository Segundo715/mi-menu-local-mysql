import { getDb } from './mongodb'

const RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

function scopedKey(key: string): string {
  return RID === 'default' ? key : `${RID}:${key}`
}

interface SettingDoc { _id: string; value: string }

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const db = await getDb()
  const doc = await db.collection<SettingDoc>('settings').findOne({ _id: scopedKey(key) })
  return doc?.value ?? fallback
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.collection<SettingDoc>('settings').updateOne(
    { _id: scopedKey(key) },
    { $set: { value } },
    { upsert: true },
  )
}
