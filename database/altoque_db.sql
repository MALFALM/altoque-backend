CREATE DATABASE IF NOT EXISTS altoque_db;
USE altoque_db;

DROP TABLE IF EXISTS CronogramaPago;
DROP TABLE IF EXISTS Credito;
DROP TABLE IF EXISTS Promocion;
DROP TABLE IF EXISTS ProductoFinanciero;
DROP TABLE IF EXISTS BankConfig;
DROP TABLE IF EXISTS Cliente;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Vehiculo;
DROP TABLE IF EXISTS EntidadFinanciera;

CREATE TABLE EntidadFinanciera (
  id_entidad_financiera VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  theme_color VARCHAR(20) NOT NULL DEFAULT '#0f172a',
  estado VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE User (
  id_user INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'client',
  id_entidad_financiera VARCHAR(50) NULL,
  estado_cuenta BOOL NOT NULL DEFAULT TRUE,
  suspension_until DATETIME NULL,
  suspension_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_entidad_financiera) REFERENCES EntidadFinanciera(id_entidad_financiera)
);

CREATE TABLE Cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  id_user INT NOT NULL,
  tipo_documento VARCHAR(3) NOT NULL,
  numero_documento VARCHAR(11) NOT NULL UNIQUE,
  nombres VARCHAR(50),
  apellidos VARCHAR(50),
  telefono VARCHAR(12),
  ingreso_mensual DECIMAL(14,2),
  correo VARCHAR(100),
  FOREIGN KEY (id_user) REFERENCES User(id_user)
);

CREATE TABLE Vehiculo (
  id_vehiculo INT AUTO_INCREMENT PRIMARY KEY,
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  year_fabricacion VARCHAR(4) NOT NULL,
  precio_venta DECIMAL(14,2) NOT NULL,
  tipo_moneda VARCHAR(10) NOT NULL
);

CREATE TABLE ProductoFinanciero (
  id_producto VARCHAR(80) PRIMARY KEY,
  id_entidad_financiera VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo_tasa VARCHAR(10) NOT NULL DEFAULT 'TEA',
  tasa_valor DECIMAL(12,4) NOT NULL DEFAULT 0,
  capitalizacion INT NOT NULL DEFAULT 12,
  has_desgravamen BOOL NOT NULL DEFAULT TRUE,
  tasa_desgravamen DECIMAL(12,4) NOT NULL DEFAULT 0,
  has_seguro_vehicular BOOL NOT NULL DEFAULT TRUE,
  seguro_vehicular_pct DECIMAL(12,4) NOT NULL DEFAULT 0,
  has_portes BOOL NOT NULL DEFAULT TRUE,
  portes_valor DECIMAL(14,2) NOT NULL DEFAULT 0,
  activo BOOL NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_entidad_financiera) REFERENCES EntidadFinanciera(id_entidad_financiera)
);

CREATE TABLE Promocion (
  id_promocion VARCHAR(80) PRIMARY KEY,
  id_producto VARCHAR(80) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  valor DECIMAL(14,4) NOT NULL DEFAULT 0,
  activa BOOL NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_producto) REFERENCES ProductoFinanciero(id_producto) ON DELETE CASCADE
);

CREATE TABLE Credito (
  id_credito INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  id_user INT NOT NULL,
  id_vehiculo INT NOT NULL,
  fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nombre_simulacion VARCHAR(120),
  entidad_financiera VARCHAR(50),
  producto_financiero VARCHAR(80),
  tipo_moneda VARCHAR(10) NOT NULL,
  cuota_inicial DECIMAL(14,2) NOT NULL,
  metodo_pago VARCHAR(30) NOT NULL,
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

CREATE TABLE BankConfig (
  id_config INT AUTO_INCREMENT PRIMARY KEY,
  id_user INT NOT NULL UNIQUE,
  nombre_comercial VARCHAR(100),
  color_principal VARCHAR(20) DEFAULT '#e458c6',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_user) REFERENCES User(id_user)
);
