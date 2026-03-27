<?php
/**
 * Constantes Globales del Sistema - Antigravity
 */

// Toggle global para activar o desactivar el envío a SUNAT
define('SUNAT_HABILITADO', false); // Poner en true cuando el entorno y certificados estén listos

// Entorno: 'beta' o 'produccion'
define('SUNAT_MODO', 'beta');

// Credenciales SUNAT (Ejemplo)
define('SUNAT_RUC', '20123456789');
define('SUNAT_USUARIO', 'MODDATOS');
define('SUNAT_CLAVE', 'moddatos');

// Seguridad para CRON Automáticos (Sync Server to Server)
define('CRON_SECRET', 'TU_SECRET_COMPLEJO_AQUI_2026');

// Datos de la Empresa Emisora
define('EMPRESA_RAZON_SOCIAL', 'ANTIGRAVITY S.A.C.');
define('EMPRESA_DIRECCION', 'Av. Principal 123, Distrito Central, Lima, Perú');
define('EMPRESA_UBIGEO', '150101');
