// Sube imágenes locales a Supabase Storage y actualiza URLs en la DB
// Ejecutar: node scripts/upload-images.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, extname } from 'path'

const SUPABASE_URL = 'https://zxynrlqubdlrwcfoewdv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_u9rPrDPuBeLDinNMzcloBw_Tu1ydr7m'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function mime(ext) {
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}

async function uploadDir(localDir, storagePrefix) {
  if (!existsSync(localDir)) return {}
  const files = readdirSync(localDir)
  const urlMap = {}
  for (const file of files) {
    const localPath = join(localDir, file)
    const storagePath = `${storagePrefix}/${file}`
    const oldUrl = `/uploads/${storagePrefix}/${file}`
    const ext = extname(file).toLowerCase()
    const buffer = readFileSync(localPath)
    const { error } = await sb.storage.from('uploads').upload(storagePath, buffer, {
      contentType: mime(ext),
      upsert: true,
    })
    if (error) {
      console.error(`  ❌ ${file}: ${error.message}`)
    } else {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`
      urlMap[oldUrl] = publicUrl
      console.log(`  ✅ ${file}`)
    }
  }
  return urlMap
}

async function run() {
  console.log('📸 Subiendo imágenes a Supabase Storage...\n')

  console.log('menu/')
  const menuMap = await uploadDir('public/uploads/menu', 'menu')

  console.log('\ntv/')
  const tvMap = await uploadDir('public/uploads/tv', 'tv')

  const urlMap = { ...menuMap, ...tvMap }

  // Actualizar URLs en menu_items
  console.log('\n🔄 Actualizando URLs en menu_items...')
  const { data: items } = await sb.from('menu_items').select('id, image_url')
  for (const item of items ?? []) {
    const newUrl = urlMap[item.image_url]
    if (newUrl) {
      await sb.from('menu_items').update({ image_url: newUrl }).eq('id', item.id)
      console.log(`  ✅ ${item.image_url.split('/').pop()}`)
    }
  }

  // Actualizar URLs en tv_slides
  console.log('\n🔄 Actualizando URLs en tv_slides...')
  const { data: slides } = await sb.from('tv_slides').select('id, image_url')
  for (const slide of slides ?? []) {
    const newUrl = urlMap[slide.image_url]
    if (newUrl) {
      await sb.from('tv_slides').update({ image_url: newUrl }).eq('id', slide.id)
      console.log(`  ✅ ${slide.image_url.split('/').pop()}`)
    }
  }

  console.log('\n✅ Listo. Todas las imágenes están en Supabase Storage.')
}

run().catch(console.error)
