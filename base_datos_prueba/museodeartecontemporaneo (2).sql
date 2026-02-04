-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-01-2026 a las 05:27:05
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `museodeartecontemporaneo`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `artista`
--

CREATE TABLE `artista` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `fechaNac` date DEFAULT NULL,
  `fechaFal` date DEFAULT NULL,
  `nacionalidad` varchar(50) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `fotografia` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `artista`
--

INSERT INTO `artista` (`id`, `nombre`, `apellido`, `fechaNac`, `fechaFal`, `nacionalidad`, `descripcion`, `fotografia`) VALUES
(1, 'Armando', 'Reverón', '1889-05-10', '1954-09-18', 'Venezolano', 'El loco de Macuto, maestro de la luz.', 'reveron.jpg'),
(2, 'Jesús', 'Soto', '1923-06-05', '2005-01-14', 'Venezolano', 'Maestro del arte cinético.', 'soto.jpg'),
(3, 'Carlos', 'Cruz-Diez', '1923-08-17', '2019-07-27', 'Venezolano', 'Explorador del fenómeno cromático.', 'cruz_diez.jpg'),
(4, 'Frida', 'Kahlo', '1907-07-06', '1954-07-13', 'Mexicana', 'Icono del surrealismo y autorretrato.', 'frida.jpg'),
(5, 'Fernando', 'Botero', '1932-04-19', '2023-09-15', 'Colombiano', 'Famoso por sus figuras volumétricas.', 'botero.jpg'),
(6, 'Alejandro', 'Otero', '1921-03-07', '2000-09-17', 'Venezolano', 'Creador de los Coloritmos.', 'otero.jpg'),
(7, 'Gego', 'Gertrud', '1912-06-08', '1994-09-17', 'Alemana-Venezolana', 'Escultora de estructuras reticulares.', 'gego.jpg'),
(8, 'Salvador', 'Dalí', '1904-05-11', '1989-01-23', 'Español', 'Máximo exponente del surrealismo.', 'dali.jpg'),
(9, 'Pablo', 'Picasso', '1881-10-25', '1973-04-08', 'Español', 'Fundador del cubismo.', 'picasso.jpg'),
(10, 'Andy', 'Warhol', '1928-08-06', '1987-02-22', 'Estadounidense', 'Figura central del Pop Art.', 'warhol.jpg');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignacion_genero_artista`
--

CREATE TABLE `asignacion_genero_artista` (
  `id` int(11) NOT NULL,
  `artista_id` int(11) DEFAULT NULL,
  `genero_id` int(11) DEFAULT NULL,
  `añosExperiencia` int(11) DEFAULT NULL,
  `nivelMaestria` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `asignacion_genero_artista`
--

INSERT INTO `asignacion_genero_artista` (`id`, `artista_id`, `genero_id`, `añosExperiencia`, `nivelMaestria`) VALUES
(1, 1, 1, 40, 'Maestro'),
(2, 2, 2, 50, 'Maestro'),
(3, 3, 1, 60, 'Maestro'),
(4, 3, 2, 60, 'Maestro'),
(5, 4, 1, 25, 'Experto'),
(6, 5, 4, 30, 'Experto'),
(7, 6, 2, 35, 'Maestro'),
(8, 7, 2, 45, 'Maestro'),
(9, 9, 5, 20, 'Especialista'),
(10, 10, 3, 30, 'Maestro');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignacion_q_comprador`
--

