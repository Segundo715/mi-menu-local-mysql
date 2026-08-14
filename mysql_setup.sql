-- ============================================================
-- Restaurante — Esquema MySQL (mi-menu-local-mysql)
-- Refleja el esquema REAL de la base `mi_menu` (verificado con
-- SHOW CREATE TABLE), no una traducción teórica de Postgres.
-- Ejecutar contra la base indicada en MYSQL_DATABASE (.env.local).
-- Todas las sentencias son idempotentes (CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- ── Tablas que usa la app actual ─────────────────────────────

-- 1. CLIENTES (modelo viejo, usado hoy solo por /admin/sellar para
--    gestionar clientes YA EXISTENTES — activar/sellar/canjear/eliminar).
--    password_hash queda sin uso real: no hay ruta de registro pública
--    que la pida (POST /api/customers no acepta password) ni ninguna
--    ruta que llame a authenticateCustomer() para loguear con ella —
--    ambas se perdieron al borrar /registro, /activate, /card/usuario
--    y /api/customer-auth. La columna se conserva por compatibilidad
--    con filas ya existentes, no se usa para nada nuevo.
CREATE TABLE IF NOT EXISTS customers (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  age           INT,
  phone         VARCHAR(50),
  password_hash VARCHAR(255),
  visits        INT           DEFAULT 0,
  confirmed     TINYINT(1)    DEFAULT 0,
  stamps        JSON,
  requested_at  DATETIME,
  registered_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  INDEX idx_customers_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. MENÚ
CREATE TABLE IF NOT EXISTS menu_items (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  description   TEXT,
  price         DECIMAL(12,2) NOT NULL,
  category      VARCHAR(100)  NOT NULL,
  image_url     TEXT,
  available     TINYINT(1)    DEFAULT 1,
  likes         INT           DEFAULT 0,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  INDEX idx_menu_items_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TARJETAS DE FIDELIZACIÓN (modelo nuevo — /card, /admin/tarjetas, /admin/sellar)
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  phone         VARCHAR(50)   NOT NULL,
  visits        INT           DEFAULT 0,
  active        TINYINT(1)    DEFAULT 0,
  card_type     VARCHAR(50)   DEFAULT 'cafe',
  expires_at    DATETIME,
  stamps        JSON,
  registered_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  INDEX idx_loyalty_cards_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
  id            CHAR(36)      PRIMARY KEY,
  customer_name VARCHAR(255)  NOT NULL,
  table_number  VARCHAR(50),
  items         JSON          NOT NULL,
  total         DECIMAL(12,2) NOT NULL,
  status        VARCHAR(50)   DEFAULT 'pending',
  notes         TEXT,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  INDEX idx_orders_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. RESEÑAS
CREATE TABLE IF NOT EXISTS reviews (
  id            CHAR(36)      PRIMARY KEY,
  customer_name VARCHAR(255)  NOT NULL,
  rating        INT           NOT NULL,
  comment       TEXT,
  published     TINYINT(1)    DEFAULT 0,
  bad           TINYINT(1)    DEFAULT 0,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  INDEX idx_reviews_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. EMPLEADOS. /admin/configuracion sigue creando/listando estas cuentas
--    (con password_hash), pero YA NO SE PUEDEN USAR PARA LOGUEARSE:
--    /employee/login y /api/employee/auth se borraron, authenticateEmployee()
--    en lib/employeeDb.ts existe pero ningún endpoint la llama.
--    /employee/menu quedó como página abierta, sin gate de sesión.
CREATE TABLE IF NOT EXISTS employees (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(100),
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employees_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ADMINS. El login de Administrador SÍ funciona (authenticateAdmin()
--    se usa en app/api/auth/route.ts). Pero admins.role='Resta3' (creadas
--    desde /admin/configuracion vía app/api/resta3/users/route.ts) son
--    la MISMA situación que employees: se crean con password_hash pero
--    no hay a dónde loguearse con ellas (/resta3/login y /api/resta3/auth
--    se borraron). /resta3/menu quedó abierto, sin gate de sesión.
CREATE TABLE IF NOT EXISTS admins (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(100)  DEFAULT 'Administrador',
  restaurant_id VARCHAR(100)  DEFAULT 'default',
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admins_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. CONFIGURACIÓN (clave-valor). Usada por: nombre restaurante, logo,
--    colores, feature_flags, reward_categories, customer_nav, etc.
--    Sin restaurant_id: usa prefijo en la clave (ver lib/settingsDb.ts -> scopedKey).
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TICKETS DE SOPORTE ("Reportar problema" en AdminNav/EmployeeNav/Resta3Nav)
--    NOTA: esta tabla faltaba en la base de datos real — sin ella, el botón
--    "Reportar problema" fallaba silenciosamente (POST /api/tickets con 500).
CREATE TABLE IF NOT EXISTS sa_tickets (
  id              CHAR(36)      PRIMARY KEY,
  restaurant_id   VARCHAR(100)  DEFAULT 'default',
  restaurant_name VARCHAR(255),
  from_name       VARCHAR(255),
  from_role       VARCHAR(100),
  message         TEXT          NOT NULL,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sa_tickets_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tablas que existen en la base pero YA NO usa la app ──────
-- Se dejan aquí solo como referencia (conservan datos existentes); el
-- código que las leía/escribía (lib/recipeDb.ts, lib/tvDb.ts,
-- lib/tablesDb.ts, lib/inventoryDb.ts, lib/birthdayDb.ts y sus rutas
-- /api/recipes, /api/tv, /api/resta3/tables, /api/resta3/inventory,
-- /api/cumpleanos) se eliminó al reducir la app solo a menú, reseñas,
-- tarjeta de lealtad y panel admin. No se borran automáticamente para
-- no perder datos — bórralas a mano si ya no las necesitas.

CREATE TABLE IF NOT EXISTS recipes (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  ingredients   JSON,
  steps         JSON,
  image_url     TEXT,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tv_slides (
  id            CHAR(36)      PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  subtitle      VARCHAR(255),
  price         VARCHAR(100),
  image_url     TEXT,
  is_offer      TINYINT(1)    DEFAULT 0,
  slide_order   INT           DEFAULT 0,
  active        TINYINT(1)    DEFAULT 1,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tables` (
  id            CHAR(36)      PRIMARY KEY,
  label         VARCHAR(100)  NOT NULL,
  seats         INT           DEFAULT 2,
  status        VARCHAR(50)   DEFAULT 'libre',
  customer      VARCHAR(255),
  since         VARCHAR(100),
  zone          VARCHAR(100),
  updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  category      VARCHAR(100),
  stock         DECIMAL(12,2) DEFAULT 0,
  min_stock     DECIMAL(12,2) DEFAULT 0,
  unit          VARCHAR(50),
  cost          DECIMAL(12,2) DEFAULT 0,
  updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS birthday_registrations (
  id            CHAR(36)      PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  phone         VARCHAR(50)   NOT NULL,
  birthdate     VARCHAR(50)   NOT NULL,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  restaurant_id VARCHAR(100)  DEFAULT 'default'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTA: no hay Row Level Security aquí. El control de acceso real lo
-- hace la app vía tokens HMAC (lib/auth.ts) en cada ruta API.
-- Las imágenes se suben a Supabase Storage (bucket "uploads", público)
-- vía app/api/{menu,settings}/upload — eso no depende de MySQL.
-- ============================================================
