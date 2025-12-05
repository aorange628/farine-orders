-- ========================================
-- SCHÉMA BASE DE DONNÉES FARINE
-- Système de gestion de commandes
-- ========================================

-- Extension pour UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLE: categories
-- ========================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: order_statuses
-- ========================================
CREATE TABLE order_statuses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: products
-- ========================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('unité', 'kg')),
  price_ttc DECIMAL(10,2) NOT NULL CHECK (price_ttc >= 0),
  description TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: orders
-- ========================================
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  customer_comment TEXT,
  farine_comment TEXT,
  status TEXT NOT NULL DEFAULT 'A préparer',
  total_ttc DECIMAL(10,2) NOT NULL CHECK (total_ttc >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_date DATE NOT NULL,
  CONSTRAINT fk_status FOREIGN KEY (status) REFERENCES order_statuses(name)
);

-- ========================================
-- TABLE: order_items
-- ========================================
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price_ttc DECIMAL(10,2) NOT NULL CHECK (unit_price_ttc >= 0),
  subtotal_ttc DECIMAL(10,2) NOT NULL CHECK (subtotal_ttc >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLE: settings
-- ========================================
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEX pour performance
-- ========================================
CREATE INDEX idx_orders_created_date ON orders(created_date);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- ========================================
-- DONNÉES INITIALES
-- ========================================

-- Catégories
INSERT INTO categories (name, sort_order) VALUES
('Pain', 1),
('Sucré', 2),
('Salé', 3);

-- Statuts de commande
INSERT INTO order_statuses (name, sort_order, color) VALUES
('A préparer', 1, '#FCD34D'),
('Préparé', 2, '#60A5FA'),
('Enlevé/livré', 3, '#34D399'),
('Payé en caisse', 4, '#A78BFA'),
('Facturé', 5, '#4ADE80'),
('En suspens', 6, '#FB923C'),
('Annulé', 7, '#EF4444');

-- Horaires boutique (initialisés)
-- Format: day_closed (boolean), day_open (HH:MM), day_close (HH:MM)
INSERT INTO settings (key, value) VALUES
-- Message d'accueil
('welcome_message', 'Bienvenue sur le système de commande en ligne de FARINE !'),

-- Dimanche - FERMÉ
('sunday_closed', 'true'),
('sunday_open', '08:00'),
('sunday_close', '19:00'),

-- Lundi - FERMÉ
('monday_closed', 'true'),
('monday_open', '08:00'),
('monday_close', '19:00'),

-- Mardi
('tuesday_closed', 'false'),
('tuesday_open', '08:00'),
('tuesday_close', '19:30'),

-- Mercredi
('wednesday_closed', 'false'),
('wednesday_open', '08:00'),
('wednesday_close', '19:30'),

-- Jeudi
('thursday_closed', 'false'),
('thursday_open', '08:00'),
('thursday_close', '19:30'),

-- Vendredi
('friday_closed', 'false'),
('friday_open', '08:00'),
('friday_close', '19:30'),

-- Samedi
('saturday_closed', 'false'),
('saturday_open', '08:00'),
('saturday_close', '19:00');

-- ========================================
-- FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour settings
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PERMISSIONS (à adapter selon vos besoins Supabase)
-- ========================================
-- Note: Ces permissions sont basiques
-- À ajuster selon votre configuration de sécurité Supabase

-- Lecture publique pour les produits actifs
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture publique des produits actifs
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Politique pour lecture publique des catégories
CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  USING (true);

-- Politique pour lecture publique des settings
CREATE POLICY "Public can view settings"
  ON settings FOR SELECT
  USING (true);

-- ========================================
-- FIN DU SCHÉMA
-- ========================================
