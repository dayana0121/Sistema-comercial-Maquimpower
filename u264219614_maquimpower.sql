-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 25-03-2026 a las 14:57:16
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
-- Base de datos: `u264219614_maquimpower`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `caja_movimientos`
--

CREATE TABLE `caja_movimientos` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `tipo` varchar(20) NOT NULL,
  `origen` varchar(30) DEFAULT NULL,
  `referencia_id` char(36) DEFAULT NULL,
  `referencia_numero` varchar(50) DEFAULT NULL,
  `monto` decimal(12,2) NOT NULL,
  `forma_pago` varchar(30) DEFAULT NULL,
  `saldo_anterior` decimal(12,2) NOT NULL DEFAULT 0.00,
  `saldo_nuevo` decimal(12,2) NOT NULL DEFAULT 0.00,
  `descripcion` text DEFAULT NULL,
  `fecha` date NOT NULL DEFAULT curdate(),
  `usuario_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `caja_movimientos`
--

INSERT INTO `caja_movimientos` (`id`, `tipo`, `origen`, `referencia_id`, `referencia_numero`, `monto`, `forma_pago`, `saldo_anterior`, `saldo_nuevo`, `descripcion`, `fecha`, `usuario_id`, `created_at`) VALUES
('107d9118-27c4-11f1-9fa5-d843aea88809', 'INGRESO', 'MANUAL', NULL, NULL, 500.00, 'EFECTIVO', 500.00, 1000.00, 'Test ingreso automatizado', '2026-03-24', NULL, '2026-03-24 15:57:26'),
('107eea8f-27c4-11f1-9fa5-d843aea88809', 'EGRESO', 'GASTO', NULL, NULL, 100.00, 'YAPE', 1000.00, 900.00, 'Test egreso', '2026-03-24', NULL, '2026-03-24 15:57:26'),
('12a48125-27c5-11f1-9fa5-d843aea88809', 'INGRESO', 'MANUAL', NULL, NULL, 500.00, 'EFECTIVO', 1800.00, 2300.00, 'Test ingreso automatizado', '2026-03-24', NULL, '2026-03-24 16:04:40'),
('12a6e3cb-27c5-11f1-9fa5-d843aea88809', 'EGRESO', 'GASTO', NULL, NULL, 100.00, 'YAPE', 2300.00, 2200.00, 'Test egreso', '2026-03-24', NULL, '2026-03-24 16:04:40'),
('3fc14674-27c4-11f1-9fa5-d843aea88809', 'INGRESO', 'MANUAL', NULL, NULL, 500.00, 'EFECTIVO', 900.00, 1400.00, 'Test ingreso automatizado', '2026-03-24', NULL, '2026-03-24 15:58:46'),
('3fc56ee9-27c4-11f1-9fa5-d843aea88809', 'EGRESO', 'GASTO', NULL, NULL, 100.00, 'YAPE', 1400.00, 1300.00, 'Test egreso', '2026-03-24', NULL, '2026-03-24 15:58:46'),
('45142f2a-24ba-11f1-8aa8-d843aea88809', 'INGRESO', 'MANUAL', NULL, NULL, 500.00, 'EFECTIVO', 0.00, 500.00, 'Test ingreso automatizado', '2026-03-20', NULL, '2026-03-20 19:09:46'),
('4518f773-24ba-11f1-8aa8-d843aea88809', 'EGRESO', 'GASTO', NULL, NULL, 100.00, 'YAPE', 500.00, 400.00, 'Test egreso', '2026-03-20', NULL, '2026-03-20 19:09:46'),
('a72cba75-27c4-11f1-9fa5-d843aea88809', 'INGRESO', 'MANUAL', NULL, NULL, 500.00, 'EFECTIVO', 1400.00, 1900.00, 'Test ingreso automatizado', '2026-03-24', NULL, '2026-03-24 16:01:39'),
('a7318e00-27c4-11f1-9fa5-d843aea88809', 'EGRESO', 'GASTO', NULL, NULL, 100.00, 'YAPE', 1900.00, 1800.00, 'Test egreso', '2026-03-24', NULL, '2026-03-24 16:01:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `nombre` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `tipo_documento` varchar(10) NOT NULL,
  `numero_documento` varchar(20) NOT NULL,
  `razon_social` varchar(500) NOT NULL,
  `nombre_comercial` varchar(500) DEFAULT NULL,
  `direccion_fiscal` text DEFAULT NULL,
  `ubigeo` varchar(6) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `distrito` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `contacto_nombre` varchar(255) DEFAULT NULL,
  `limite_credito` decimal(12,2) NOT NULL DEFAULT 0.00,
  `dias_credito` int(11) NOT NULL DEFAULT 0,
  `categoria_cliente` varchar(20) NOT NULL DEFAULT 'REGULAR',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` char(36) DEFAULT NULL,
  `legacy_id` varchar(50) DEFAULT NULL,
  `legacy_sync_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `tipo_documento`, `numero_documento`, `razon_social`, `nombre_comercial`, `direccion_fiscal`, `ubigeo`, `departamento`, `provincia`, `distrito`, `telefono`, `email`, `contacto_nombre`, `limite_credito`, `dias_credito`, `categoria_cliente`, `activo`, `created_at`, `updated_at`, `created_by`, `legacy_id`, `legacy_sync_date`) VALUES
('0e8b6541-27c4-11f1-9fa5-d843aea88809', 'RUC', '20385843612', 'EMPRESA TEST AUTO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', NULL, NULL, 0.00, 0, 'REGULAR', 0, '2026-03-24 15:57:23', '2026-03-24 15:57:23', NULL, NULL, NULL),
('0f8c58a8-27c5-11f1-9fa5-d843aea88809', 'RUC', '20386274794', 'EMPRESA TEST AUTO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', NULL, NULL, 0.00, 0, 'REGULAR', 0, '2026-03-24 16:04:34', '2026-03-24 16:04:34', NULL, NULL, NULL),
('2ba40c06-24a7-11f1-8aa8-d843aea88809', 'RUC', '20043583547', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 16:53:03', '2026-03-20 16:53:03', NULL, NULL, NULL),
('32fbf0e8-24ab-11f1-8aa8-d843aea88809', 'RUC', '20045313829', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 17:21:53', '2026-03-20 17:21:53', NULL, NULL, NULL),
('3df469ab-27c4-11f1-9fa5-d843aea88809', 'RUC', '20385923152', 'EMPRESA TEST AUTO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', NULL, NULL, 0.00, 0, 'REGULAR', 0, '2026-03-24 15:58:43', '2026-03-24 15:58:43', NULL, NULL, NULL),
('43ba13c9-24ba-11f1-8aa8-d843aea88809', 'RUC', '20051784383', 'EMPRESA TEST AUTO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', NULL, NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 19:09:44', '2026-03-20 19:09:44', NULL, NULL, NULL),
('65ea566e-24b8-11f1-8aa8-d843aea88809', 'RUC', '20050982760', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 18:56:22', '2026-03-20 18:56:22', NULL, NULL, NULL),
('6e36684a-2256-11f1-8415-d843aea88809', 'RUC', '20789003657', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:10:03', '2026-03-17 18:10:03', NULL, NULL, NULL),
('76eab113-2256-11f1-8415-d843aea88809', 'RUC', '20789018267', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:10:18', '2026-03-17 18:10:18', NULL, NULL, NULL),
('8a6cf97a-2256-11f1-8415-d843aea88809', 'RUC', '20789050997', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:10:51', '2026-03-17 18:10:51', NULL, NULL, NULL),
('a54d1b9c-27c4-11f1-9fa5-d843aea88809', 'RUC', '20386096541', 'EMPRESA TEST AUTO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', NULL, NULL, 0.00, 0, 'REGULAR', 0, '2026-03-24 16:01:36', '2026-03-24 16:01:36', NULL, NULL, NULL),
('aed87518-2255-11f1-8415-d843aea88809', 'RUC', '20788682602', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:04:42', '2026-03-17 18:04:42', NULL, NULL, NULL),
('b3d0e6c6-1ca5-11f1-977b-d843aea88809', '6', '20606853182', 'CORPORACION MAQUIMSA E.I.R.L.', '', 'AV. GUANABANAS MZA. 112 LOTE 29 A.H. ENRIQUE MILLA OCHOA ', '', 'LIMA', 'LIMA', 'LOS OLIVOS', '934231881', 'burgu@gmail.com', '', 0.00, 0, 'REGULAR', 1, '2026-03-10 12:22:23', '2026-03-20 17:43:38', NULL, NULL, NULL),
('b644fb47-2255-11f1-8415-d843aea88809', 'RUC', '20788695058', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:04:55', '2026-03-17 18:04:55', NULL, NULL, NULL),
('bdfef640-2254-11f1-8415-d843aea88809', 'RUC', '20788278524', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '999000000', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 1, '2026-03-17 17:57:58', '2026-03-17 17:57:58', NULL, NULL, NULL),
('c2faad12-2258-11f1-8415-d843aea88809', 'RUC', '20790004872', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:26:44', '2026-03-17 18:26:44', NULL, NULL, NULL),
('c9dbc822-2255-11f1-8415-d843aea88809', 'RUC', '20788727913', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:05:27', '2026-03-17 18:05:27', NULL, NULL, NULL),
('caa26be2-2257-11f1-8415-d843aea88809', 'RUC', '20789588228', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:19:48', '2026-03-17 18:19:48', NULL, NULL, NULL),
('d2a56504-2257-11f1-8415-d843aea88809', 'RUC', '20789601649', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:20:01', '2026-03-17 18:20:01', NULL, NULL, NULL),
('d413c425-24b4-11f1-8aa8-d843aea88809', 'RUC', '20049449572', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 18:30:49', '2026-03-20 18:30:49', NULL, NULL, NULL),
('dab8c783-24a2-11f1-8aa8-d843aea88809', 'RUC', '20041729789', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 16:22:09', '2026-03-20 16:22:09', NULL, NULL, NULL),
('e31021fa-24a1-11f1-8aa8-d843aea88809', 'RUC', '20041314297', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 16:15:14', '2026-03-20 16:15:14', NULL, NULL, NULL),
('eda3ce81-2257-11f1-8415-d843aea88809', 'RUC', '20789646948', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:20:46', '2026-03-17 18:20:47', NULL, NULL, NULL),
('f28b3473-24aa-11f1-8aa8-d843aea88809', 'RUC', '20045205730', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-20 17:20:05', '2026-03-20 17:20:05', NULL, NULL, NULL),
('f6dea259-2257-11f1-8415-d843aea88809', 'RUC', '20789662421', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:21:02', '2026-03-17 18:21:02', NULL, NULL, NULL),
('faa34a90-2258-11f1-8415-d843aea88809', 'RUC', '20790098251', 'EMPRESA TEST AUTOMATICO S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, '988000001', 'test@autotest.com', NULL, 0.00, 0, 'REGULAR', 0, '2026-03-17 18:28:18', '2026-03-17 18:28:18', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `proveedor_id` char(36) NOT NULL,
  `tipo_comprobante` varchar(20) DEFAULT NULL,
  `numero_comprobante` varchar(50) DEFAULT NULL,
  `fecha_comprobante` date NOT NULL DEFAULT curdate(),
  `fecha_vencimiento` date DEFAULT NULL,
  `op_gravada` decimal(12,2) NOT NULL DEFAULT 0.00,
  `igv` decimal(12,2) NOT NULL DEFAULT 0.00,
  `importe_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `moneda` varchar(3) NOT NULL DEFAULT 'PEN',
  `estado` varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  `estado_pago` varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  `monto_pagado` decimal(12,2) NOT NULL DEFAULT 0.00,
  `observacion` text DEFAULT NULL,
  `usuario_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `compras`
--

INSERT INTO `compras` (`id`, `proveedor_id`, `tipo_comprobante`, `numero_comprobante`, `fecha_comprobante`, `fecha_vencimiento`, `op_gravada`, `igv`, `importe_total`, `moneda`, `estado`, `estado_pago`, `monto_pagado`, `observacion`, `usuario_id`, `created_at`, `updated_at`) VALUES
('10692171-27c4-11f1-9fa5-d843aea88809', '5f3217c2-24b6-11f1-8aa8-d843aea88809', 'FACTURA', 'F001-TEST-46754', '2026-03-24', NULL, 500.00, 90.00, 590.00, 'PEN', 'ANULADO', 'PENDIENTE', 0.00, NULL, NULL, '2026-03-24 15:57:26', '2026-03-24 15:57:26'),
('128cc4e9-27c5-11f1-9fa5-d843aea88809', '5f3217c2-24b6-11f1-8aa8-d843aea88809', 'FACTURA', 'F001-TEST-79829', '2026-03-24', NULL, 500.00, 90.00, 590.00, 'PEN', 'ANULADO', 'PENDIENTE', 0.00, NULL, NULL, '2026-03-24 16:04:39', '2026-03-24 16:04:39'),
('3fabfd11-27c4-11f1-9fa5-d843aea88809', '5f3217c2-24b6-11f1-8aa8-d843aea88809', 'FACTURA', 'F001-TEST-26046', '2026-03-24', NULL, 500.00, 90.00, 590.00, 'PEN', 'ANULADO', 'PENDIENTE', 0.00, NULL, NULL, '2026-03-24 15:58:46', '2026-03-24 15:58:46'),
('44fc3b7e-24ba-11f1-8aa8-d843aea88809', '5f3217c2-24b6-11f1-8aa8-d843aea88809', 'FACTURA', 'F001-TEST-86493', '2026-03-21', NULL, 500.00, 90.00, 590.00, 'PEN', 'ANULADO', 'PENDIENTE', 0.00, NULL, NULL, '2026-03-20 19:09:46', '2026-03-20 19:09:46'),
('904f52cd-24b6-11f1-8aa8-d843aea88809', '5f3217c2-24b6-11f1-8aa8-d843aea88809', 'FACTURA', 'F001-00001', '2026-03-20', NULL, 260.00, 46.80, 306.80, 'PEN', 'PENDIENTE', 'PENDIENTE', 0.00, '', NULL, '2026-03-20 18:43:14', '2026-03-20 18:43:14'),
('a714d502-27c4-11f1-9fa5-d843aea88809', '5f3217c2-24b6-11f1-8aa8-d843aea88809', 'FACTURA', 'F001-TEST-99526', '2026-03-24', NULL, 500.00, 90.00, 590.00, 'PEN', 'ANULADO', 'PENDIENTE', 0.00, NULL, NULL, '2026-03-24 16:01:39', '2026-03-24 16:01:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras_detalle`
--

