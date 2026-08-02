-- ============================================================
-- Base de datos: Gestión de reservas de peluquería
-- ============================================================

CREATE DATABASE IF NOT EXISTS peluqueria
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE peluqueria;

-- Tabla de administradores (usuarios con acceso al panel)
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de huecos disponibles (creados libremente por el administrador)
CREATE TABLE IF NOT EXISTS slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status ENUM('available', 'blocked', 'booked') NOT NULL DEFAULT 'available',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slot_date_time (date, time)
) ENGINE=InnoDB;

-- Tabla de reservas (clientes no necesitan registrarse)
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot_id INT NOT NULL UNIQUE,
  client_name VARCHAR(100) NOT NULL,
  client_phone VARCHAR(30) NOT NULL,
  status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  google_event_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_slot FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_slots_date_status ON slots(date, status);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Usuario de aplicación con permisos limitados (recomendado en producción)
-- CREATE USER 'peluqueria_user'@'%' IDENTIFIED BY 'change_me';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON peluqueria.* TO 'peluqueria_user'@'%';
-- FLUSH PRIVILEGES;
