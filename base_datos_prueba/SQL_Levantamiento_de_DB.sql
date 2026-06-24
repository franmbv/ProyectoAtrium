-- ====================================================================
-- SCRIPT DE CREACIÓN ESTRUCTURAL - POSTGRESQL (NEON.TECH)
-- ====================================================================

-- 1. LIMPIEZA DE TABLAS EXISTENTES EN CASCADA
DROP TABLE IF EXISTS asignacion_q_comprador CASCADE;
DROP TABLE IF EXISTS catalogopreguntas CASCADE;
DROP TABLE IF EXISTS membresia CASCADE;
DROP TABLE IF EXISTS info_comprador CASCADE;
DROP TABLE IF EXISTS venta CASCADE;
DROP TABLE IF EXISTS ceramica CASCADE;
DROP TABLE IF EXISTS escultura CASCADE;
DROP TABLE IF EXISTS fotografia CASCADE;
DROP TABLE IF EXISTS orfebreria CASCADE;
DROP TABLE IF EXISTS pintura CASCADE;
DROP TABLE IF EXISTS obra CASCADE;
DROP TABLE IF EXISTS asignacion_genero_artista CASCADE;
DROP TABLE IF EXISTS artista CASCADE;
DROP TABLE IF EXISTS genero CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS rol CASCADE;

-- 2. CREACIÓN DE TABLAS EN ORDEN DE DEPENDENCIAS

-- Tabla: rol
CREATE TABLE rol (
    Id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- Tabla: usuario
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    rol_id INT REFERENCES rol(Id),
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    cedula VARCHAR(20) UNIQUE,
    gmail VARCHAR(100) UNIQUE,
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fechaRegistro DATE DEFAULT CURRENT_DATE,
    ultima_conexion TIMESTAMP DEFAULT NULL,
    estado VARCHAR(20) DEFAULT 'Activo'
);

-- Tabla: artista
CREATE TABLE artista (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) DEFAULT NULL,
    apellido VARCHAR(100) DEFAULT NULL,
    fechaNac DATE DEFAULT NULL,
    fechaFal DATE DEFAULT NULL,
    nacionalidad VARCHAR(50) DEFAULT NULL,
    descripcion TEXT DEFAULT NULL,
    fotografia VARCHAR(255) DEFAULT NULL,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
    CONSTRAINT artista_nombre_apellido_unico UNIQUE (nombre, apellido)
);

