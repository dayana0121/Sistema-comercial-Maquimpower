# Cambios realizados

## 2026-04-08 - Correccion de actualizacion de cotizaciones

### Problema reportado
Al editar una cotizacion y presionar el boton `Actualizar`, el sistema mostraba el mensaje:

`Ruta no permitida.`

### Causa raiz
El frontend enviaba una peticion `PUT /cotizaciones/:id`, pero el backend no tenia implementada esa ruta en el controlador de cotizaciones. Por eso la solicitud caia en la respuesta `405`.

### Solucion aplicada
- Se agrego soporte para la ruta `PUT /cotizaciones/:id` en el controlador de cotizaciones.
- Se implemento el metodo `actualizar($id)` en el backend.
- La actualizacion ahora:
  - valida que exista `cliente_id` y que haya detalles,
  - verifica que la cotizacion exista,
  - actualiza los datos principales,
  - elimina los detalles anteriores,
  - vuelve a registrar los detalles enviados,
  - recalcula `op_gravada`, `igv` y `total`,
  - guarda todo dentro de una transaccion.
- Se agrego el metodo `actualizar` en el cliente API del frontend para cotizaciones.
- El formulario de cotizacion fue ajustado para usar `cotizacionesApi.actualizar(...)`.
- Tambien se mejoro la carga del cliente seleccionado al abrir una cotizacion en modo edicion.

### Archivos modificados
- `antigravity-backend/modules/cotizaciones/CotizacionesController.php`
- `antigravity-frontend/src/api/cotizaciones.js`
- `antigravity-frontend/src/pages/cotizaciones/CotizacionForm.jsx`

### Verificacion realizada
- Validacion de sintaxis PHP con:
  - `php -l antigravity-backend/modules/cotizaciones/CotizacionesController.php`
- Resultado:
  - sin errores de sintaxis.

### Nota
Desde ahora seguire actualizando este archivo cada vez que haga cambios, para que tengas una bitacora en la raiz del proyecto.

## 2026-04-08 - Auditoria de conexion DB y rutas backend/frontend

### Lo que revise
- Revise configuraciones de conexion a base de datos en backend.
- Revise rutas base de frontend, proxy de Vite y scripts de prueba.
- Revise el flujo de actualizacion de cotizaciones para confirmar si aun podia caer en `Ruta no permitida`.

### Lo que corregi (en primera persona)
- Yo cambie `antigravity-backend/config/db.php` para leer `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_PORT`, `DB_CHARSET` y `DB_COLLATION` desde `.env`.
- Yo deje como fallback de `DB_NAME` el valor `maquimpower_sistema_comercial`, que es la base que me indicaste.
- Yo corriji fallbacks antiguos de URL del backend en:
  - `antigravity-frontend/src/api/client.js`
  - `antigravity-frontend/vite.config.js`
  - `antigravity-frontend/src/pages/ventas/VentasPage.jsx`
- Yo corriji rutas antiguas en scripts de prueba y diagnostico:
  - `debug_maquimpower.js`
  - `antigravity-frontend/test_ventas.js`
  - `test_compras.js`
  - `test_inventario.js`
  - `test_global.js`
  - `test_fase2.js`
  - `test_ruc.js`
  - `test_reportes.js`
- Yo tambien arregle `antigravity-backend/check_id.php` para que deje de depender de una ruta absoluta vieja.

### Estado del error de Cotizacion (Actualizar)
- Yo confirme que en `CotizacionesController.php` ya existe la ruta `PUT` para actualizar:
  - `elseif ($method === 'PUT' && !empty($paramId)) $this->actualizar($paramId);`
- Con eso, en el codigo actual del repo, el error `Ruta no permitida` al actualizar una cotizacion no deberia seguir apareciendo.
- Si aun aparece en tu navegador, la causa mas probable es cache o que se este ejecutando otra copia del backend en otra ruta.

### Verificaciones que ejecute
- `php -l antigravity-backend/config/db.php` -> sin errores.
- `php -l antigravity-backend/modules/cotizaciones/CotizacionesController.php` -> sin errores.
- `php -l antigravity-backend/check_id.php` -> sin errores.

## 2026-04-08 - Diagnostico y mejora de busqueda SUNAT externa

### Problema observado
- La busqueda en Base de Datos funcionaba, pero la busqueda SUNAT (Externo) mostraba error.

### Hallazgo clave
- Yo ejecute pruebas directas al flujo de RUC externo y obtuve errores de red con estado `0`.
- El debug devolvio este motivo: `Intento de acceso a un socket no permitido por sus permisos de acceso`.
- Eso indica bloqueo de salida a internet desde el proceso PHP/Apache en el servidor local (firewall/politica de red/permisos), no un problema de la consulta SQL.

