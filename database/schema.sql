-- ============================================
-- SUBLIMAROC - Schéma MySQL
-- Hostinger: u736936332_sublimaroc
-- ============================================

CREATE DATABASE IF NOT EXISTS u736936332_sublimaroc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE u736936332_sublimaroc;

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) NOT NULL PRIMARY KEY,      -- ex: GRA-MUG
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  prix DECIMAL(10,2) DEFAULT 0,
  image VARCHAR(500),
  images JSON,                               -- tableau d'URLs
  categorie VARCHAR(100),
  stock INT DEFAULT 0,
  fournisseur_nom VARCHAR(255),
  fournisseur_ville VARCHAR(255),
  -- Caractéristiques de base (tableaux JSON)
  type JSON,
  anse JSON,
  dimensions JSON,
  couleurs JSON,
  materiau JSON,
  capacite JSON,
  poids JSON,
  qualite JSON,
  manches JSON,
  col JSON,
  -- Caractéristiques personnalisées dynamiques
  custom_fields JSON,                        -- tout champ créé par l'utilisateur
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: sub_products
-- ============================================
CREATE TABLE IF NOT EXISTS sub_products (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  prix DECIMAL(10,2) DEFAULT 0,
  image VARCHAR(500),
  images JSON,
  stock INT DEFAULT 0,
  type JSON,
  anse JSON,
  dimensions JSON,
  couleurs JSON,
  materiau JSON,
  capacite JSON,
  poids JSON,
  qualite JSON,
  manches JSON,
  col JSON,
  custom_fields JSON,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  nom VARCHAR(255),
  role ENUM('admin','user') DEFAULT 'user',
  password_hash VARCHAR(255),
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: sales (ventes)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(100),
  product_nom VARCHAR(255),
  quantite INT DEFAULT 1,
  prix_unitaire DECIMAL(10,2),
  total DECIMAL(10,2),
  client VARCHAR(255),
  date_vente DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: purchases (achats)
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(100),
  product_nom VARCHAR(255),
  quantite INT DEFAULT 1,
  prix_unitaire DECIMAL(10,2),
  total DECIMAL(10,2),
  fournisseur VARCHAR(255),
  date_achat DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
