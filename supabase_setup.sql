-- ============================================================
-- Restaurante — Supabase Schema Completo
-- Generado desde todos los módulos lib/*Db.ts
-- Pega en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- ── 1. CLIENTES (login nombre + contraseña) ─────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  age           INTEGER,
  phone         TEXT        DEFAULT '',
  password_hash TEXT,
  visits        INTEGER     DEFAULT 0,
  confirmed     BOOLEAN     DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now(),
  stamps        JSONB       DEFAULT '[]',
  requested_at  TIMESTAMPTZ
);

-- ── 2. MENÚ ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  price       NUMERIC     NOT NULL,
  category    TEXT        NOT NULL,
  image_url   TEXT,
  available   BOOLEAN     DEFAULT true,
  likes       INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 3. TARJETAS DE FIDELIZACIÓN ──────────────────────────────
-- Nota: card_type y active=false son columnas que el SQL original no tenía
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  visits        INTEGER     DEFAULT 0,
  active        BOOLEAN     DEFAULT false,
  card_type     TEXT        DEFAULT 'cafe',
  expires_at    TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT now(),
  stamps        JSONB       DEFAULT '[]'
);

-- ── 4. PEDIDOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT        NOT NULL,
  table_number  TEXT,
  items         JSONB       NOT NULL DEFAULT '[]',
  total         NUMERIC     NOT NULL DEFAULT 0,
  status        TEXT        DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 5. RESEÑAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT        NOT NULL,
  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  published     BOOLEAN     DEFAULT false,
  bad           BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 6. EMPLEADOS ─────────────────────────────────────────────
-- Nota: role es columna que el SQL original no tenía
CREATE TABLE IF NOT EXISTS employees (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        DEFAULT 'Mesero',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 7. ADMINS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 8. RECETARIO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  category    TEXT        DEFAULT 'General',
  ingredients TEXT[]      DEFAULT '{}',
  steps       TEXT[]      DEFAULT '{}',
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 9. PANTALLAS TV ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tv_slides (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  subtitle    TEXT,
  price       TEXT,
  image_url   TEXT,
  is_offer    BOOLEAN     DEFAULT false,
  slide_order INTEGER     DEFAULT 0,
  active      BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 10. CONFIGURACIÓN (clave-valor) ──────────────────────────
-- Usada por: nombre restaurante, logo, colores, feature_flags, customer_nav, etc.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ── 11. MESAS DEL RESTAURANTE ────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT        NOT NULL,
  seats      INTEGER     DEFAULT 4,
  status     TEXT        DEFAULT 'libre',
  customer   TEXT,
  since      TEXT,
  zone       TEXT        DEFAULT 'Salon',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 12. INVENTARIO ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  category   TEXT        DEFAULT 'General',
  stock      NUMERIC     DEFAULT 0,
  min_stock  NUMERIC     DEFAULT 0,
  unit       TEXT        DEFAULT 'pz',
  cost       NUMERIC     DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 13. CUMPLEANOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS birthday_registrations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL DEFAULT '',
  birthdate  TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- El control de acceso real lo hace la app (tokens HMAC).
-- Acceso total al anon key para que las rutas API funcionen.
-- ============================================================

ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_slides              ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory              ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON customers              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON menu_items             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON loyalty_cards          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON orders                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON reviews                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON employees              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON admins                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON recipes                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tv_slides              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON settings               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tables                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON inventory              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON birthday_registrations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE
-- En Supabase > Storage > New bucket:
--   Nombre: uploads  |  Public bucket: SI
-- Luego en Storage > Policies > uploads > Add policy:
--   Allow all operations for anon
-- ============================================================
