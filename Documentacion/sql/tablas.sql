-- ============================================================
-- Base de datos: mi-proyecto (NICHO / Chubis)
-- Supabase: zxynrlqubdlrwcfoewdv
-- Actualizado: 2026-07-03
-- ============================================================

-- Configuración global del restaurante
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- Claves usadas: restaurant_name, profile_logo, sidebar_accent,
--   admin_subtitle, resta3_name, resta3_logo, resta3_accent,
--   feature_flags, feature_flags_resta3, feature_flags_portales,
--   employee_permissions, user_permissions

-- Administradores del restaurante
CREATE TABLE IF NOT EXISTS admins (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Empleados
CREATE TABLE IF NOT EXISTS employees (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT,
  pin           TEXT,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  modules       JSONB DEFAULT '{}',
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes / usuarios finales
CREATE TABLE IF NOT EXISTS customers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Menú
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  category      TEXT,
  image_url     TEXT,
  available     BOOLEAN DEFAULT TRUE,
  likes         INT DEFAULT 0,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Recetas
CREATE TABLE IF NOT EXISTS recipes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  ingredients   JSONB DEFAULT '[]',
  steps         JSONB DEFAULT '[]',
  category      TEXT,
  image_url     TEXT,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  items         JSONB NOT NULL DEFAULT '[]',
  status        TEXT DEFAULT 'pending',
  total         NUMERIC(10,2),
  table_number  TEXT,
  notes         TEXT,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
-- status: pending | preparing | ready | delivered | cancelled

-- Tarjetas de fidelización
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  stamps        INT DEFAULT 0,
  redeemed      INT DEFAULT 0,
  active        BOOLEAN DEFAULT TRUE,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Reseñas
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating        INT CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  author        TEXT,
  published     BOOLEAN DEFAULT FALSE,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Mesas (Resta3)
CREATE TABLE IF NOT EXISTS tables (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number        INT NOT NULL,
  status        TEXT DEFAULT 'free',
  capacity      INT DEFAULT 4,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
-- status: free | occupied | reserved

-- Inventario
CREATE TABLE IF NOT EXISTS inventory (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  quantity      NUMERIC(10,2) DEFAULT 0,
  unit          TEXT,
  min_stock     NUMERIC(10,2) DEFAULT 0,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Pantallas TV (slides)
CREATE TABLE IF NOT EXISTS tv_slides (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT,
  content       JSONB DEFAULT '{}',
  order_index   INT DEFAULT 0,
  active        BOOLEAN DEFAULT TRUE,
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets de soporte (enviados al superadmin)
CREATE TABLE IF NOT EXISTS tickets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_name     TEXT,
  from_role     TEXT,
  message       TEXT NOT NULL,
  status        TEXT DEFAULT 'open',
  restaurant_id TEXT NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- status: open | in_progress | resolved
