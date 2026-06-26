CREATE DATABASE IF NOT EXISTS altoque_db;
USE altoque_db;

DROP TABLE IF EXISTS CronogramaPago;
DROP TABLE IF EXISTS Credito;
DROP TABLE IF EXISTS Vehiculo;
DROP TABLE IF EXISTS Cliente;
DROP TABLE IF EXISTS User;

CREATE TABLE User (
  id_user INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  rol VARCHAR(10) NOT NULL DEFAULT 'asesor',
  estado_cuenta BOOL NOT NULL DEFAULT TRUE
);

CREATE TABLE Cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  id_user INT NOT NULL,
  tipo_documento VARCHAR(3) NOT NULL,
  numero_documento VARCHAR(11) NOT NULL UNIQUE,
  nombres VARCHAR(50),
  apellidos VARCHAR(50),
  telefono VARCHAR(12) UNIQUE,
  ingreso_mensual DECIMAL(14,2),
  correo VARCHAR(50) UNIQUE,
  FOREIGN KEY (id_user) REFERENCES User(id_user)
);

CREATE TABLE Vehiculo (
  id_vehiculo INT AUTO_INCREMENT PRIMARY KEY,
  marca VARCHAR(20) NOT NULL,
  modelo VARCHAR(20) NOT NULL,
  year_fabricacion VARCHAR(4) NOT NULL,
  precio_venta DECIMAL(14,2) NOT NULL,
  tipo_moneda VARCHAR(10) NOT NULL
);

CREATE TABLE Credito (
  id_credito INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  id_user INT NOT NULL,
  id_vehiculo INT NOT NULL,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_moneda VARCHAR(10) NOT NULL,
  cuota_inicial DECIMAL(14,2) NOT NULL,
  metodo_pago VARCHAR(20) NOT NULL,
  tipo_tasa VARCHAR(10) NOT NULL,
  capitalizacion VARCHAR(20) NOT NULL DEFAULT 'N/A',
  tasa_valor DECIMAL(12,4) NOT NULL,
  tipo_cambio_aplicado VARCHAR(20) NOT NULL DEFAULT 'N/A',
  plazo_meses INT NOT NULL,
  plazo_gracia_total INT NOT NULL DEFAULT 0,
  plazo_gracia_parcial INT NOT NULL DEFAULT 0,
  cuota_final_inteligente DECIMAL(14,2),
  VAN DECIMAL(14,2),
  TIR DECIMAL(12,4),
  TCEA DECIMAL(12,4),
  tasa_desgravamen DECIMAL(12,4),
  seguro_vehicular DECIMAL(14,2),
  portes DECIMAL(14,2),
  FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente),
  FOREIGN KEY (id_user) REFERENCES User(id_user),
  FOREIGN KEY (id_vehiculo) REFERENCES Vehiculo(id_vehiculo)
);

CREATE TABLE CronogramaPago (
  id_cronograma_pago INT AUTO_INCREMENT PRIMARY KEY,
  id_credito INT NOT NULL,
  numero_mes INT NOT NULL,
  fecha_vencimiento DATETIME NOT NULL,
  tipo_cuota VARCHAR(20) NOT NULL DEFAULT 'Cuota Normal',
  cuota_mensual DECIMAL(14,2) NOT NULL,
  cuota_base DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  monto_desgravamen DECIMAL(14,2) NOT NULL,
  cargos_fijos DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  pago_residual DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  saldo_inicial_mes DECIMAL(14,2),
  interes_mes DECIMAL(14,2) NOT NULL,
  amortizacion DECIMAL(14,2) NOT NULL,
  saldo_final_mes DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (id_credito) REFERENCES Credito(id_credito)
);