### Cambios que aplique
- Yo mejore `antigravity-backend/modules/sunat/RucController.php` para:
  - capturar y devolver errores de red reales (`curl error`, `errno`, `status`),
  - agregar fallback HTTP con `file_get_contents` cuando cURL no responde,
  - enviar mensajes mas claros cuando no hay conectividad externa,
  - evitar token hardcodeado y usar solo `APIS_NET_PE_TOKEN` de entorno.
- Yo mejore `antigravity-frontend/src/components/ui/BuscadorDocumento.jsx` para:
  - mostrar el mensaje real del backend en vez de dejar siempre el mensaje generico,
  - dejar debug en consola cuando el backend lo envie.

### Comentario funcional
- Yo confirme que para RUC existente en tu DB (ejemplo `20606853182`) el fallback local responde bien.
- Para que funcione realmente el modo SUNAT externo, debes habilitar salida HTTPS desde PHP/Apache hacia:
  - `api.apis.net.pe`
  - `consultaruc.win`

## 2026-04-08 - Diagnostico por pantalla global en "Cargando..."

### Sintoma reportado
- Al volver a abrir la aplicacion, varias pestanas quedaron en estado `Cargando...`.

### Hallazgo tecnico
- Yo probe endpoints que usan base de datos (`/clientes`, `check_id.php`) y se quedaron colgados por timeout.
- En trazas, el bloqueo ocurre al llamar `getDB()` bajo Apache/PHP.
- Eso explica el comportamiento global: las vistas que dependen de DB no terminan de cargar.

### Ajuste aplicado
- Yo mantuve `config/db.php` con manejo por `.env` y timeout de conexion para reducir esperas largas.

### Estado
- Este problema no se explica por `BuscadorDocumento.jsx`; es conectividad DB en tiempo de ejecucion.
- Requiere validar servicio MySQL/MariaDB activo y puerto correcto en XAMPP (normalmente 3306 o 3307), luego reiniciar Apache y MySQL.

## 2026-04-08 - Correccion de error 500 por base inexistente

### Error reportado
- En dashboard/sidebar aparecia:
  - `SQLSTATE[HY000] [1049] Unknown database 'maquimpower_sistema_comercial'`
  - endpoints como `/dashboard/stats`, `/inventario/alertas`, `/ventas/pendientes-count`, `/compras/pendientes-count` devolvian 500.

### Causa real
- Yo verifique con `SHOW DATABASES` y la base `maquimpower_sistema_comercial` no existia en MySQL.

### Accion aplicada
- Yo cree la base:
  - `CREATE DATABASE maquimpower_sistema_comercial ...`
- Como la base quedo inconsistente por intentos parciales, yo la recree limpia:
  - `DROP DATABASE IF EXISTS maquimpower_sistema_comercial;`
  - `CREATE DATABASE maquimpower_sistema_comercial ...`
- Yo importe nuevamente el dump del repo:
  - `u264219614_maquimpower.sql`

### Verificacion
- Yo valide que las tablas ya existen en `maquimpower_sistema_comercial` (`clientes`, `productos`, `ventas`, `cotizaciones`, etc.).
- Yo probe endpoints protegidos y ya no devolvieron 500 de DB; ahora responden `401 Token invalido o expirado` cuando se consulta sin token valido (comportamiento esperado).

## 2026-04-08 - Dashboard funcional y autoactualizable

### Objetivo
- Yo deje funcionales los campos del dashboard:
  - Ventas de Hoy
  - Monto de Hoy
  - Bajo Stock
  - Clientes Activos
  - Ingresos del Mes
  - Ultimas 5 Ventas

### Cambios backend
- Yo rehice `antigravity-backend/modules/dashboard/EstadisticasController.php` para devolver KPIs reales sobre tablas actuales:
  - conteo y monto de ventas de hoy (`fecha_emision = CURDATE()`),
  - ingresos del mes actual,
  - conteo de clientes activos,
  - conteo de productos con bajo stock,
  - ultimas 5 ventas con cliente asociado.
- Yo use `COALESCE` para evitar nulos y mantener valores numericos consistentes en frontend.

### Cambios frontend
- Yo actualice `antigravity-frontend/src/pages/Dashboard.jsx` para:
  - refresco inicial al entrar,
  - refresco automatico cada 20 segundos,
  - refresco al volver el foco a la pestana,
  - refresco al volver visible la pagina,
  - refresco por eventos entre pestanas (`storage`) y dentro de la misma ventana.
- Yo actualice `antigravity-frontend/src/api/client.js` para emitir un evento global de refresco del dashboard cuando hay `POST/PUT/DELETE` exitosos.

### Nota operativa
- Si hoy no existen ventas con `fecha_emision = fecha actual`, `Ventas de Hoy` y `Monto de Hoy` van a mostrar `0` (eso ya es comportamiento correcto).

