-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 06, 2026 at 02:51 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `museodeartecontemporaneo`
--

-- --------------------------------------------------------

--
-- Table structure for table `artista`
--

CREATE TABLE `artista` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `fechaNac` date DEFAULT NULL,
  `fechaFal` date DEFAULT NULL,
  `nacionalidad` varchar(50) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `fotografia` varchar(255) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') DEFAULT 'Activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asignacion_genero_artista`
--

CREATE TABLE `asignacion_genero_artista` (
  `id` int(11) NOT NULL,
  `artista_id` int(11) DEFAULT NULL,
  `genero_id` int(11) DEFAULT NULL,
  `añosExperiencia` int(11) DEFAULT NULL,
  `nivelMaestria` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asignacion_q_comprador`
--

CREATE TABLE `asignacion_q_comprador` (
  `Id` int(11) NOT NULL,
  `pregunta_id` int(11) DEFAULT NULL,
  `comprador_id` int(11) DEFAULT NULL,
  `respuesta` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `catalogopreguntas`
--

CREATE TABLE `catalogopreguntas` (
  `Id` int(11) NOT NULL,
  `pregunta` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `catalogopreguntas`
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
-- Table structure for table `ceramica`
--

CREATE TABLE `ceramica` (
  `obra_id` int(11) NOT NULL,
  `tipoArcilla` varchar(100) DEFAULT NULL,
  `temperaturaCoccion` float DEFAULT NULL,
  `tipoEsmalte` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `escultura`
--

CREATE TABLE `escultura` (
  `obra_id` int(11) NOT NULL,
  `material` varchar(100) DEFAULT NULL,
  `peso` float DEFAULT NULL,
  `largo` float DEFAULT NULL,
  `ancho` float DEFAULT NULL,
  `profundidad` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fotografia`
--

CREATE TABLE `fotografia` (
  `obra_id` int(11) NOT NULL,
  `tipo` varchar(100) DEFAULT NULL,
  `papel` varchar(100) DEFAULT NULL,
  `formato` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `genero`
--

CREATE TABLE `genero` (
  `Id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `genero`
--

INSERT INTO `genero` (`Id`, `nombre`) VALUES
(1, 'Pintura'),
(2, 'Escultura'),
(3, 'Fotografía'),
(4, 'Cerámica'),
(5, 'Orfebrería');

-- --------------------------------------------------------

--
-- Table structure for table `info_comprador`
--

CREATE TABLE `info_comprador` (
  `comprador_id` int(11) NOT NULL,
  `nroTarjeta` varchar(20) DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'Activo',
  `codigoSeguridad` varchar(10) DEFAULT NULL,
  `fechaGeneracion` date DEFAULT NULL,
  `nroIntentosCodigo` int(11) DEFAULT 0,
  `pais` varchar(50) DEFAULT NULL,
  `estado_residencia` varchar(50) DEFAULT NULL,
  `ciudad` varchar(50) DEFAULT NULL,
  `municipio` varchar(50) DEFAULT NULL,
  `calle` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `membresia`
--

CREATE TABLE `membresia` (
  `Id` int(11) NOT NULL,
  `comprador_id` int(11) DEFAULT NULL,
  `montoPagado` float DEFAULT 10,
  `fechaPago` date DEFAULT NULL,
  `estadoMembresia` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `obra`
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
  `foto` varchar(255) DEFAULT NULL,
  `reservado_por` int(11) DEFAULT NULL,
  `fecha_reserva` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orfebreria`
--

CREATE TABLE `orfebreria` (
  `obra_id` int(11) NOT NULL,
  `metal` varchar(100) DEFAULT NULL,
  `pureza` float DEFAULT NULL,
  `piedraPreciosa` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pintura`
--

CREATE TABLE `pintura` (
  `obra_id` int(11) NOT NULL,
  `tecnica` varchar(100) DEFAULT NULL,
  `soporte` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rol`
--

CREATE TABLE `rol` (
  `Id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rol`
--

INSERT INTO `rol` (`Id`, `nombre`) VALUES
(1, 'Administrador'),
(2, 'Comprador'),
(3, 'Superadmin');

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
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

-- --------------------------------------------------------

--
-- Table structure for table `venta`
--

CREATE TABLE `venta` (
  `id` int(11) NOT NULL,
  `comprador_id` int(11) DEFAULT NULL,
  `administrador_id` int(11) DEFAULT NULL,
  `obra_id` int(11) DEFAULT NULL,
  `codigoDeFactura` varchar(50) DEFAULT NULL,
  `iva` float DEFAULT NULL,
  `gananciaMuseoDolares` float DEFAULT NULL,
  `gananciaMuseoPorcentaje` float DEFAULT NULL CHECK (`gananciaMuseoPorcentaje` between 5 and 10),
  `precioFinalVenta` float DEFAULT NULL,
  `fechaDeVenta` date DEFAULT NULL,
  `empresaEnvio` varchar(100) DEFAULT NULL,
  `pais` varchar(50) DEFAULT 'Venezuela',
  `estado` varchar(50) NOT NULL,
  `ciudad` varchar(50) NOT NULL,
  `municipio` varchar(50) DEFAULT NULL,
  `calle` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `artista`
--
ALTER TABLE `artista`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `artista_nombre_apellido_unico` (`nombre`,`apellido`);

--
-- Indexes for table `asignacion_genero_artista`
--
ALTER TABLE `asignacion_genero_artista`
  ADD PRIMARY KEY (`id`),
  ADD KEY `artista_id` (`artista_id`),
  ADD KEY `genero_id` (`genero_id`);

--
-- Indexes for table `asignacion_q_comprador`
--
ALTER TABLE `asignacion_q_comprador`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `pregunta_id` (`pregunta_id`),
  ADD KEY `comprador_id` (`comprador_id`);

--
-- Indexes for table `catalogopreguntas`
--
ALTER TABLE `catalogopreguntas`
  ADD PRIMARY KEY (`Id`);

--
-- Indexes for table `ceramica`
--
ALTER TABLE `ceramica`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indexes for table `escultura`
--
ALTER TABLE `escultura`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indexes for table `fotografia`
--
ALTER TABLE `fotografia`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indexes for table `genero`
--
ALTER TABLE `genero`
  ADD PRIMARY KEY (`Id`);

--
-- Indexes for table `info_comprador`
--
ALTER TABLE `info_comprador`
  ADD PRIMARY KEY (`comprador_id`),
  ADD KEY `fk_info_usuario` (`comprador_id`);

--
-- Indexes for table `membresia`
--
ALTER TABLE `membresia`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `comprador_id` (`comprador_id`);

--
-- Indexes for table `obra`
--
ALTER TABLE `obra`
  ADD PRIMARY KEY (`id`),
  ADD KEY `genero_id` (`genero_id`),
  ADD KEY `autor_id` (`autor_id`);

--
-- Indexes for table `orfebreria`
--
ALTER TABLE `orfebreria`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indexes for table `pintura`
--
ALTER TABLE `pintura`
  ADD PRIMARY KEY (`obra_id`);

--
-- Indexes for table `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`Id`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `login` (`login`),
  ADD UNIQUE KEY `cedula` (`cedula`),
  ADD UNIQUE KEY `gmail` (`gmail`),
  ADD KEY `rol_id` (`rol_id`);

--
-- Indexes for table `venta`
--
ALTER TABLE `venta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `obra_id` (`obra_id`),
  ADD UNIQUE KEY `codigoDeFactura` (`codigoDeFactura`),
  ADD KEY `comprador_id` (`comprador_id`),
  ADD KEY `administrador_id` (`administrador_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `artista`
--
ALTER TABLE `artista`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `asignacion_genero_artista`
--
ALTER TABLE `asignacion_genero_artista`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `asignacion_q_comprador`
--
ALTER TABLE `asignacion_q_comprador`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `catalogopreguntas`
--
ALTER TABLE `catalogopreguntas`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `genero`
--
ALTER TABLE `genero`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `membresia`
--
ALTER TABLE `membresia`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `obra`
--
ALTER TABLE `obra`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rol`
--
ALTER TABLE `rol`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `venta`
--
ALTER TABLE `venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `asignacion_genero_artista`
--
ALTER TABLE `asignacion_genero_artista`
  ADD CONSTRAINT `asignacion_genero_artista_ibfk_1` FOREIGN KEY (`artista_id`) REFERENCES `artista` (`id`),
  ADD CONSTRAINT `asignacion_genero_artista_ibfk_2` FOREIGN KEY (`genero_id`) REFERENCES `genero` (`Id`);

--
-- Constraints for table `asignacion_q_comprador`
--
ALTER TABLE `asignacion_q_comprador`
  ADD CONSTRAINT `asignacion_q_comprador_ibfk_1` FOREIGN KEY (`pregunta_id`) REFERENCES `catalogopreguntas` (`Id`),
  ADD CONSTRAINT `asignacion_q_comprador_ibfk_2` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`);

--
-- Constraints for table `ceramica`
--
ALTER TABLE `ceramica`
  ADD CONSTRAINT `ceramica_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Constraints for table `escultura`
--
ALTER TABLE `escultura`
  ADD CONSTRAINT `escultura_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Constraints for table `fotografia`
--
ALTER TABLE `fotografia`
  ADD CONSTRAINT `fotografia_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Constraints for table `info_comprador`
--
ALTER TABLE `info_comprador`
  ADD CONSTRAINT `fk_info_usuario` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `membresia`
--
ALTER TABLE `membresia`
  ADD CONSTRAINT `membresia_ibfk_1` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`);

--
-- Constraints for table `obra`
--
ALTER TABLE `obra`
  ADD CONSTRAINT `obra_ibfk_1` FOREIGN KEY (`genero_id`) REFERENCES `genero` (`Id`),
  ADD CONSTRAINT `obra_ibfk_2` FOREIGN KEY (`autor_id`) REFERENCES `artista` (`id`);

--
-- Constraints for table `orfebreria`
--
ALTER TABLE `orfebreria`
  ADD CONSTRAINT `orfebreria_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Constraints for table `pintura`
--
ALTER TABLE `pintura`
  ADD CONSTRAINT `pintura_ibfk_1` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);

--
-- Constraints for table `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`Id`);

--
-- Constraints for table `venta`
--
ALTER TABLE `venta`
  ADD CONSTRAINT `venta_ibfk_1` FOREIGN KEY (`comprador_id`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `venta_ibfk_2` FOREIGN KEY (`administrador_id`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `venta_ibfk_3` FOREIGN KEY (`obra_id`) REFERENCES `obra` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