CREATE TABLE `asignacion_q_comprador` (
  `Id` int(11) NOT NULL,
  `pregunta_id` int(11) DEFAULT NULL,
  `comprador_id` int(11) DEFAULT NULL,
  `respuesta` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `asignacion_q_comprador`
--

INSERT INTO `asignacion_q_comprador` (`Id`, `pregunta_id`, `comprador_id`, `respuesta`) VALUES
(31, 1, 3, 'Toby'),
(32, 2, 3, 'Caracas'),
(33, 3, 3, 'Andrés Bello'),
(34, 4, 4, 'Rojo'),
(35, 5, 4, 'Ford'),
(36, 6, 4, 'Lucía'),
(37, 7, 5, 'Interstellar'),
(38, 8, 5, 'Thriller'),
(39, 9, 5, 'José'),
(40, 10, 6, 'Tenis'),
(41, 1, 6, 'Pelusa'),
(42, 2, 6, 'Valencia'),
(43, 3, 7, 'Simón Rodríguez'),
(44, 4, 7, 'Verde'),
(45, 5, 7, 'Chevrolet'),
(46, 6, 8, 'Carmen'),
(47, 7, 8, 'Titanic'),
(48, 8, 8, 'Bolero'),
(49, 9, 9, 'Ramón'),
(50, 10, 9, 'Fútbol'),
(51, 1, 9, 'Bruno'),
(52, 2, 10, 'Maracaibo'),
(53, 3, 10, 'República de Chile'),
(54, 4, 10, 'Amarillo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `catalogopreguntas`
--

CREATE TABLE `catalogopreguntas` (
  `Id` int(11) NOT NULL,
  `pregunta` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `catalogopreguntas`
--

INSERT INTO `catalogopreguntas` (`Id`, `pregunta`) VALUES
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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ceramica`
--

CREATE TABLE `ceramica` (
  `obra_id` int(11) NOT NULL,
  `tipoArcilla` varchar(100) DEFAULT NULL,
  `temperaturaCoccion` float DEFAULT NULL,
  `tipoEsmalte` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `ceramica`
--

INSERT INTO `ceramica` (`obra_id`, `tipoArcilla`, `temperaturaCoccion`, `tipoEsmalte`) VALUES
(6, 'Terracota', 950.5, 'Esmalte vidriado transparente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `escultura`
--

CREATE TABLE `escultura` (
  `obra_id` int(11) NOT NULL,
  `material` varchar(100) DEFAULT NULL,
  `peso` float DEFAULT NULL,
  `largo` float DEFAULT NULL,
  `ancho` float DEFAULT NULL,
  `profundidad` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `escultura`
--

INSERT INTO `escultura` (`obra_id`, `material`, `peso`, `largo`, `ancho`, `profundidad`) VALUES
(2, 'Aluminio', 45.5, 200, 200, 200),
(8, 'Hierro y Acero', 150, 300.5, 120, 100);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fotografia`
--

CREATE TABLE `fotografia` (
  `obra_id` int(11) NOT NULL,
  `tipo` varchar(100) DEFAULT NULL,
  `papel` varchar(100) DEFAULT NULL,
  `formato` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `fotografia`
--

INSERT INTO `fotografia` (`obra_id`, `tipo`, `papel`, `formato`) VALUES
(4, 'Serigrafía sobre papel', 'Papel de Fibra', '70x100cm'),
(10, 'Fotografía de exposición larga', 'Papel Mate', 'Digital Full Frame');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `genero`
--

CREATE TABLE `genero` (
  `Id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `genero`
--

INSERT INTO `genero` (`Id`, `nombre`) VALUES
(1, 'Pintura'),
(2, 'Escultura'),
(3, 'Fotografía'),
(4, 'Cerámica'),
(5, 'Orfebrería');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `info_comprador`
--

CREATE TABLE `info_comprador` (
  `Id` int(11) NOT NULL,
  `comprador_id` int(11) NOT NULL,
  `nroTarjeta` varchar(20) DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'Activo',
  `codigoSeguridad` varchar(10) DEFAULT NULL,
  `fechaGeneracion` date DEFAULT NULL,
  `nroIntentosCodigo` int(11) DEFAULT 0,
  `pais` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `info_comprador`
--

INSERT INTO `info_comprador` (`Id`, `comprador_id`, `nroTarjeta`, `estado`, `codigoSeguridad`, `fechaGeneracion`, `nroIntentosCodigo`, `pais`) VALUES
(21, 3, '4540-XXXX-XXXX-1234', 'Activo', '881', '2026-01-01', 0, 'Venezuela'),
(22, 4, '5412-XXXX-XXXX-5678', 'Activo', '223', '2026-01-02', 1, 'Venezuela'),
(23, 5, '3714-XXXX-XXXX-9012', 'Inactivo', '554', '2026-01-03', 0, 'Venezuela'),
(24, 6, '4026-XXXX-XXXX-3456', 'Activo', '112', '2026-01-04', 0, 'USA'),
(25, 7, '5105-XXXX-XXXX-7890', 'Activo', '998', '2026-01-05', 0, 'España'),
(26, 8, '4111-XXXX-XXXX-1111', 'Activo', '776', '2026-01-06', 2, 'Colombia'),
(27, 9, '5500-XXXX-XXXX-2222', 'Activo', '334', '2026-01-07', 0, 'México'),
(28, 10, '3400-XXXX-XXXX-3333', 'Activo', '121', '2026-01-08', 0, 'Venezuela');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `membresia`
--

CREATE TABLE `membresia` (
  `Id` int(11) NOT NULL,
  `comprador_id` int(11) DEFAULT NULL,
  `montoPagado` float DEFAULT 10,
  `fechaPago` date DEFAULT NULL,
  `estadoMembresia` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `membresia`
--

INSERT INTO `membresia` (`Id`, `comprador_id`, `montoPagado`, `fechaPago`, `estadoMembresia`) VALUES
(1, 3, 10, '2026-01-01', 1),
(2, 4, 10, '2026-01-02', 1),
(3, 5, 10, '2026-01-05', 0),
(4, 6, 15, '2026-01-07', 1),
(5, 7, 10, '2026-01-10', 1),
(6, 8, 10, '2026-01-12', 1),
(7, 9, 10, '2026-01-15', 1),
(8, 10, 10, '2026-01-18', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `obra`
--

CREATE TABLE `obra` (
  `id` int(11) NOT NULL,
  `genero_id` int(11) DEFAULT NULL,
  `autor_id` int(11) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `fechaCreacion` date DEFAULT NULL,
  `precioObra` float NOT NULL,
  `porcentajeGanancia` float DEFAULT NULL CHECK (`porcentajeGanancia` between 5 and 10),
  `estatus` enum('Disponible','Reservada','Vendida') DEFAULT 'Disponible',
  `foto` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `obra`
--

INSERT INTO `obra` (`id`, `genero_id`, `autor_id`, `nombre`, `fechaCreacion`, `precioObra`, `porcentajeGanancia`, `estatus`, `foto`) VALUES
(1, 1, 1, 'Luz tras la enramada', NULL, 5000, 10, 'Vendida', 'obra1.jpg'),
(2, 2, 2, 'Esfera Virtual', NULL, 12000, 8, 'Vendida', 'obra2.jpg'),
(3, 1, 3, 'Fisicromía 4', NULL, 8500, 7, 'Vendida', 'obra3.jpg'),
(4, 3, 10, 'Marilyn Monroe Print', NULL, 3000, 5, 'Vendida', 'obra4.jpg'),
(5, 5, 7, 'Reticulárea de Plata', NULL, 4500, 6, 'Vendida', 'obra5.jpg'),
(6, 4, 5, 'Vasija Volumétrica', NULL, 2000, 5, 'Vendida', 'obra6.jpg'),
(7, 1, 4, 'Las dos Fridas', NULL, 15000, 10, 'Vendida', 'obra7.jpg'),
(8, 2, 6, 'Solar de Otero', NULL, 11000, 9, 'Vendida', 'obra8.jpg'),
(9, 5, 9, 'Broche Cubista', NULL, 6000, 8, 'Vendida', 'obra9.jpg'),
(10, 3, 8, 'Persistencia del Tiempo (Foto)', NULL, 4000, 7, 'Vendida', 'obra10.jpg');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `orfebreria`
--

CREATE TABLE `orfebreria` (
  `obra_id` int(11) NOT NULL,
  `metal` varchar(100) DEFAULT NULL,
  `pureza` float DEFAULT NULL,
  `piedraPreciosa` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `orfebreria`
--

INSERT INTO `orfebreria` (`obra_id`, `metal`, `pureza`, `piedraPreciosa`) VALUES
(5, 'Plata', 950, 0),
(9, 'Oro', 18, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pintura`
--

CREATE TABLE `pintura` (
  `obra_id` int(11) NOT NULL,
  `tecnica` varchar(100) DEFAULT NULL,
  `soporte` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pintura`
--

INSERT INTO `pintura` (`obra_id`, `tecnica`, `soporte`) VALUES
(1, 'Óleo', 'Lienzo'),
(3, 'Acrílico', 'Aluminio'),
(7, 'Óleo', 'Lienzo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

CREATE TABLE `rol` (
  `Id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol`
--

INSERT INTO `rol` (`Id`, `nombre`) VALUES
(1, 'Administrador'),
(2, 'Comprador');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id` int(11) NOT NULL,
  `rol_id` int(11) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `cedula` varchar(20) DEFAULT NULL,
  `gmail` varchar(100) DEFAULT NULL,
  `login` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fechaRegistro` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id`, `rol_id`, `nombre`, `apellido`, `cedula`, `gmail`, `login`, `password`, `fechaRegistro`) VALUES
(1, 1, 'Admin', 'Uno', 'V11', 'admin1@museo.com', 'admin1', 'hash_pw1', '2026-01-01'),
(2, 1, 'Admin', 'Dos', 'V22', 'admin2@museo.com', 'admin2', 'hash_pw2', '2026-01-02'),
(3, 2, 'Juan', 'Pérez', 'V33', 'juan@mail.com', 'juanp', 'hash_pw3', '2026-01-05'),
(4, 2, 'Maria', 'García', 'V44', 'maria@mail.com', 'mariag', 'hash_pw4', '2026-01-06'),
(5, 2, 'Carlos', 'Luis', 'V55', 'carlos@mail.com', 'carlosl', 'hash_pw5', '2026-01-07'),
(6, 2, 'Ana', 'Sanz', 'V66', 'ana@mail.com', 'anas', 'hash_pw6', '2026-01-08'),
(7, 2, 'Luis', 'Gómez', 'V77', 'luis@mail.com', 'luisg', 'hash_pw7', '2026-01-09'),
(8, 2, 'Elena', 'Torres', 'V88', 'elena@mail.com', 'elenat', 'hash_pw8', '2026-01-10'),
(9, 2, 'Pedro', 'Rivas', 'V99', 'pedro@mail.com', 'pedror', 'hash_pw9', '2026-01-11'),
(10, 2, 'Rosa', 'Méndez', 'V1010', 'rosa@mail.com', 'rosam', 'hash_pw10', '2026-01-12');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `direccion` (NUEVA TABLA)
--
CREATE TABLE `direccion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pais` varchar(50) DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `ciudad` varchar(50) DEFAULT NULL,
  `calle` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `direccion` (`id`, `pais`, `estado`, `ciudad`, `calle`) VALUES
(1, 'Venezuela', 'Bolívar', 'Puerto Ordaz', 'Av. Las Américas'),
(2, 'Venezuela', 'Distrito Capital', 'Caracas', 'La Castellana'),
(3, 'Venezuela', 'Anzoátegui', 'Lechería', 'Av. Principal'),
(4, 'USA', 'Florida', 'Miami', 'Brickell Ave'),
(5, 'España', 'Madrid', 'Madrid', 'Calle Mayor'),
(6, 'Colombia', 'Antioquia', 'Medellín', 'El Poblado'),
(7, 'México', 'CDMX', 'Coyoacán', 'Calle Londres'),
(8, 'Venezuela', 'Zulia', 'Maracaibo', 'Calle 72'),
(9, 'Venezuela', 'Bolívar', 'San Félix', 'Av. Guayana'),
(10, 'Francia', 'Isla de Francia', 'París', 'Rue de Rivoli');

--
-- Estructura de tabla para la tabla `venta` (MODIFICADA)
--
CREATE TABLE `venta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comprador_id` int(11) DEFAULT NULL,
  `administrador_id` int(11) DEFAULT NULL,
  `obra_id` int(11) DEFAULT NULL,
  `direccion_id` int(11) DEFAULT NULL,
  `codigoDeFactura` varchar(50) DEFAULT NULL,
  `iva` float DEFAULT NULL,
  `gananciaMuseoDolares` float DEFAULT NULL,
  `gananciaMuseoPorcentaje` float DEFAULT NULL CHECK (`gananciaMuseoPorcentaje` between 5 and 10),
  `precioFinalVenta` float DEFAULT NULL,
  `fechaDeVenta` date DEFAULT NULL,
  `empresaEnvio` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `obra_id` (`obra_id`),
  UNIQUE KEY `codigoDeFactura` (`codigoDeFactura`),
  KEY `comprador_id` (`comprador_id`),
  KEY `administrador_id` (`administrador_id`),
  KEY `direccion_id` (`direccion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `venta` (`id`, `comprador_id`, `administrador_id`, `obra_id`, `direccion_id`, `codigoDeFactura`, `iva`, `gananciaMuseoDolares`, `gananciaMuseoPorcentaje`, `precioFinalVenta`, `fechaDeVenta`, `empresaEnvio`) VALUES
(1, 3, 1, 1, 1, 'FAC-001', 800, 500, 10, 6300, '2026-01-15', 'DHL'),
(2, 4, 1, 2, 2, 'FAC-002', 1920, 960, 8, 14880, '2026-01-16', 'FedEx'),
(3, 5, 2, 3, 3, 'FAC-003', 1360, 595, 7, 10455, '2026-01-17', 'Zoom'),
(4, 6, 1, 4, 4, 'FAC-004', 480, 150, 5, 3630, '2026-01-18', 'DHL'),
(5, 7, 2, 5, 5, 'FAC-005', 720, 270, 6, 5490, '2026-01-19', 'FedEx'),
(6, 8, 1, 6, 6, 'FAC-006', 320, 100, 5, 2420, '2026-01-20', 'Zoom'),
(7, 9, 2, 7, 7, 'FAC-007', 2400, 1500, 10, 18900, '2026-01-21', 'DHL'),
(8, 10, 1, 8, 8, 'FAC-008', 1760, 990, 9, 13750, '2026-01-22', 'FedEx'),
(9, 3, 2, 9, 9, 'FAC-009', 960, 480, 8, 7440, '2026-01-23', 'Zoom'),
(10, 4, 1, 10, 10, 'FAC-010', 640, 280, 7, 4920, '2026-01-24', 'DHL');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `artista`
--
ALTER TABLE `artista`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `asignacion_genero_artista`
--
ALTER TABLE `asignacion_genero_artista`
  ADD PRIMARY KEY (`id`),
  ADD KEY `artista_id` (`artista_id`),
  ADD KEY `genero_id` (`genero_id`);

--
-- Indices de la tabla `asignacion_q_comprador`
--
ALTER TABLE `asignacion_q_comprador`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `pregunta_id` (`pregunta_id`),
  ADD KEY `comprador_id` (`comprador_id`);

--
-- Indices de la tabla `catalogopreguntas`
--
ALTER TABLE `catalogopreguntas`
  ADD PRIMARY KEY (`Id`);

--
-- Indices de la tabla `ceramica`
--
ALTER TABLE `ceramica`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indices de la tabla `escultura`
--
ALTER TABLE `escultura`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indices de la tabla `fotografia`
--
ALTER TABLE `fotografia`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indices de la tabla `genero`
--
ALTER TABLE `genero`
  ADD PRIMARY KEY (`Id`);

--
-- Indices de la tabla `info_comprador`
--
ALTER TABLE `info_comprador`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `fk_info_usuario` (`comprador_id`);

--
-- Indices de la tabla `membresia`
--
ALTER TABLE `membresia`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `comprador_id` (`comprador_id`);

--
-- Indices de la tabla `obra`
--
ALTER TABLE `obra`
  ADD PRIMARY KEY (`id`),
  ADD KEY `genero_id` (`genero_id`),
  ADD KEY `autor_id` (`autor_id`);

--
-- Indices de la tabla `orfebreria`
--
ALTER TABLE `orfebreria`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indices de la tabla `pintura`
--
ALTER TABLE `pintura`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indices de la tabla `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`Id`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `login` (`login`),
  ADD UNIQUE KEY `cedula` (`cedula`),
  ADD UNIQUE KEY `gmail` (`gmail`),
  ADD KEY `rol_id` (`rol_id`);


--
-- AUTO_INCREMENT de la tabla `artista`
--
ALTER TABLE `artista`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `asignacion_genero_artista`
--
ALTER TABLE `asignacion_genero_artista`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `asignacion_q_comprador`
--
ALTER TABLE `asignacion_q_comprador`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT de la tabla `catalogopreguntas`
--
ALTER TABLE `catalogopreguntas`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `genero`
--
ALTER TABLE `genero`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `info_comprador`
--
ALTER TABLE `info_comprador`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT de la tabla `membresia`
--
ALTER TABLE `membresia`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `obra`
--
ALTER TABLE `obra`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `rol`
--
ALTER TABLE `rol`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `venta`
--
ALTER TABLE `venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asignacion_genero_artista`
--
ALTER TABLE `asignacion_genero_artista`
  ADD CONSTRAINT `asignacion_genero_artista_ibfk_1` FOREIGN KEY (`artista_id`) REFERENCES `artista` (`id`),
  ADD CONSTRAINT `asignacion_genero_artista_ibfk_2` FOREIGN KEY (`genero_id`) REFERENCES `genero` (`Id`);

--
-- Filtros para la tabla `asignacion_q_comprador`
--
ALTER TABLE `asignacion_q_comprador`
  ADD CONSTRAINT `asignacion_q_comprador_ibfk_1` FOREIGN KEY (`pregunta_id`) REFERENCES `catalogopreguntas` (`Id`),
  ADD CONSTRAINT `asignacion_q_comprador_ibfk_2` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`);

--
-- Filtros para la tabla `ceramica`
--
ALTER TABLE `ceramica`
  ADD CONSTRAINT `ceramica_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Filtros para la tabla `escultura`
--
ALTER TABLE `escultura`
  ADD CONSTRAINT `escultura_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Filtros para la tabla `fotografia`
--
ALTER TABLE `fotografia`
  ADD CONSTRAINT `fotografia_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Filtros para la tabla `info_comprador`
--
ALTER TABLE `info_comprador`
  ADD CONSTRAINT `fk_info_usuario` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `membresia`
--
ALTER TABLE `membresia`
  ADD CONSTRAINT `membresia_ibfk_1` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`);

--
-- Filtros para la tabla `obra`
--
ALTER TABLE `obra`
  ADD CONSTRAINT `obra_ibfk_1` FOREIGN KEY (`genero_id`) REFERENCES `genero` (`Id`),
  ADD CONSTRAINT `obra_ibfk_2` FOREIGN KEY (`autor_id`) REFERENCES `artista` (`id`);

--
-- Filtros para la tabla `orfebreria`
--
ALTER TABLE `orfebreria`
  ADD CONSTRAINT `orfebreria_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Filtros para la tabla `pintura`
--
ALTER TABLE `pintura`
  ADD CONSTRAINT `pintura_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`Id`);

--
-- Filtros para la tabla `venta`
--
ALTER TABLE `venta`
  ADD CONSTRAINT `venta_ibfk_1` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `venta_ibfk_2` FOREIGN KEY (`administrador_id`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `venta_ibfk_3` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`),
  ADD CONSTRAINT `venta_ibfk_4` FOREIGN KEY (`direccion_id`) REFERENCES `direccion` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