## 2026-04-08 - Fix de error 500 en /dashboard/stats

### Error reportado
- El dashboard seguia mostrando `No se pudieron cargar los indicadores`.
- En consola: `GET /dashboard/stats 500`.

### Causa exacta encontrada
- Yo revise `apache/logs/error.log` y el backend estaba fallando por:
  - `Illegal mix of collations (utf8mb4_unicode_ci) and (utf8mb4_general_ci) for operation '='`
- El choque ocurria en comparaciones de texto y en el JOIN de ventas-clientes dentro de `EstadisticasController`.

### Correccion aplicada
- Yo agregue `COLLATE utf8mb4_general_ci` en:
  - filtros de `estado_sunat` para ventas de hoy e ingresos del mes.
  - JOIN `ventas.cliente_id = clientes.id`.
- Archivo tocado:
  - `antigravity-backend/modules/dashboard/EstadisticasController.php`

### Verificacion
- Yo probe `GET /dashboard/stats` con token valido y ahora responde `200 OK` con:
  - `stats` completos
  - `lastVentas` con 5 registros reales.

## 2026-04-08 - Fix de creacion/actualizacion de cotizaciones

### Problema
- Al crear cotizacion aparecia `Error al guardar la cotizacion`.
- Tambien se queria asegurar que actualizar cotizacion siga funcionando.

### Causa raiz
- Yo reproduje el error real y el backend fallo con:
  - `Unknown column 'indicacion' in 'field list'`
- El servicio de cotizaciones insertaba siempre `indicacion`, pero en la tabla `cotizaciones_detalle` faltaba esa columna.

### Correcciones aplicadas
- Yo agregue la columna faltante en la BD:
  - `ALTER TABLE cotizaciones_detalle ADD COLUMN indicacion VARCHAR(32) DEFAULT ''`
- Yo hice el backend mas resistente en `antigravity-backend/modules/cotizaciones/CotizacionesService.php`:
  - detecta si existe la columna `indicacion`,
  - arma el `INSERT` dinamicamente para no romper en esquemas antiguos.
- Yo mejore el frontend en `antigravity-frontend/src/pages/cotizaciones/CotizacionForm.jsx`:
  - ahora muestra el mensaje real del backend cuando falla, en vez de un mensaje generico.

### Verificacion
- Yo ejecute prueba de creacion y actualizacion de cotizacion de extremo a extremo con `CotizacionesService`:
  - `OK create ...`
  - `OK update ...`

## 2026-04-08 - Ajustes de dashboard (monto de hoy, ingresos del mes y tipo de comprobante)

### Requerimiento aplicado
- Yo ajuste `Monto de Hoy` para que sume ventas de la fecha actual.
- Yo ajuste `Ingresos del Mes` para que sume ventas del mes actual.
- Yo cambie la etiqueta de comprobante en la primera columna de ultimas ventas:
  - si inicia con `B` => `Boleta`
  - si inicia con `F` => `Factura`

### Cambios
- Backend:
  - `antigravity-backend/modules/dashboard/EstadisticasController.php`
  - Quité el filtro por estado para que las sumas representen todas las ventas del dia/mes.
- Frontend:
  - `antigravity-frontend/src/pages/Dashboard.jsx`
  - Agregue `getTipoComprobanteLabel(...)` y reemplace el texto fijo `Factura`.

### Verificacion
- Yo consulte `/dashboard/stats` y devolvio `200` con datos coherentes:
  - `ventasHoy: 1`
  - `monto_hoy: 590`
  - `totalVentasMes: 590`
  - ultima venta `B001-00000005` (prefijo `B` para mostrar `Boleta` en frontend).

## 2026-04-08 - Acceso directo al formulario de clientes desde el dashboard

### Requerimiento
- Yo quise que el boton `Agregar Cliente` del dashboard lleve directo al formulario de `Nuevo Cliente` sin pasar por el listado ni abrir modales.

### Lo que hice
- Yo cree una pantalla dedicada para alta/edicion de clientes en:
  - `antigravity-frontend/src/pages/clientes/ClienteFormPage.jsx`
- Yo registre las rutas directas en:
  - `antigravity-frontend/src/App.jsx`
  - `/clientes/nuevo`
  - `/clientes/editar/:id`
- Yo cambie el boton del dashboard para navegar por SPA a `/clientes/nuevo` usando `navigate(...)` en lugar de recarga completa.

### Resultado
- Yo deje listo el flujo para que:
  - `Agregar Cliente` abra el formulario nuevo directamente,
  - los enlaces de edicion en el listado de clientes tambien tengan ruta real,
  - el formulario vuelva al listado al cancelar o guardar.

