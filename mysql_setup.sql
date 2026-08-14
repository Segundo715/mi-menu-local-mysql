-- ============================================================
-- Restaurante — Esquema MySQL
-- Traducido desde supabase_setup.sql (Postgres) para lib/mysql.ts
-- Ejecutar contra la base indicada en MYSQL_DATABASE (.env.local)
-- ============================================================

-- ── 1. CLIENTES (login nombre + contraseña) ─────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          TEXT         NOT NULL,
  age           INTEGER,
  phone         VARCHAR(32)  DEFAULT '',
  password_hash TEXT,
  visits        INTEGER      DEFAULT 0,
  confirmed     BOOLEAN      DEFAULT true,
  registered_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  stamps        JSON,
  requested_at  DATETIME,
  INDEX idx_customers_restaurant (restaurant_id)
);

-- ── 2. MENÚ ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  description   TEXT         DEFAULT '',
  price         DECIMAL(10,2) NOT NULL,
  category      VARCHAR(255) NOT NULL,
  image_url     TEXT,
  available     BOOLEAN      DEFAULT true,
  likes         INTEGER      DEFAULT 0,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu_items_restaurant (restaurant_id)
);

-- ── 3. TARJETAS DE FIDELIZACIÓN ──────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(32)  NOT NULL,
  visits        INTEGER      DEFAULT 0,
  active        BOOLEAN      DEFAULT false,
  card_type     VARCHAR(64)  DEFAULT 'cafe',
  expires_at    DATETIME,
  registered_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  stamps        JSON,
  INDEX idx_loyalty_cards_restaurant (restaurant_id)
);

-- ── 4. PEDIDOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  customer_name VARCHAR(255) NOT NULL,
  table_number  VARCHAR(64),
  items         JSON         NOT NULL,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  status        VARCHAR(32)  DEFAULT 'pending',
  notes         TEXT,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_restaurant (restaurant_id)
);

-- ── 5. RESEÑAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  customer_name VARCHAR(255) NOT NULL,
  rating        INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  published     BOOLEAN      DEFAULT false,
  bad           BOOLEAN      DEFAULT false,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviews_restaurant (restaurant_id)
);

-- ── 6. EMPLEADOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(64)  DEFAULT 'Mesero',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employees_restaurant (restaurant_id)
);

-- ── 7. ADMINS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admins_restaurant (restaurant_id)
);

-- ── 8. RECETARIO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  description   TEXT         DEFAULT '',
  category      VARCHAR(255) DEFAULT 'General',
  ingredients   JSON,
  steps         JSON,
  image_url     TEXT,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipes_restaurant (restaurant_id)
);

-- ── 9. PANTALLAS TV ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tv_slides (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  title         VARCHAR(255) NOT NULL,
  subtitle      TEXT,
  price         VARCHAR(64),
  image_url     TEXT,
  is_offer      BOOLEAN      DEFAULT false,
  slide_order   INTEGER      DEFAULT 0,
  active        BOOLEAN      DEFAULT true,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tv_slides_restaurant (restaurant_id)
);

-- ── 10. CONFIGURACIÓN (clave-valor) ──────────────────────────
-- Usada por: nombre restaurante, logo, colores, feature_flags, customer_nav, etc.
-- Sin restaurant_id: usa prefijo en la clave (ver lib/settingsDb.ts -> scopedKey).
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ── 11. MESAS DEL RESTAURANTE ────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  label         VARCHAR(64)  NOT NULL,
  seats         INTEGER      DEFAULT 4,
  status        VARCHAR(32)  DEFAULT 'libre',
  customer      VARCHAR(255),
  since         VARCHAR(64),
  zone          VARCHAR(64)  DEFAULT 'Salon',
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tables_restaurant (restaurant_id)
);

-- ── 12. INVENTARIO ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(255) DEFAULT 'General',
  stock         DECIMAL(10,2) DEFAULT 0,
  min_stock     DECIMAL(10,2) DEFAULT 0,
  unit          VARCHAR(32)  DEFAULT 'pz',
  cost          DECIMAL(10,2) DEFAULT 0,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inventory_restaurant (restaurant_id)
);

-- ── 13. CUMPLEAÑOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS birthday_registrations (
  id            CHAR(36)     PRIMARY KEY,
  restaurant_id VARCHAR(64)  NOT NULL DEFAULT 'default',
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(32)  NOT NULL DEFAULT '',
  birthdate     VARCHAR(32)  NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_birthday_restaurant (restaurant_id)
);

-- ── 14. TICKETS DE SOPORTE (SuperAdmin) ───────────────────────
-- No existía en supabase_setup.sql; usada por app/api/tickets/route.ts
CREATE TABLE IF NOT EXISTS sa_tickets (
  id              CHAR(36)     PRIMARY KEY,
  restaurant_id   VARCHAR(64)  NOT NULL DEFAULT 'default',
  restaurant_name VARCHAR(255),
  from_name       VARCHAR(255),
  from_role       VARCHAR(64),
  message         TEXT         NOT NULL,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sa_tickets_restaurant (restaurant_id)
);

-- ============================================================
-- NOTA: no hay Row Level Security aquí (era un no-op "allow_all"
-- en Postgres). El control de acceso real lo hace la app vía
-- tokens HMAC (lib/auth.ts) en cada ruta API.
--
-- Las imágenes se siguen subiendo a Supabase Storage (bucket
-- "uploads", público) — eso no cambia con esta migración.
-- ============================================================