-- Tabla: genero
CREATE TABLE genero (
    Id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- Tabla: catalogopreguntas
CREATE TABLE catalogopreguntas (
    Id SERIAL PRIMARY KEY,
    pregunta VARCHAR(255) NOT NULL
);

-- Tabla: asignacion_genero_artista
CREATE TABLE asignacion_genero_artista (
    id SERIAL PRIMARY KEY,
    artista_id INT REFERENCES artista(id) ON DELETE CASCADE,
    genero_id INT REFERENCES genero(Id) ON DELETE CASCADE,
    añosExperiencia INT,
    nivelMaestria VARCHAR(50)
);

-- Tabla: asignacion_q_comprador
CREATE TABLE asignacion_q_comprador (
    Id SERIAL PRIMARY KEY,
    pregunta_id INT REFERENCES catalogopreguntas(Id) ON DELETE CASCADE,
    comprador_id INT REFERENCES usuario(id) ON DELETE CASCADE,
    respuesta VARCHAR(255) DEFAULT NULL
);

-- Tabla: info_comprador
CREATE TABLE info_comprador (
    comprador_id INT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    nroTarjeta VARCHAR(20) DEFAULT NULL,
    estado VARCHAR(20) DEFAULT 'Activo',
    codigoSeguridad VARCHAR(10) DEFAULT NULL,
    fechaGeneracion DATE DEFAULT CURRENT_DATE,
    nroIntentosCodigo INT DEFAULT 0,
    pais VARCHAR(50) DEFAULT 'Venezuela',
    estado_residencia VARCHAR(50) DEFAULT 'Pendiente',
    ciudad VARCHAR(50) DEFAULT 'Pendiente',
    municipio VARCHAR(50) DEFAULT 'Pendiente',
    calle VARCHAR(100) DEFAULT 'Pendiente'
);

-- Tabla: membresia
CREATE TABLE membresia (
    Id SERIAL PRIMARY KEY,
    comprador_id INT REFERENCES usuario(id) ON DELETE CASCADE,
    montoPagado FLOAT DEFAULT 10,
    fechaPago DATE DEFAULT CURRENT_DATE,
    estadoMembresia SMALLINT DEFAULT 1
);

-- Tabla: obra
CREATE TABLE obra (
    id SERIAL PRIMARY KEY,
    genero_id INT REFERENCES genero(Id),
    autor_id INT REFERENCES artista(id),
    nombre VARCHAR(150) NOT NULL,
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    precioObra FLOAT NOT NULL,
    porcentajeGanancia FLOAT CHECK (porcentajeGanancia BETWEEN 5 AND 10),
    estatus VARCHAR(20) DEFAULT 'Disponible' CHECK (estatus IN ('Disponible', 'Reservada', 'Vendida')),
    foto VARCHAR(255) DEFAULT NULL,
    reservado_por INT REFERENCES usuario(id) DEFAULT NULL,
    fecha_reserva DATE DEFAULT NULL
);

-- Tabla: ceramica
CREATE TABLE ceramica (
    obra_id INT PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
    tipoArcilla VARCHAR(100) DEFAULT NULL,
    temperaturaCoccion FLOAT DEFAULT NULL,
    tipoEsmalte VARCHAR(100) DEFAULT NULL
);

-- Tabla: escultura
CREATE TABLE escultura (
    obra_id INT PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
    material VARCHAR(100) DEFAULT NULL,
    peso FLOAT DEFAULT NULL,
    largo FLOAT DEFAULT NULL,
    ancho FLOAT DEFAULT NULL,
    profundidad FLOAT DEFAULT NULL
);

-- Tabla: fotografia
CREATE TABLE fotografia (
    obra_id INT PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
    tipo VARCHAR(100) DEFAULT NULL,
    papel VARCHAR(100) DEFAULT NULL,
    formato VARCHAR(100) DEFAULT NULL
);

-- Tabla: orfebreria
CREATE TABLE orfebreria (
    obra_id INT PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
    metal VARCHAR(100) DEFAULT NULL,
    pureza FLOAT DEFAULT NULL,
    piedraPreciosa SMALLINT DEFAULT NULL
);

-- Tabla: pintura
CREATE TABLE pintura (
    obra_id INT PRIMARY KEY REFERENCES obra(id) ON DELETE CASCADE,
    tecnica VARCHAR(100) DEFAULT NULL,
    soporte VARCHAR(100) DEFAULT NULL
);

-- Tabla: venta
CREATE TABLE venta (
    id SERIAL PRIMARY KEY,
    comprador_id INT REFERENCES usuario(id),
    administrador_id INT REFERENCES usuario(id),
    obra_id INT REFERENCES obra(id) UNIQUE,
    codigoDeFactura VARCHAR(50) UNIQUE DEFAULT NULL,
    iva FLOAT DEFAULT NULL,
    gananciaMuseoDolares FLOAT DEFAULT NULL,
    gananciaMuseoPorcentaje FLOAT CHECK (gananciaMuseoPorcentaje BETWEEN 5 AND 10),
    precioFinalVenta FLOAT DEFAULT NULL,
    fechaDeVenta DATE DEFAULT CURRENT_DATE,
    empresaEnvio VARCHAR(100) DEFAULT NULL,
    pais VARCHAR(50) DEFAULT 'Venezuela',
    estado VARCHAR(50) NOT NULL,
    ciudad VARCHAR(50) NOT NULL,
    municipio VARCHAR(50) DEFAULT NULL,
    calle VARCHAR(100) NOT NULL
);

-- 3. INSERCIÓN DE VALORES MAESTROS OBLIGATORIOS Y ADMINISTRADOR

-- Insertar roles
INSERT INTO rol (Id, nombre) VALUES 
(1, 'Administrador'),
(2, 'Comprador'),
(3, 'Superadmin');

-- Insertar catálogo de preguntas de seguridad obligatorias
INSERT INTO catalogopreguntas (Id, pregunta) VALUES 
(1, '¿Nombre de tu primera mascota?'),
(2, '¿Ciudad de nacimiento de tu madre?'),
(3, '¿Nombre de tu escuela primaria?'),
(4, '¿Color favorito?'),
(5, '¿Marca de tu primer carro?'),
(6, '¿Nombre de tu mejor amigo de la infancia?'),
(7, '¿Película favorita?'),
(8, '¿Canción favorita?'),
(9, '¿Nombre de tu abuelo paterno?'),
(10, '¿Deporte favorito?');

-- Insertar el Administrador principal (Rango de Superadmin - Rol 3)
-- Login: admin_atrium
-- Password: admin123 (encriptado de forma compatible con su bcryptjs local)
INSERT INTO usuario (rol_id, nombre, apellido, cedula, gmail, login, password) VALUES 
(3, 'Administrador', 'Atrium', 'V-00000000', 'admin@atrium.com', 'admin_atrium', '$2b$10$y/mn0OCZegdBWc0V6ReRXuKwvfyVlDvxDGxwzeTXMXkP66OCzhu4W');

COMMIT;