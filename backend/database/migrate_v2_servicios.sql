-- ============================================================
-- Migración: añade servicio y precio a las reservas existentes
-- Ejecutar UNA VEZ contra cada base de datos ya creada (local y Aiven).
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN service ENUM('corte', 'corte_barba') NOT NULL DEFAULT 'corte' AFTER status,
  ADD COLUMN price DECIMAL(6,2) NOT NULL DEFAULT 10.00 AFTER service;