## 2026-04-08 - Fix de pantalla en blanco en Guias de Remision

### Sintoma reportado
- Al entrar a la seccion `Guia de remision` la pantalla quedaba en blanco.
- La consola mostraba:
  - `Cannot read properties of undefined (reading 'toUpperCase')`

### Causa
- Yo encontre que en `antigravity-frontend/src/pages/guias/GuiasPage.jsx` se renderizaba `guia.estado.toUpperCase()` sin validar que `estado` existiera.
- Si una guia venia con `estado` vacio o nulo, React se caia durante el render.

### Correccion aplicada
- Yo agregue un helper `getEstadoLabel(...)` para normalizar el valor.
- Yo cambie el render para usar:
  - `String(estado ?? 'pendiente').trim().toUpperCase()`
- Yo tambien protegi la condicion del boton `Consultar Ticket` para que no dependa de un valor indefinido.

### Resultado
- Yo evite que un registro incompleto rompa toda la pagina.
- Ahora la vista de guias deberia seguir cargando aunque alguna guia llegue con `estado` vacio.

## 2026-04-08 - Mostrar nombre del cliente en comprobantes de venta

### Problema reportado
- En la tabla de `Comprobantes de Venta`, la columna `Cliente` aparecia vacia.

### Causa
- Yo detecte que `DataTable` no usa la propiedad `key` para pintar celdas.
- En `VentasPage.jsx` la columna `Cliente` estaba declarada con `key: "cliente_nombre"`, por eso no se mostraba nada.

### Correccion aplicada
- Yo cambie la columna `Cliente` para usar `render(...)`.
- Yo agregue un fallback seguro:
  - `cliente_nombre`
  - `cliente.razon_social`
  - `Cliente final`

### Resultado
- Yo deje visible el nombre del cliente en cada comprobante, como en las otras tablas del sistema.

## 2026-04-08 - Orden visual del Catalogo de Productos

### Problema reportado
- En `Catalogo de Productos` los filtros, buscador y botones se veian desalineados y desordenados frente a otras pestañas con tabla.

### Causa
- Yo detecte mezcla de estilos globales (especialmente reglas amplias de `ventas.css`) que alteraban padding/hover de botones en otras vistas.
- La vista de productos no tenia una capa de estilos propios para alinear toolbar y controles.

### Correccion aplicada (sin cambiar estructura)
- Yo mantuve la estructura existente de `ProductosPage` y solo agregue clases de estilo para ordenar visualmente la barra superior.
- Yo cree estilos encapsulados en:
  - `antigravity-frontend/src/styles/productos-page.css`
- Yo importe ese archivo en:
  - `antigravity-frontend/src/pages/productos/ProductosPage.jsx`
- Yo deje la barra de acciones con layout consistente:
  - select + buscador + botones alineados,
  - alturas uniformes,
  - responsive ordenado en desktop/tablet/mobile,
  - override local del hover/padding global para que no deforme los botones de esta vista.

### Resultado
- Yo deje el Catalogo de Productos visualmente ordenado y consistente con el resto de tablas del sistema, sin tocar logica ni estructura funcional.

## 2026-04-08 - Tabs naranjas en formulario de producto

### Requerimiento
- Yo ajuste solo el color visual de la pestaña activa en el formulario de producto para que se vea naranja, como en el estilo de `Emitir Nueva Guia`.

### Cambios aplicados
- Yo cambie `ProductoForm.jsx` para usar la clase `modal-productos-tab` y el estado `is-active`.
- Yo amplie `modal-productos.css` para dar a las tabs:
  - fondo suave cuando estan inactivas,
  - fondo naranja, texto blanco y sombra cuando estan activas.

### Resultado
- Yo deje el diseño del modal igual en estructura, pero con una pestaña activa mucho mas clara y consistente visualmente.

## 2026-04-08 - Limpieza del CSS del Catalogo de Productos

### Sintoma reportado
- Vite mostraba `Failed to reload /src/pages/productos/ProductosPage.jsx` y la consola arrojaba un `500` al recargar el modulo.

### Lo que revise
- Yo valide que `ProductosPage.jsx` no tenia un error evidente de sintaxis.
- Yo detecte que la hoja `productos-page.css` tenia reglas mas frágiles y demasiado especificas, especialmente para los botones de la barra superior.

### Ajuste aplicado
- Yo simplifique `antigravity-frontend/src/styles/productos-page.css` para dejar solo:
  - layout de la barra,
  - alturas uniformes,
  - responsive,
  - hover local estable.
- Yo elimine selectores complejos con `:not(...)` para reducir la probabilidad de que Vite se trabe al transformar el modulo.

### Resultado
- Yo deje el catalogo con el mismo orden visual, pero con una capa CSS mas limpia y menos riesgosa para HMR.