CREATE TABLE `compras_detalle` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `compra_id` char(36) NOT NULL,
  `item` int(11) NOT NULL,
  `producto_id` char(36) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `unidad_medida` varchar(10) NOT NULL DEFAULT 'NIU',
  `cantidad` decimal(12,3) NOT NULL,
  `costo_unitario` decimal(12,4) NOT NULL,
  `igv_item` decimal(12,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(12,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `compras_detalle`
--

INSERT INTO `compras_detalle` (`id`, `compra_id`, `item`, `producto_id`, `descripcion`, `unidad_medida`, `cantidad`, `costo_unitario`, `igv_item`, `subtotal`, `created_at`) VALUES
('106940f2-27c4-11f1-9fa5-d843aea88809', '10692171-27c4-11f1-9fa5-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'Producto test compra', 'NIU', 10.000, 50.0000, 90.00, 500.00, '2026-03-24 15:57:26'),
('128cd8e4-27c5-11f1-9fa5-d843aea88809', '128cc4e9-27c5-11f1-9fa5-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'Producto test compra', 'NIU', 10.000, 50.0000, 90.00, 500.00, '2026-03-24 16:04:39'),
('3fac1fcf-27c4-11f1-9fa5-d843aea88809', '3fabfd11-27c4-11f1-9fa5-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'Producto test compra', 'NIU', 10.000, 50.0000, 90.00, 500.00, '2026-03-24 15:58:46'),
('44fc9f97-24ba-11f1-8aa8-d843aea88809', '44fc3b7e-24ba-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'Producto test compra', 'NIU', 10.000, 50.0000, 90.00, 500.00, '2026-03-20 19:09:46'),
('904f763e-24b6-11f1-8aa8-d843aea88809', '904f52cd-24b6-11f1-8aa8-d843aea88809', 1, 'd42b59e6-24b4-11f1-8aa8-d843aea88809', 'Producto de prueba automatizada TEST-449735e5i', 'NIU', 1.000, 120.0000, 21.60, 120.00, '2026-03-20 18:43:14'),
('904fd338-24b6-11f1-8aa8-d843aea88809', '904f52cd-24b6-11f1-8aa8-d843aea88809', 2, 'dad0b595-24a2-11f1-8aa8-d843aea88809', 'Producto de prueba automatizada TEST-72994529p', 'NIU', 1.000, 140.0000, 25.20, 140.00, '2026-03-20 18:43:14'),
('a714e63b-27c4-11f1-9fa5-d843aea88809', 'a714d502-27c4-11f1-9fa5-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'Producto test compra', 'NIU', 10.000, 50.0000, 90.00, 500.00, '2026-03-24 16:01:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_empresa`
--

CREATE TABLE `configuracion_empresa` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `ruc` varchar(11) NOT NULL,
  `razon_social` varchar(500) NOT NULL,
  `nombre_comercial` varchar(500) DEFAULT NULL,
  `ubigeo` varchar(6) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `distrito` varchar(100) DEFAULT NULL,
  `direccion_fiscal` text DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `web` varchar(255) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `sunat_modo` varchar(10) NOT NULL DEFAULT 'beta',
  `sunat_sol_usuario` varchar(100) DEFAULT NULL,
  `sunat_sol_clave` varchar(255) DEFAULT NULL,
  `sunat_cert_path` text DEFAULT NULL,
  `sunat_key_path` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_empresa`
--

INSERT INTO `configuracion_empresa` (`id`, `ruc`, `razon_social`, `nombre_comercial`, `ubigeo`, `departamento`, `provincia`, `distrito`, `direccion_fiscal`, `telefono`, `email`, `web`, `logo_url`, `sunat_modo`, `sunat_sol_usuario`, `sunat_sol_clave`, `sunat_cert_path`, `sunat_key_path`, `created_at`, `updated_at`) VALUES
('e4aca10a-1a66-11f1-96c5-5ccceb374ee4', '20606853182', 'CORPORACION MAQUIMSA E.I.R.L', 'MAQUIMPOWER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'beta', NULL, NULL, NULL, NULL, '2026-03-07 20:47:45', '2026-03-07 20:47:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_movimientos`
--

CREATE TABLE `inventario_movimientos` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `producto_id` char(36) NOT NULL,
  `tipo_movimiento` varchar(20) NOT NULL,
  `cantidad` decimal(12,3) NOT NULL,
  `stock_anterior` decimal(12,3) NOT NULL,
  `stock_nuevo` decimal(12,3) NOT NULL,
  `motivo` text DEFAULT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `usuario_email` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `inventario_movimientos`
--

INSERT INTO `inventario_movimientos` (`id`, `producto_id`, `tipo_movimiento`, `cantidad`, `stock_anterior`, `stock_nuevo`, `motivo`, `referencia`, `usuario_email`, `created_at`) VALUES
('0ec46c4f-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 5.000, 137.000, 142.000, 'Test entrada v2', NULL, NULL, '2026-03-24 15:57:24'),
('0ec82327-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 2.000, 142.000, 140.000, 'Test entrada v2', NULL, NULL, '2026-03-24 15:57:24'),
('106962a7-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 140.000, 150.000, 'Compra: F001-TEST-46754', '10692171-27c4-11f1-9fa5-d843aea88809', NULL, '2026-03-24 15:57:26'),
('10a8d927-27c5-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 5.000, 176.000, 181.000, 'Test entrada v2', NULL, NULL, '2026-03-24 16:04:36'),
('10ad950d-27c5-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 2.000, 181.000, 179.000, 'Test entrada v2', NULL, NULL, '2026-03-24 16:04:36'),
('128ceb8e-27c5-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 179.000, 189.000, 'Compra: F001-TEST-79829', '128cc4e9-27c5-11f1-9fa5-d843aea88809', NULL, '2026-03-24 16:04:39'),
('2c31684b-24a7-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 89.000, 99.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 16:53:04'),
('2c32b2f7-24a7-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 99.000, 96.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 16:53:04'),
('33879b84-24ab-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 103.000, 113.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 17:21:54'),
('338c4532-24ab-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 113.000, 110.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 17:21:54'),
('3e2a9ad2-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 5.000, 150.000, 155.000, 'Test entrada v2', NULL, NULL, '2026-03-24 15:58:43'),
('3e2f5446-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 2.000, 155.000, 153.000, 'Test entrada v2', NULL, NULL, '2026-03-24 15:58:43'),
('3fac3267-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 153.000, 163.000, 'Compra: F001-TEST-26046', '3fabfd11-27c4-11f1-9fa5-d843aea88809', NULL, '2026-03-24 15:58:46'),
('44486ba9-24ba-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 5.000, 124.000, 129.000, 'Test entrada v2', NULL, NULL, '2026-03-20 19:09:45'),
('444d14a7-24ba-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 2.000, 129.000, 127.000, 'Test entrada v2', NULL, NULL, '2026-03-20 19:09:45'),
('44fcb9eb-24ba-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 127.000, 137.000, 'Compra: F001-TEST-86493', '44fc3b7e-24ba-11f1-8aa8-d843aea88809', NULL, '2026-03-20 19:09:46'),
('6672ad8f-24b8-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 117.000, 127.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 18:56:23'),
('66774eb3-24b8-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 127.000, 124.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 18:56:23'),
('6ec0fbcd-2256-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 12.000, 22.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:10:04'),
('6ec5c887-2256-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 22.000, 19.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:10:04'),
('775af75d-2256-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 19.000, 29.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:10:19'),
('775f312c-2256-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 29.000, 26.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:10:19'),
('8af2e296-2256-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 26.000, 36.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:10:51'),
('8af67967-2256-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 36.000, 33.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:10:51'),
('904fcb8e-24b6-11f1-8aa8-d843aea88809', 'd42b59e6-24b4-11f1-8aa8-d843aea88809', 'ENTRADA', 1.000, 50.000, 51.000, 'Compra: F001-00001', '904f52cd-24b6-11f1-8aa8-d843aea88809', NULL, '2026-03-20 18:43:14'),
('905186d3-24b6-11f1-8aa8-d843aea88809', 'dad0b595-24a2-11f1-8aa8-d843aea88809', 'ENTRADA', 1.000, 50.000, 51.000, 'Compra: F001-00001', '904f52cd-24b6-11f1-8aa8-d843aea88809', NULL, '2026-03-20 18:43:14'),
('a5e496ad-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 5.000, 163.000, 168.000, 'Test entrada v2', NULL, NULL, '2026-03-24 16:01:37'),
('a5e956c7-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 2.000, 168.000, 166.000, 'Test entrada v2', NULL, NULL, '2026-03-24 16:01:37'),
('a714f8f6-27c4-11f1-9fa5-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 166.000, 176.000, 'Compra: F001-TEST-99526', 'a714d502-27c4-11f1-9fa5-d843aea88809', NULL, '2026-03-24 16:01:39'),
('c37f76d7-2258-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 61.000, 71.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:26:45'),
('c3845275-2258-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 71.000, 68.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:26:45'),
('cb368ee3-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 33.000, 43.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:19:49'),
('cb3b478e-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 43.000, 40.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:19:49'),
('d3205d51-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 40.000, 50.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:20:02'),
('d3251afc-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 50.000, 47.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:20:02'),
('d4a65595-24b4-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 110.000, 120.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 18:30:50'),
('d4ab0732-24b4-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 120.000, 117.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 18:30:50'),
('db42874c-24a2-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 82.000, 92.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 16:22:10'),
('db4769fa-24a2-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 92.000, 89.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 16:22:10'),
('e39f56e0-24a1-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 75.000, 85.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 16:15:15'),
('e3a41847-24a1-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 85.000, 82.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 16:15:15'),
('ee15af02-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 47.000, 57.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:20:47'),
('ee1a6067-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 57.000, 54.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:20:47'),
('f311f134-24aa-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 96.000, 106.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-20 17:20:06'),
('f3162dcc-24aa-11f1-8aa8-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 106.000, 103.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-20 17:20:06'),
('f7530505-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 54.000, 64.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:21:03'),
('f757bc34-2257-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 64.000, 61.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:21:03'),
('fb1ad8ac-2258-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'ENTRADA', 10.000, 68.000, 78.000, 'Test automatizado de entrada', 'TEST-DOC-001', NULL, '2026-03-17 18:28:19'),
('fb1fc040-2258-11f1-8415-d843aea88809', 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'SALIDA', 3.000, 78.000, 75.000, 'Test salida', 'TEST-DOC-001', NULL, '2026-03-17 18:28:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `codigo_interno` varchar(50) NOT NULL,
  `codigo_sunat` varchar(50) DEFAULT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `linea` varchar(100) DEFAULT NULL,
  `tipo` varchar(20) NOT NULL DEFAULT 'PRODUCTO',
  `unidad_medida` varchar(10) NOT NULL DEFAULT 'NIU',
  `precio_unitario_sin_igv` decimal(12,2) NOT NULL DEFAULT 0.00,
  `precio_unitario_con_igv` decimal(12,2) GENERATED ALWAYS AS (`precio_unitario_sin_igv` * 1.18) STORED,
  `precio_lista` decimal(12,2) DEFAULT NULL,
  `precio_oferta` decimal(12,2) DEFAULT NULL,
  `costo_promedio` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `stock_actual` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) NOT NULL DEFAULT 0,
  `estado_stock` varchar(20) NOT NULL DEFAULT 'automatico',
  `tipo_afectacion_igv` varchar(2) NOT NULL DEFAULT '10',
  `imagen_url` varchar(500) DEFAULT NULL,
  `imagen_alt` varchar(255) DEFAULT NULL,
  `galeria` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`galeria`)),
  `video_url` text DEFAULT NULL,
  `pdf_url` varchar(255) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `es_destacado` tinyint(1) NOT NULL DEFAULT 0,
  `etiqueta` varchar(100) DEFAULT NULL,
  `peso_kg` decimal(8,3) DEFAULT NULL,
  `maneja_lotes` tinyint(1) NOT NULL DEFAULT 0,
  `categoria_id` char(36) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `legacy_id` varchar(50) DEFAULT NULL,
  `legacy_sync_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `codigo_interno`, `codigo_sunat`, `sku`, `descripcion`, `categoria`, `linea`, `tipo`, `unidad_medida`, `precio_unitario_sin_igv`, `precio_lista`, `precio_oferta`, `costo_promedio`, `stock_actual`, `stock_minimo`, `estado_stock`, `tipo_afectacion_igv`, `imagen_url`, `imagen_alt`, `galeria`, `video_url`, `pdf_url`, `slug`, `es_destacado`, `etiqueta`, `peso_kg`, `maneja_lotes`, `categoria_id`, `activo`, `created_at`, `updated_at`, `legacy_id`, `legacy_sync_date`) VALUES
('0ea34c0f-27c4-11f1-9fa5-d843aea88809', 'TEST-843770mhs', NULL, 'TEST-843770mhs', 'Producto test TEST-843770mhs', NULL, NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 10, 2, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-test-test-843770mhs', 0, NULL, NULL, 0, NULL, 1, '2026-03-24 15:57:23', '2026-03-24 15:57:23', NULL, NULL),
('0fa272ce-27c5-11f1-9fa5-d843aea88809', 'TEST-2749504pu', NULL, 'TEST-2749504pu', 'Producto test TEST-2749504pu', NULL, NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 10, 2, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-test-test-2749504pu', 0, NULL, NULL, 0, NULL, 1, '2026-03-24 16:04:34', '2026-03-24 16:04:34', NULL, NULL),
('2bb9865e-24a7-11f1-8aa8-d843aea88809', 'TEST-583687hhk', NULL, 'TEST-583687hhk', 'Producto de prueba automatizada TEST-583687hhk', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-583687hhk', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 16:53:03', '2026-03-20 16:53:03', NULL, NULL),
('331359eb-24ab-11f1-8aa8-d843aea88809', 'TEST-313997rl9', NULL, 'TEST-313997rl9', 'Producto de prueba automatizada TEST-313997rl9', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-313997rl9', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 17:21:54', '2026-03-20 17:21:54', NULL, NULL),
('3e09a0b4-27c4-11f1-9fa5-d843aea88809', 'TEST-9232865co', NULL, 'TEST-9232865co', 'Producto test TEST-9232865co', NULL, NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 10, 2, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-test-test-9232865co', 0, NULL, NULL, 0, NULL, 1, '2026-03-24 15:58:43', '2026-03-24 15:58:43', NULL, NULL),
('43ccf86f-24ba-11f1-8aa8-d843aea88809', 'TEST-784507rlc', NULL, 'TEST-784507rlc', 'Producto test TEST-784507rlc', NULL, NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 10, 2, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-test-test-784507rlc', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 19:09:44', '2026-03-20 19:09:44', NULL, NULL),
('6600e3d0-24b8-11f1-8aa8-d843aea88809', 'TEST-98289648q', NULL, 'TEST-98289648q', 'Producto de prueba automatizada TEST-98289648q', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-98289648q', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 18:56:22', '2026-03-20 18:56:22', NULL, NULL),
('a562e2ae-27c4-11f1-9fa5-d843aea88809', 'TEST-096695ffo', NULL, 'TEST-096695ffo', 'Producto test TEST-096695ffo', NULL, NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 10, 2, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-test-test-096695ffo', 0, NULL, NULL, 0, NULL, 1, '2026-03-24 16:01:36', '2026-03-24 16:01:36', NULL, NULL),
('b6e5ea57-2257-11f1-8415-d843aea88809', 'DEBUG-TEST-001', NULL, NULL, 'Producto debug', NULL, NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 10, 2, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-debug', 0, NULL, NULL, 0, NULL, 1, '2026-03-17 18:19:15', '2026-03-17 18:19:15', NULL, NULL),
('d42b59e6-24b4-11f1-8aa8-d843aea88809', 'TEST-449735e5i', NULL, 'TEST-449735e5i', 'Producto de prueba automatizada TEST-449735e5i', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 51, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-449735e5i', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 18:30:49', '2026-03-20 18:43:14', NULL, NULL),
('d478d2b9-1cd2-11f1-977b-d843aea88809', 'test1', '', 'test2', 'TEST', 'TESt', 'TEST!', 'PRODUCTO', 'NIU', 200.00, NULL, NULL, 0.0000, 189, 4, 'en_stock', '10', '', NULL, '[]', '', '', 'test', 0, '', 12.000, 0, NULL, 1, '2026-03-10 17:45:25', '2026-03-24 16:04:39', NULL, NULL),
('dad0b595-24a2-11f1-8aa8-d843aea88809', 'TEST-72994529p', NULL, 'TEST-72994529p', 'Producto de prueba automatizada TEST-72994529p', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 51, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-72994529p', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 16:22:09', '2026-03-20 18:43:14', NULL, NULL),
('dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST222', '', 'SP137K-B2', 'es un test', 'Licencia', 'Test123', 'PRODUCTO', 'MTR', 100.00, NULL, NULL, 0.0000, 5, 1, 'en_stock', '10', 'https://maquimpower.com/producto/turbina-de-secado-chaobao-900c', NULL, '[]', 'https://www.youtube.com/watch?v=fOT0BUpITw8&list=RD0EBhGSX33x8&index=12', '', 'turbina-de-secado-chaobao-900c', 0, '', 120.000, 0, NULL, 1, '2026-03-11 10:49:15', '2026-03-11 10:49:15', NULL, NULL),
('e3272cf0-24a1-11f1-8aa8-d843aea88809', 'TEST-3144384g8', NULL, 'TEST-3144384g8', 'Producto de prueba automatizada TEST-3144384g8', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-3144384g8', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 16:15:14', '2026-03-20 16:15:14', NULL, NULL),
('e36e7c13-2253-11f1-8415-d843aea88809', 'TEST-911832', NULL, 'TEST-911832', 'Producto de prueba automatizada', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada', 0, NULL, NULL, 0, NULL, 1, '2026-03-17 17:51:51', '2026-03-17 17:51:51', NULL, NULL),
('f2a05a4f-24aa-11f1-8aa8-d843aea88809', 'TEST-205868xh7', NULL, 'TEST-205868xh7', 'Producto de prueba automatizada TEST-205868xh7', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-205868xh7', 0, NULL, NULL, 0, NULL, 1, '2026-03-20 17:20:05', '2026-03-20 17:20:05', NULL, NULL),
('fabb3217-2258-11f1-8415-d843aea88809', 'TEST-098407pfh', NULL, 'TEST-098407pfh', 'Producto de prueba automatizada TEST-098407pfh', 'TEST', NULL, 'PRODUCTO', 'NIU', 100.00, NULL, NULL, 0.0000, 50, 5, 'en_stock', '10', NULL, NULL, '[]', NULL, NULL, 'producto-de-prueba-automatizada-test-098407pfh', 0, NULL, NULL, 0, NULL, 1, '2026-03-17 18:28:18', '2026-03-17 18:28:18', NULL, NULL);

--
-- Disparadores `productos`
--
DELIMITER $$
CREATE TRIGGER `trg_estado_stock_insert` BEFORE INSERT ON `productos` FOR EACH ROW BEGIN
    IF NEW.estado_stock = 'automatico' THEN
        IF NEW.stock_actual = 0 THEN
            SET NEW.estado_stock = 'agotado';
        ELSEIF NEW.stock_actual <= NEW.stock_minimo THEN
            SET NEW.estado_stock = 'bajo_stock';
        ELSE
            SET NEW.estado_stock = 'en_stock';
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_estado_stock_update` BEFORE UPDATE ON `productos` FOR EACH ROW BEGIN
    IF NEW.estado_stock = 'automatico' THEN
        IF NEW.stock_actual = 0 THEN
            SET NEW.estado_stock = 'agotado';
        ELSEIF NEW.stock_actual <= NEW.stock_minimo THEN
            SET NEW.estado_stock = 'bajo_stock';
        ELSE
            SET NEW.estado_stock = 'en_stock';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `tipo_documento` varchar(10) NOT NULL DEFAULT 'RUC',
  `numero_documento` varchar(20) NOT NULL,
  `razon_social` varchar(500) NOT NULL,
  `nombre_comercial` varchar(500) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `ubigeo` varchar(6) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `contacto_nombre` varchar(255) DEFAULT NULL,
  `cuenta_bancaria` varchar(100) DEFAULT NULL,
  `banco` varchar(100) DEFAULT NULL,
  `cci` varchar(30) DEFAULT NULL,
  `condicion_pago` varchar(20) NOT NULL DEFAULT 'CONTADO',
  `dias_credito` int(11) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id`, `tipo_documento`, `numero_documento`, `razon_social`, `nombre_comercial`, `direccion`, `ubigeo`, `telefono`, `email`, `contacto_nombre`, `cuenta_bancaria`, `banco`, `cci`, `condicion_pago`, `dias_credito`, `activo`, `created_at`, `updated_at`) VALUES
('10532bfd-27c4-11f1-9fa5-d843aea88809', 'RUC', '20385846588', 'PROVEEDOR TEST S.A.C.', NULL, NULL, NULL, '999000001', NULL, NULL, NULL, NULL, NULL, 'CONTADO', 0, 0, '2026-03-24 15:57:26', '2026-03-24 15:57:26'),
('1274ede7-27c5-11f1-9fa5-d843aea88809', 'RUC', '20386279674', 'PROVEEDOR TEST S.A.C.', NULL, NULL, NULL, '999000001', NULL, NULL, NULL, NULL, NULL, 'CONTADO', 0, 0, '2026-03-24 16:04:39', '2026-03-24 16:04:39'),
('3f9145a2-27c4-11f1-9fa5-d843aea88809', 'RUC', '20385925860', 'PROVEEDOR TEST S.A.C.', NULL, NULL, NULL, '999000001', NULL, NULL, NULL, NULL, NULL, 'CONTADO', 0, 0, '2026-03-24 15:58:45', '2026-03-24 15:58:46'),
('44e1fc1f-24ba-11f1-8aa8-d843aea88809', 'RUC', '20051786322', 'PROVEEDOR TEST S.A.C.', NULL, NULL, NULL, '999000001', NULL, NULL, NULL, NULL, NULL, 'CONTADO', 0, 0, '2026-03-20 19:09:46', '2026-03-20 19:09:46'),
('5f3217c2-24b6-11f1-8aa8-d843aea88809', 'RUC', '20606853182', 'CORPORACION MAQUIMSA E.I.R.L.', 'TEST', 'TEST', NULL, '934231881', 'test@gmail.com', 'ES UN TEST', '1231231231323123123', 'BCP', '1231231231323123123213123', 'CONTADO', 0, 1, '2026-03-20 18:41:52', '2026-03-20 18:41:52'),
('a6f857e7-27c4-11f1-9fa5-d843aea88809', 'RUC', '20386099341', 'PROVEEDOR TEST S.A.C.', NULL, NULL, NULL, '999000001', NULL, NULL, NULL, NULL, NULL, 'CONTADO', 0, 0, '2026-03-24 16:01:39', '2026-03-24 16:01:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles_permisos`
--

CREATE TABLE `roles_permisos` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `rol` varchar(50) NOT NULL,
  `modulo` varchar(50) NOT NULL,
  `puede_ver` tinyint(1) NOT NULL DEFAULT 0,
  `puede_crear` tinyint(1) NOT NULL DEFAULT 0,
  `puede_editar` tinyint(1) NOT NULL DEFAULT 0,
  `puede_eliminar` tinyint(1) NOT NULL DEFAULT 0,
  `puede_exportar` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles_permisos`
--

INSERT INTO `roles_permisos` (`id`, `rol`, `modulo`, `puede_ver`, `puede_crear`, `puede_editar`, `puede_eliminar`, `puede_exportar`, `created_at`) VALUES
('a5679e60-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'clientes', 1, 1, 1, 1, 1, '2026-03-07 20:45:58'),
('a5679f9b-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'productos', 1, 1, 1, 1, 1, '2026-03-07 20:45:58'),
('a567a011-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'ventas', 1, 1, 1, 0, 1, '2026-03-07 20:45:58'),
('a567a032-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'inventario', 1, 1, 1, 0, 1, '2026-03-07 20:45:58'),
('a567a04d-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'compras', 1, 1, 1, 0, 1, '2026-03-07 20:45:58'),
('a567a069-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'caja', 1, 1, 1, 0, 1, '2026-03-07 20:45:58'),
('a567a082-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'reportes', 1, 0, 0, 0, 1, '2026-03-07 20:45:58'),
('a567a09b-1a66-11f1-96c5-5ccceb374ee4', 'admin', 'usuarios', 1, 1, 1, 1, 0, '2026-03-07 20:45:58'),
('a567a0b5-1a66-11f1-96c5-5ccceb374ee4', 'vendedor', 'clientes', 1, 1, 1, 0, 0, '2026-03-07 20:45:58'),
('a567a0ce-1a66-11f1-96c5-5ccceb374ee4', 'vendedor', 'productos', 1, 0, 0, 0, 0, '2026-03-07 20:45:58'),
('a567a0e7-1a66-11f1-96c5-5ccceb374ee4', 'vendedor', 'ventas', 1, 1, 0, 0, 0, '2026-03-07 20:45:58'),
('a567a0ff-1a66-11f1-96c5-5ccceb374ee4', 'almacen', 'productos', 1, 1, 1, 0, 0, '2026-03-07 20:45:58'),
('a567a116-1a66-11f1-96c5-5ccceb374ee4', 'almacen', 'inventario', 1, 1, 1, 0, 0, '2026-03-07 20:45:58'),
('a567a12f-1a66-11f1-96c5-5ccceb374ee4', 'almacen', 'compras', 1, 1, 0, 0, 0, '2026-03-07 20:45:58'),
('a567a145-1a66-11f1-96c5-5ccceb374ee4', 'contador', 'ventas', 1, 0, 0, 0, 1, '2026-03-07 20:45:58'),
('a567a15c-1a66-11f1-96c5-5ccceb374ee4', 'contador', 'compras', 1, 0, 0, 0, 1, '2026-03-07 20:45:58'),
('a567a175-1a66-11f1-96c5-5ccceb374ee4', 'contador', 'reportes', 1, 0, 0, 0, 1, '2026-03-07 20:45:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `series_comprobantes`
--

CREATE TABLE `series_comprobantes` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `tipo_comprobante` varchar(2) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `correlativo_actual` int(11) NOT NULL DEFAULT 0,
  `almacen` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `series_comprobantes`
--

INSERT INTO `series_comprobantes` (`id`, `tipo_comprobante`, `serie`, `correlativo_actual`, `almacen`, `activo`, `created_at`) VALUES
('8da7ebbc-1a66-11f1-96c5-5ccceb374ee4', '01', 'F001', 0, NULL, 1, '2026-03-07 20:45:19'),
('8da7ed23-1a66-11f1-96c5-5ccceb374ee4', '03', 'B001', 0, NULL, 1, '2026-03-07 20:45:19'),
('8da7eda8-1a66-11f1-96c5-5ccceb374ee4', '07', 'FC01', 0, NULL, 1, '2026-03-07 20:45:19'),
('8da7edd4-1a66-11f1-96c5-5ccceb374ee4', '07', 'BC01', 0, NULL, 1, '2026-03-07 20:45:19'),
('8da7ee04-1a66-11f1-96c5-5ccceb374ee4', '09', 'T001', 0, NULL, 1, '2026-03-07 20:45:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sync_hostinger_log`
--

CREATE TABLE `sync_hostinger_log` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `tabla` varchar(50) NOT NULL DEFAULT 'productos',
  `registro_id` char(36) DEFAULT NULL,
  `accion` varchar(20) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `error_msg` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `enviado_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `nombres` varchar(255) NOT NULL,
  `apellidos` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `rol` varchar(50) NOT NULL DEFAULT 'vendedor',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombres`, `apellidos`, `email`, `password_hash`, `telefono`, `foto_url`, `rol`, `activo`, `ultimo_acceso`, `created_at`, `updated_at`) VALUES
('1775a432-1a7e-11f1-96c5-5ccceb374ee4', 'Admin', 'Maquimpower', 'ventas@maquimpower.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 'admin', 1, '2026-03-20 18:58:37', '2026-03-07 23:33:48', '2026-03-20 18:58:37'),
('a566511a-1a66-11f1-96c5-5ccceb374ee4', 'Administrador', 'Sistema', 'admin@maquimpower.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL, NULL, 'admin', 1, '2026-03-24 16:04:34', '2026-03-07 20:45:58', '2026-03-24 16:04:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `tipo_comprobante` varchar(2) NOT NULL,
  `serie` varchar(4) NOT NULL,
  `correlativo` int(11) NOT NULL,
  `numero_completo` varchar(20) GENERATED ALWAYS AS (concat(`serie`,'-',lpad(`correlativo`,8,'0'))) STORED,
  `fecha_emision` date NOT NULL DEFAULT curdate(),
  `hora_emision` time NOT NULL DEFAULT curtime(),
  `fecha_vencimiento` date DEFAULT NULL,
  `cliente_id` char(36) NOT NULL,
  `moneda` varchar(3) NOT NULL DEFAULT 'PEN',
  `tipo_cambio` decimal(6,3) NOT NULL DEFAULT 1.000,
  `condicion_pago` varchar(20) NOT NULL DEFAULT 'CONTADO',
  `forma_pago` varchar(50) DEFAULT NULL,
  `op_gravada` decimal(12,2) NOT NULL DEFAULT 0.00,
  `op_exonerada` decimal(12,2) NOT NULL DEFAULT 0.00,
  `op_inafecta` decimal(12,2) NOT NULL DEFAULT 0.00,
  `op_gratuita` decimal(12,2) NOT NULL DEFAULT 0.00,
  `descuento_global` decimal(12,2) NOT NULL DEFAULT 0.00,
  `porcentaje_descuento` decimal(5,2) NOT NULL DEFAULT 0.00,
  `igv` decimal(12,2) NOT NULL DEFAULT 0.00,
  `icbper` decimal(12,2) NOT NULL DEFAULT 0.00,
  `otros_cargos` decimal(12,2) NOT NULL DEFAULT 0.00,
  `importe_total` decimal(12,2) GENERATED ALWAYS AS (`op_gravada` + `igv` + `op_exonerada` + `op_inafecta` + `icbper` + `otros_cargos` - `descuento_global`) STORED,
  `estado_sunat` varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  `cdr_sunat` text DEFAULT NULL,
  `hash_cpe` varchar(255) DEFAULT NULL,
  `codigo_sunat` varchar(10) DEFAULT NULL,
  `mensaje_sunat` text DEFAULT NULL,
  `fecha_envio_sunat` datetime DEFAULT NULL,
  `fecha_aceptacion_sunat` datetime DEFAULT NULL,
  `observacion` text DEFAULT NULL,
  `observacion_interna` text DEFAULT NULL,
  `lugar_entrega` text DEFAULT NULL,
  `estado_pago` varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  `monto_pagado` decimal(12,2) NOT NULL DEFAULT 0.00,
  `vendedor_id` char(36) DEFAULT NULL,
  `usuario_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `legacy_sync_id` varchar(50) DEFAULT NULL,
  `legacy_sync_status` varchar(20) DEFAULT NULL,
  `legacy_sync_date` datetime DEFAULT NULL,
  `legacy_error_message` text DEFAULT NULL,
  `detraccion_codigo` varchar(10) DEFAULT NULL COMMENT 'Catalogo 54 SUNAT',
  `detraccion_porcentaje` decimal(5,2) DEFAULT 0.00,
  `detraccion_monto` decimal(12,2) DEFAULT 0.00,
  `detraccion_cuenta` varchar(30) DEFAULT NULL,
  `detraccion_medio_pago` varchar(10) DEFAULT NULL COMMENT 'Catalogo 59 SUNAT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id`, `tipo_comprobante`, `serie`, `correlativo`, `fecha_emision`, `hora_emision`, `fecha_vencimiento`, `cliente_id`, `moneda`, `tipo_cambio`, `condicion_pago`, `forma_pago`, `op_gravada`, `op_exonerada`, `op_inafecta`, `op_gratuita`, `descuento_global`, `porcentaje_descuento`, `igv`, `icbper`, `otros_cargos`, `estado_sunat`, `cdr_sunat`, `hash_cpe`, `codigo_sunat`, `mensaje_sunat`, `fecha_envio_sunat`, `fecha_aceptacion_sunat`, `observacion`, `observacion_interna`, `lugar_entrega`, `estado_pago`, `monto_pagado`, `vendedor_id`, `usuario_id`, `created_at`, `updated_at`, `legacy_sync_id`, `legacy_sync_status`, `legacy_sync_date`, `legacy_error_message`, `detraccion_codigo`, `detraccion_porcentaje`, `detraccion_monto`, `detraccion_cuenta`, `detraccion_medio_pago`) VALUES
('0baee2c3-1f27-11f1-8faa-d843aea88809', '01', 'F001', 2, '2026-03-13', '16:53:18', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 200.00, 0.00, 0.00, 0.00, 0.00, 0.00, 36.00, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 16:53:18', '2026-03-13 16:53:18', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('0fb25bde-27c5-11f1-9fa5-d843aea88809', '01', 'F001', 43, '2026-03-24', '16:04:35', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-24 16:04:36', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-24 16:04:35', '2026-03-24 16:04:36', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('1e04d38d-1f35-11f1-8faa-d843aea88809', '01', 'F001', 17, '2026-03-13', '18:34:02', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-13 18:34:02', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 18:34:02', '2026-03-13 18:34:02', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('224df4f8-1f29-11f1-8faa-d843aea88809', '01', 'F001', 7, '2026-03-13', '17:08:15', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'RECHAZADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 13:09:09', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:08:15', '2026-03-20 13:09:09', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('27a90edc-1f32-11f1-8faa-d843aea88809', '01', 'F001', 13, '2026-03-13', '18:12:49', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 17:37:15', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 18:12:49', '2026-03-17 17:37:29', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('2bcb6813-24a7-11f1-8aa8-d843aea88809', '01', 'F001', 36, '2026-03-20', '16:53:03', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 16:53:04', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 16:53:03', '2026-03-20 16:53:04', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('33269699-24ab-11f1-8aa8-d843aea88809', '01', 'F001', 38, '2026-03-20', '17:21:54', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 17:21:54', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 17:21:54', '2026-03-20 17:21:54', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('36876a1a-1f29-11f1-8faa-d843aea88809', '01', 'F001', 8, '2026-03-13', '17:08:49', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:08:49', '2026-03-13 17:08:49', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('3c3cb5d8-1f34-11f1-8faa-d843aea88809', '01', 'F001', 16, '2026-03-13', '18:27:43', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-13 18:27:44', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 18:27:43', '2026-03-13 18:27:44', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('409b130f-1f32-11f1-8faa-d843aea88809', '01', 'F001', 14, '2026-03-13', '18:13:31', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<br />\n<b>Warning</b>:  chmod(): No such file or directory in <b>/home/facturacioninteg/public_html/aplicaciones_sistemas/API_SUNAT/ws_sunat/index.php</b> on line <b>59</b><br />\n<br />\n<b>Warning</b>:  file_get_contents(../files/facturacion_electronica/FIRMA/20000000001-01-F001-14.zip): failed to open stream: No such file or directory in <b>/home/facturacioninteg/public_html/aplicaciones_sistemas/API_SUNAT/ws_sunat/index.php</b> on line <b>68</b><br />\nError : PCLZIP_ERR_BAD_FORMAT (-10) : Unable to find End of Central Dir Record signature', NULL, '9999', 'Respuesta inválida: \nWarning:  chmod(): No such file or directory in /home/facturacioninteg/public_html/aplicaciones_sistemas/API_SUNAT/ws_sunat/index.php on line 59\n\nWar', '2026-03-13 18:13:34', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 18:13:31', '2026-03-13 18:13:34', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('43e28227-24ba-11f1-8aa8-d843aea88809', '01', 'F001', 41, '2026-03-20', '19:09:44', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 19:09:45', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-20 19:09:44', '2026-03-20 19:09:45', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('4523b597-1f30-11f1-8faa-d843aea88809', '01', 'F001', 11, '2026-03-13', '17:59:20', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', NULL, NULL, '9999', 'Respuesta inválida del servidor SUNAT.', '2026-03-13 17:59:23', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:59:20', '2026-03-13 17:59:23', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('5dcb81e1-2488-11f1-8aa8-d843aea88809', '03', 'B001', 1, '2026-03-20', '13:12:33', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 400.00, 0.00, 0.00, 0.00, 0.00, 0.00, 72.00, 0.00, 0.00, 'RECHAZADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-24 16:06:11', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-20 13:12:33', '2026-03-24 16:06:11', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('608a4b27-2488-11f1-8aa8-d843aea88809', '03', 'B001', 2, '2026-03-20', '13:12:37', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 400.00, 0.00, 0.00, 0.00, 0.00, 0.00, 72.00, 0.00, 0.00, 'RECHAZADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 13:12:38', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-20 13:12:37', '2026-03-20 13:12:38', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('66115f58-24b8-11f1-8aa8-d843aea88809', '01', 'F001', 40, '2026-03-20', '18:56:23', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 18:56:23', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 18:56:23', '2026-03-20 18:56:23', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('666f4f07-2488-11f1-8aa8-d843aea88809', '03', 'B001', 3, '2026-03-20', '13:12:47', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 400.00, 0.00, 0.00, 0.00, 0.00, 0.00, 72.00, 0.00, 0.00, 'RECHAZADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 13:12:47', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-20 13:12:47', '2026-03-20 13:12:47', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('68ff4d77-1f2e-11f1-8faa-d843aea88809', '01', 'F001', 10, '2026-03-13', '17:46:01', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'RECHAZADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 17:37:34', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:46:01', '2026-03-17 17:37:34', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('6e5c894d-2256-11f1-8415-d843aea88809', '01', 'F001', 24, '2026-03-17', '18:10:03', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:10:04', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:10:03', '2026-03-17 18:10:04', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('6ea39a90-1f25-11f1-8faa-d843aea88809', '01', 'F001', 1, '2026-03-13', '16:41:45', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 200.00, 0.00, 0.00, 0.00, 0.00, 0.00, 36.00, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 16:41:45', '2026-03-13 16:41:45', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('7710f86d-2256-11f1-8415-d843aea88809', '01', 'F001', 25, '2026-03-17', '18:10:18', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:10:18', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:10:18', '2026-03-17 18:10:18', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('8a9544ff-2256-11f1-8415-d843aea88809', '01', 'F001', 26, '2026-03-17', '18:10:51', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:10:51', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:10:51', '2026-03-17 18:10:51', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('8ca4631b-1f28-11f1-8faa-d843aea88809', '01', 'F001', 5, '2026-03-13', '17:04:04', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:04:04', '2026-03-13 17:04:04', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('8d9e1021-1f27-11f1-8faa-d843aea88809', '01', 'F001', 3, '2026-03-13', '16:56:56', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 16:56:56', '2026-03-13 16:56:56', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('9436e8d7-249f-11f1-8aa8-d843aea88809', '01', 'F001', 33, '2026-03-20', '15:58:43', NULL, 'bdfef640-2254-11f1-8415-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 300.00, 0.00, 0.00, 0.00, 0.00, 0.00, 54.00, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-24 13:31:14', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-20 15:58:43', '2026-03-24 13:31:18', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('9731c85f-1f31-11f1-8faa-d843aea88809', '01', 'F001', 12, '2026-03-13', '18:08:47', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<br />\n<b>Warning</b>:  chmod(): No such file or directory in <b>/home/facturacioninteg/public_html/aplicaciones_sistemas/API_SUNAT/ws_sunat/index.php</b> on line <b>59</b><br />\n<br />\n<b>Warning</b>:  file_get_contents(../files/facturacion_electronica/FIRMA/20000000001-01-F001-12.zip): failed to open stream: No such file or directory in <b>/home/facturacioninteg/public_html/aplicaciones_sistemas/API_SUNAT/ws_sunat/index.php</b> on line <b>68</b><br />\nError : PCLZIP_ERR_BAD_FORMAT (-10) : Unable to find End of Central Dir Record signature', NULL, '9999', 'Respuesta inválida: \nWarning:  chmod(): No such file or directory in /home/facturacioninteg/public_html/aplicaciones_sistemas/API_SUNAT/ws_sunat/index.php on line 59\n\nWar', '2026-03-13 18:08:50', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 18:08:47', '2026-03-13 18:08:50', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('9df39f18-1f32-11f1-8faa-d843aea88809', '01', 'F001', 15, '2026-03-13', '18:16:08', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-13 18:16:09', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 18:16:08', '2026-03-13 18:16:09', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('a5753347-27c4-11f1-9fa5-d843aea88809', '01', 'F001', 42, '2026-03-24', '16:01:36', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-24 16:01:37', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-24 16:01:36', '2026-03-24 16:01:37', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('af056990-2255-11f1-8415-d843aea88809', '01', 'F001', 21, '2026-03-17', '18:04:42', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:04:43', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:04:42', '2026-03-17 18:04:43', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('b66765b6-2255-11f1-8415-d843aea88809', '01', 'F001', 22, '2026-03-17', '18:04:55', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:04:55', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:04:55', '2026-03-17 18:04:55', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('b8c39b4a-1f27-11f1-8faa-d843aea88809', '01', 'F001', 4, '2026-03-13', '16:58:08', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 16:58:08', '2026-03-13 16:58:09', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('be173665-2254-11f1-8415-d843aea88809', '01', 'F001', 20, '2026-03-17', '17:57:58', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 17:57:59', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 17:57:58', '2026-03-17 17:57:59', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('c32312f6-2258-11f1-8415-d843aea88809', '01', 'F001', 31, '2026-03-17', '18:26:45', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:26:45', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:26:45', '2026-03-17 18:26:45', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('c9ff6d14-2255-11f1-8415-d843aea88809', '01', 'F001', 23, '2026-03-17', '18:05:28', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:05:28', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:05:28', '2026-03-17 18:05:28', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('cacc0657-2257-11f1-8415-d843aea88809', '01', 'F001', 27, '2026-03-17', '18:19:48', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:19:49', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:19:48', '2026-03-17 18:19:49', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('d2cffda2-2257-11f1-8415-d843aea88809', '01', 'F001', 28, '2026-03-17', '18:20:01', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:20:02', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:20:01', '2026-03-17 18:20:02', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('d43e35cc-24b4-11f1-8aa8-d843aea88809', '01', 'F001', 39, '2026-03-20', '18:30:49', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 18:30:50', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 18:30:49', '2026-03-20 18:30:50', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('dae3c5b7-24a2-11f1-8aa8-d843aea88809', '01', 'F001', 35, '2026-03-20', '16:22:10', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 16:22:10', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 16:22:10', '2026-03-20 16:22:10', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('e13600ef-1f29-11f1-8faa-d843aea88809', '01', 'F001', 9, '2026-03-13', '17:13:35', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'RECHAZADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 13:08:48', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:13:35', '2026-03-20 13:08:48', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('e267731c-1f28-11f1-8faa-d843aea88809', '01', 'F001', 6, '2026-03-13', '17:06:28', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, 'a566511a-1a66-11f1-96c5-5ccceb374ee4', 'a566511a-1a66-11f1-96c5-5ccceb374ee4', '2026-03-13 17:06:28', '2026-03-13 17:06:28', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('e339fdd8-24a1-11f1-8aa8-d843aea88809', '01', 'F001', 34, '2026-03-20', '16:15:14', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 16:15:15', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 16:15:14', '2026-03-20 16:15:15', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('e381a542-2253-11f1-8415-d843aea88809', '01', 'F001', 18, '2026-03-17', '17:51:51', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 17:51:52', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 17:51:51', '2026-03-17 17:51:52', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('edc88585-2257-11f1-8415-d843aea88809', '01', 'F001', 29, '2026-03-17', '18:20:47', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:20:47', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:20:47', '2026-03-17 18:20:47', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('f2b31f68-24aa-11f1-8aa8-d843aea88809', '01', 'F001', 37, '2026-03-20', '17:20:06', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-20 17:20:06', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-20 17:20:06', '2026-03-20 17:20:06', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('f63e3cbb-2253-11f1-8415-d843aea88809', '01', 'F001', 19, '2026-03-17', '17:52:23', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 17:52:23', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 17:52:23', '2026-03-17 17:52:23', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('f706de6e-2257-11f1-8415-d843aea88809', '01', 'F001', 30, '2026-03-17', '18:21:02', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:21:03', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:21:02', '2026-03-17 18:21:03', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL),
('faccbb5a-2258-11f1-8415-d843aea88809', '01', 'F001', 32, '2026-03-17', '18:28:18', NULL, 'b3d0e6c6-1ca5-11f1-977b-d843aea88809', 'PEN', 1.000, 'CONTADO', NULL, 169.49, 0.00, 0.00, 0.00, 0.00, 0.00, 30.51, 0.00, 0.00, 'ANULADO', '<?xml version=\'1.0\' ?>\n<env:Envelope xmlns:env=\'http://schemas.xmlsoap.org/soap/envelope/\'>\n<env:Body>\n<env:Fault>\n<faultcode>env:Client</faultcode>\n<faultstring>Internal Error</faultstring>\n</env:Fault>\n</env:Body>\n</env:Envelope>\n', NULL, '9999', 'Respuesta inválida: \n\n\n\nenv:Client\nInternal Error\n\n\n\n', '2026-03-17 18:28:18', NULL, NULL, NULL, NULL, 'PENDIENTE', 0.00, '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '1775a432-1a7e-11f1-96c5-5ccceb374ee4', '2026-03-17 18:28:18', '2026-03-17 18:28:18', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas_detalle`
--

CREATE TABLE `ventas_detalle` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `venta_id` char(36) NOT NULL,
  `item` int(11) NOT NULL,
  `producto_id` char(36) DEFAULT NULL,
  `codigo_producto` varchar(50) NOT NULL,
  `descripcion` text NOT NULL,
  `unidad_medida` varchar(10) NOT NULL,
  `cantidad` decimal(12,3) NOT NULL,
  `valor_unitario` decimal(12,4) NOT NULL,
  `precio_unitario` decimal(12,4) NOT NULL,
  `descuento_unitario` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `tipo_afectacion_igv` varchar(2) NOT NULL DEFAULT '10',
  `porcentaje_igv` decimal(5,2) NOT NULL DEFAULT 18.00,
  `valor_venta` decimal(12,2) GENERATED ALWAYS AS (round(`cantidad` * `valor_unitario`,2)) STORED,
  `igv_item` decimal(12,2) GENERATED ALWAYS AS (case when `tipo_afectacion_igv` = '10' then round(`cantidad` * `valor_unitario` * 0.18,2) else 0 end) STORED,
  `precio_total` decimal(12,2) GENERATED ALWAYS AS (round(`cantidad` * `precio_unitario` - `descuento_unitario`,2)) STORED,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas_detalle`
--

INSERT INTO `ventas_detalle` (`id`, `venta_id`, `item`, `producto_id`, `codigo_producto`, `descripcion`, `unidad_medida`, `cantidad`, `valor_unitario`, `precio_unitario`, `descuento_unitario`, `tipo_afectacion_igv`, `porcentaje_igv`, `created_at`) VALUES
('0baef8c9-1f27-11f1-8faa-d843aea88809', '0baee2c3-1f27-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', '', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 16:53:18'),
('0fb26f83-27c5-11f1-9fa5-d843aea88809', '0fb25bde-27c5-11f1-9fa5-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-24 16:04:35'),
('1e04eab6-1f35-11f1-8faa-d843aea88809', '1e04d38d-1f35-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 18:34:02'),
('224e09aa-1f29-11f1-8faa-d843aea88809', '224df4f8-1f29-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:08:15'),
('27a92f79-1f32-11f1-8faa-d843aea88809', '27a90edc-1f32-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 18:12:49'),
('2bcb7c8d-24a7-11f1-8aa8-d843aea88809', '2bcb6813-24a7-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 16:53:03'),
('3326ac89-24ab-11f1-8aa8-d843aea88809', '33269699-24ab-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 17:21:54'),
('36885256-1f29-11f1-8faa-d843aea88809', '36876a1a-1f29-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:08:49'),
('3c3ccf9f-1f34-11f1-8faa-d843aea88809', '3c3cb5d8-1f34-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 18:27:43'),
('409b2029-1f32-11f1-8faa-d843aea88809', '409b130f-1f32-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 18:13:31'),
('43e2a377-24ba-11f1-8aa8-d843aea88809', '43e28227-24ba-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 19:09:44'),
('45249cd2-1f30-11f1-8faa-d843aea88809', '4523b597-1f30-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:59:20'),
('5dcbaffd-2488-11f1-8aa8-d843aea88809', '5dcb81e1-2488-11f1-8aa8-d843aea88809', 1, 'fabb3217-2258-11f1-8415-d843aea88809', 'TEST-098407pfh', 'Producto de prueba automatizada TEST-098407pfh', 'NIU', 4.000, 100.0000, 118.0000, 0.0000, '10', 18.00, '2026-03-20 13:12:33'),
('608a603c-2488-11f1-8aa8-d843aea88809', '608a4b27-2488-11f1-8aa8-d843aea88809', 1, 'fabb3217-2258-11f1-8415-d843aea88809', 'TEST-098407pfh', 'Producto de prueba automatizada TEST-098407pfh', 'NIU', 4.000, 100.0000, 118.0000, 0.0000, '10', 18.00, '2026-03-20 13:12:37'),
('6611834a-24b8-11f1-8aa8-d843aea88809', '66115f58-24b8-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 18:56:23'),
('666f6326-2488-11f1-8aa8-d843aea88809', '666f4f07-2488-11f1-8aa8-d843aea88809', 1, 'fabb3217-2258-11f1-8415-d843aea88809', 'TEST-098407pfh', 'Producto de prueba automatizada TEST-098407pfh', 'NIU', 4.000, 100.0000, 118.0000, 0.0000, '10', 18.00, '2026-03-20 13:12:47'),
('68ff6fda-1f2e-11f1-8faa-d843aea88809', '68ff4d77-1f2e-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:46:01'),
('6e5c9d81-2256-11f1-8415-d843aea88809', '6e5c894d-2256-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:10:03'),
('6ea3ba5a-1f25-11f1-8faa-d843aea88809', '6ea39a90-1f25-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', '', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 16:41:45'),
('7711155e-2256-11f1-8415-d843aea88809', '7710f86d-2256-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:10:18'),
('8a955a35-2256-11f1-8415-d843aea88809', '8a9544ff-2256-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:10:51'),
('8ca47ab5-1f28-11f1-8faa-d843aea88809', '8ca4631b-1f28-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:04:04'),
('8d9e236b-1f27-11f1-8faa-d843aea88809', '8d9e1021-1f27-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 16:56:56'),
('9436fed4-249f-11f1-8aa8-d843aea88809', '9436e8d7-249f-11f1-8aa8-d843aea88809', 1, 'b6e5ea57-2257-11f1-8415-d843aea88809', 'DEBUG-TEST-001', 'Producto', 'NIU', 3.000, 100.0000, 118.0000, 0.0000, '10', 18.00, '2026-03-20 15:58:43'),
('9731d5b7-1f31-11f1-8faa-d843aea88809', '9731c85f-1f31-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 18:08:47'),
('9df4993f-1f32-11f1-8faa-d843aea88809', '9df39f18-1f32-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 18:16:08'),
('a57556fd-27c4-11f1-9fa5-d843aea88809', 'a5753347-27c4-11f1-9fa5-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-24 16:01:36'),
('af06525c-2255-11f1-8415-d843aea88809', 'af056990-2255-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:04:42'),
('b667783b-2255-11f1-8415-d843aea88809', 'b66765b6-2255-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:04:55'),
('b8c3bb6c-1f27-11f1-8faa-d843aea88809', 'b8c39b4a-1f27-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 16:58:08'),
('be174d48-2254-11f1-8415-d843aea88809', 'be173665-2254-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 17:57:58'),
('c3232921-2258-11f1-8415-d843aea88809', 'c32312f6-2258-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:26:45'),
('ca0069c9-2255-11f1-8415-d843aea88809', 'c9ff6d14-2255-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:05:28'),
('caccdc7a-2257-11f1-8415-d843aea88809', 'cacc0657-2257-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:19:48'),
('d2d1375b-2257-11f1-8415-d843aea88809', 'd2cffda2-2257-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:20:01'),
('d43e4c19-24b4-11f1-8aa8-d843aea88809', 'd43e35cc-24b4-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 18:30:49'),
('dae3ddeb-24a2-11f1-8aa8-d843aea88809', 'dae3c5b7-24a2-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 16:22:10'),
('e137236d-1f29-11f1-8faa-d843aea88809', 'e13600ef-1f29-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:13:35'),
('e267890d-1f28-11f1-8faa-d843aea88809', 'e267731c-1f28-11f1-8faa-d843aea88809', 1, 'dbac6a66-1d61-11f1-9ca6-d843aea88809', 'TEST-001', 'Producto de Prueba API', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-13 17:06:28'),
('e33a1726-24a1-11f1-8aa8-d843aea88809', 'e339fdd8-24a1-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 16:15:14'),
('e381c17b-2253-11f1-8415-d843aea88809', 'e381a542-2253-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 17:51:51'),
('edc89c08-2257-11f1-8415-d843aea88809', 'edc88585-2257-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:20:47'),
('f2b335b5-24aa-11f1-8aa8-d843aea88809', 'f2b31f68-24aa-11f1-8aa8-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-20 17:20:06'),
('f63e4fd4-2253-11f1-8415-d843aea88809', 'f63e3cbb-2253-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 17:52:23'),
('f706f223-2257-11f1-8415-d843aea88809', 'f706de6e-2257-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:21:02'),
('facccb60-2258-11f1-8415-d843aea88809', 'faccbb5a-2258-11f1-8415-d843aea88809', 1, 'd478d2b9-1cd2-11f1-977b-d843aea88809', 'TEST-001', 'Producto', 'NIU', 2.000, 84.7458, 100.0000, 0.0000, '10', 18.00, '2026-03-17 18:28:18');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `caja_movimientos`
--
ALTER TABLE `caja_movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_caja_fecha` (`fecha`),
  ADD KEY `idx_caja_tipo` (`tipo`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_clientes_documento` (`numero_documento`),
  ADD KEY `idx_clientes_razon_social` (`razon_social`(100)),
  ADD KEY `idx_clientes_legacy_id` (`legacy_id`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_compras_proveedor` (`proveedor_id`),
  ADD KEY `idx_compras_fecha` (`fecha_comprobante`),
  ADD KEY `idx_compras_estado` (`estado`);

--
-- Indices de la tabla `compras_detalle`
--
ALTER TABLE `compras_detalle`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_item_compra` (`compra_id`,`item`),
  ADD KEY `idx_compras_det_compra` (`compra_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inv_producto` (`producto_id`),
  ADD KEY `idx_inv_tipo` (`tipo_movimiento`),
  ADD KEY `idx_inv_fecha` (`created_at`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_productos_codigo` (`codigo_interno`),
  ADD UNIQUE KEY `uk_productos_sku` (`sku`),
  ADD UNIQUE KEY `uk_productos_slug` (`slug`),
  ADD KEY `idx_productos_legacy` (`legacy_id`),
  ADD KEY `idx_productos_categoria` (`categoria_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_proveedores_doc` (`numero_documento`),
  ADD KEY `idx_proveedores_razon` (`razon_social`(100));

--
-- Indices de la tabla `roles_permisos`
--
ALTER TABLE `roles_permisos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_rol_modulo` (`rol`,`modulo`);

--
-- Indices de la tabla `series_comprobantes`
--
ALTER TABLE `series_comprobantes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_serie` (`tipo_comprobante`,`serie`);

--
-- Indices de la tabla `sync_hostinger_log`
--
ALTER TABLE `sync_hostinger_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sync_estado` (`estado`),
  ADD KEY `idx_sync_tabla` (`tabla`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_usuarios_email` (`email`),
  ADD KEY `idx_usuarios_rol` (`rol`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_comprobante` (`tipo_comprobante`,`serie`,`correlativo`),
  ADD KEY `idx_ventas_cliente` (`cliente_id`),
  ADD KEY `idx_ventas_fecha` (`fecha_emision`),
  ADD KEY `idx_ventas_estado_sunat` (`estado_sunat`),
  ADD KEY `idx_ventas_numero` (`numero_completo`);

--
-- Indices de la tabla `ventas_detalle`
--
ALTER TABLE `ventas_detalle`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_item_venta` (`venta_id`,`item`),
  ADD KEY `idx_detalle_venta` (`venta_id`),
  ADD KEY `idx_detalle_producto` (`producto_id`);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `compras`
--
ALTER TABLE `compras`
  ADD CONSTRAINT `compras_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`);

--
-- Filtros para la tabla `compras_detalle`
--
ALTER TABLE `compras_detalle`
  ADD CONSTRAINT `compras_detalle_ibfk_1` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `compras_detalle_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  ADD CONSTRAINT `inventario_movimientos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `ventas_detalle`
--
ALTER TABLE `ventas_detalle`
  ADD CONSTRAINT `ventas_detalle_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ventas_detalle_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
