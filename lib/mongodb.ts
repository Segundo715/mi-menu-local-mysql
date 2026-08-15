import { MongoClient, type Db } from 'mongodb'
import { setServers } from 'node:dns'

// El resolutor de DNS de Node en Windows a veces no puede resolver el registro
// SRV de "mongodb+srv://" (ECONNREFUSED) aunque `nslookup` del sistema sí
// funcione — es un problema conocido del resolutor c-ares de Node en algunas
// redes. Forzar DNS públicos evita el fallo sin tocar el connection string.
setServers(['8.8.8.8', '1.1.1.1'])

// El hot-reload de Next.js en dev re-evalúa este módulo en cada recompilación;
// sin cachear el cliente en `global`, cada guardado de archivo abriría una
// conexión nueva sin cerrar la anterior (ver CLAUDE.md).
declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Falta MONGODB_URI en .env.local')
  // maxPoolSize bajo: en serverless (Vercel) cada función es una instancia
  // aislada — con el default (100) cada una intenta abrir hasta 100
  // conexiones propias, y el tier gratuito de Atlas (M0) tiene un límite de
  // conexiones simultáneas bajo. Sin este límite, bajo tráfico concurrente el
  // cluster se satura y empieza a cerrar conexiones (MongoServerSelectionError,
  // "ReplicaSetNoPrimary").
  return new MongoClient(uri, { maxPoolSize: 5 }).connect()
}

// Cachear en `global` también en producción: cada instancia serverless de
// Vercel puede recibir varias invocaciones mientras esté "caliente" — sin
// cachear, cada import de este módulo reconecta desde cero.
const clientPromise = global.__mongoClientPromise ?? connect()
global.__mongoClientPromise = clientPromise

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db(process.env.MONGODB_DB || 'mi_menu')
}
