// ═══════════════════════════════════════════════════════════════════════════════
// MAQUIMPOWER — BATERÍA DE PRUEBAS GLOBAL v2.0
// Cubre: Auth · Clientes · Productos · Ventas · Inventario · Dashboard
//        Reportes · Proveedores · Compras · Caja · SUNAT/RUC
// Ejecutar: node test_global.js
// Requisito: Node 18+ (fetch nativo)
// ═══════════════════════════════════════════════════════════════════════════════

const API = 'http://localhost/Maquimpower_Sistema_Comercial_1.0/antigravity-backend';

// ─── IDs reales de la BD ───────────────────────────────────────────────────────
const IDS = {
    cliente: "b3d0e6c6-1ca5-11f1-977b-d843aea88809",
    producto: "d478d2b9-1cd2-11f1-977b-d843aea88809",
    venta: "43e28227-24ba-11f1-8aa8-d843aea88809",
};

// ─── Credenciales ──────────────────────────────────────────────────────────────
const CREDS = { email: "admin@maquimpower.com", password: "password" };

// ─── Estado global ─────────────────────────────────────────────────────────────
let TOKEN = null;
const results = [];
let proveedorCreado = null;
let compraCreada = null;
let cajaMovCreado = null;

// ─── Colores ANSI ──────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', gray: '\x1b[90m', white: '\x1b[97m',
    bgGreen: '\x1b[42m', bgRed: '\x1b[41m', bgYellow: '\x1b[43m',
};

function log(msg) { process.stdout.write(msg); }
function nl() { process.stdout.write('\n'); }

function header(title) {
    nl();
    log(`${C.bold}${C.cyan}┌─────────────────────────────────────────┐${C.reset}\n`);
    log(`${C.bold}${C.cyan}│  ${title.padEnd(39)}│${C.reset}\n`);
    log(`${C.bold}${C.cyan}└─────────────────────────────────────────┘${C.reset}\n`);
}

function pass(name, detail = '') { log(`  ${C.green}✅ PASS${C.reset}  ${name}${detail ? C.gray + '  → ' + detail + C.reset : ''}`); nl(); results.push({ status: 'PASS', name, detail }); }
function fail(name, detail = '') { log(`  ${C.red}❌ FAIL${C.reset}  ${name}${detail ? C.red + '  → ' + detail + C.reset : ''}`); nl(); results.push({ status: 'FAIL', name, detail }); }
function warn(name, detail = '') { log(`  ${C.yellow}⚠️  WARN${C.reset}  ${name}${detail ? C.gray + '  → ' + detail + C.reset : ''}`); nl(); results.push({ status: 'WARN', name, detail }); }
function info(msg) { log(`  ${C.gray}ℹ  ${msg}${C.reset}\n`); }

async function req(method, endpoint, body = null, useToken = true) {
    const t0 = Date.now();
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (useToken && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API}${endpoint}`, opts);
        const raw = await res.text();
        const ms = Date.now() - t0;
        let data;
        try { data = JSON.parse(raw); }
        catch { return { ok: false, status: res.status, data: null, raw, ms, error: 'JSON inválido' }; }
        return { ok: res.ok, status: res.status, data, ms };
    } catch (e) {
        return { ok: false, status: 0, data: null, error: e.message, ms: 0 };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 1 — AUTH
// ═══════════════════════════════════════════════════════════════════════════════
async function testAuth() {
    header('MÓDULO 1 — AUTENTICACIÓN JWT');

    const r1 = await req('POST', '/auth/login', CREDS, false);
    if (r1.ok && r1.data?.success && r1.data?.data?.token) {
        TOKEN = r1.data.data.token;
        pass('POST /auth/login', `Token obtenido · ${r1.ms}ms`);
        info(`Rol: ${r1.data.data.user?.rol} · Email: ${r1.data.data.user?.email}`);
    } else {
        fail('POST /auth/login', r1.data?.message || `HTTP ${r1.status}`);
    }

    const r2 = await req('POST', '/auth/login', { email: 'x@x.com', password: 'wrong' }, false);
    if (r2.status === 401) pass('POST /auth/login — inválido → 401');
    else fail('POST /auth/login — inválido', `Esperado 401, recibido ${r2.status}`);

    const r3 = await req('GET', '/auth/me');
    if (r3.ok && r3.data?.success) pass('GET /auth/me', `${r3.ms}ms`);
    else fail('GET /auth/me', r3.data?.message || `HTTP ${r3.status}`);

    const r4 = await req('GET', '/auth/me', null, false);
    if (r4.status === 401) pass('GET /auth/me sin token → 401');
    else fail('GET /auth/me sin token', `Esperado 401, recibido ${r4.status}`);

    const r5 = await req('GET', '/auth/usuarios');
    if (r5.ok && r5.data?.success) pass('GET /auth/usuarios', `${r5.data.data?.length ?? 0} usuarios · ${r5.ms}ms`);
    else fail('GET /auth/usuarios', r5.data?.message || `HTTP ${r5.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 2 — CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════
async function testClientes() {
    header('MÓDULO 2 — CLIENTES');
    let clienteCreado = null;

    const r1 = await req('GET', '/clientes');
    if (r1.ok && r1.data?.success) pass('GET /clientes', `${r1.data.data?.length ?? 0} registros · ${r1.ms}ms`);
    else fail('GET /clientes', r1.data?.message || `HTTP ${r1.status}`);

    const ruc = '20' + Date.now().toString().slice(-9);
    const body = { tipo_documento: 'RUC', numero_documento: ruc, razon_social: 'EMPRESA TEST AUTO S.A.C.', direccion: 'Av. Test 123' };
    const r2 = await req('POST', '/clientes', body);
    if (r2.ok && r2.data?.success) {
        clienteCreado = r2.data.data?.id;
        pass('POST /clientes — crear', `ID: ${clienteCreado} · ${r2.ms}ms`);
    } else fail('POST /clientes — crear', r2.data?.message || `HTTP ${r2.status}`);

    if (clienteCreado) {
        const r3 = await req('GET', `/clientes/${clienteCreado}`);
        if (r3.ok && r3.data?.success) pass('GET /clientes/:id', `${r3.ms}ms`);
        else fail('GET /clientes/:id', r3.data?.message);

        const r4 = await req('PUT', `/clientes/${clienteCreado}`, { ...body, telefono: '988000001' });
        if (r4.ok && r4.data?.success) pass('PUT /clientes/:id', `${r4.ms}ms`);
        else fail('PUT /clientes/:id', r4.data?.message);

        const r5 = await req('DELETE', `/clientes/${clienteCreado}`);
        if (r5.ok && r5.data?.success) pass('DELETE /clientes/:id — soft delete', `${r5.ms}ms`);
        else fail('DELETE /clientes/:id', r5.data?.message);
    }

    const r6 = await req('GET', `/clientes/${IDS.cliente}`);
    if (r6.ok && r6.data?.success) pass('GET /clientes/:id — seed', `${r6.ms}ms`);
    else warn('GET /clientes/:id — seed', r6.data?.message);

    const r7 = await req('POST', '/clientes', body);
    if (r7.status === 409 || r7.status === 422) pass('POST /clientes — duplicado → 409/422');
    else warn('POST /clientes — duplicado', `Esperado 409/422, recibido ${r7.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 3 — PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════════
async function testProductos() {
    header('MÓDULO 3 — PRODUCTOS');

    const r1 = await req('GET', '/productos');
    if (r1.ok && r1.data?.success) pass('GET /productos', `${r1.data.data?.length ?? 0} registros · ${r1.ms}ms`);
    else fail('GET /productos', r1.data?.message || `HTTP ${r1.status}`);

    const sku = 'TEST-' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-3);
    const body = { codigo_interno: sku, sku, descripcion: `Producto test ${sku}`, precio_unitario_sin_igv: 100, stock_actual: 10, stock_minimo: 2, unidad_medida: 'NIU', tipo_afectacion_igv: '10' };
    const r2 = await req('POST', '/productos', body);
    if (r2.status === 200 && r2.data?.success !== false) pass('POST /productos — crear', `SKU: ${sku} · ${r2.ms}ms`);
    else fail('POST /productos — crear', r2.data?.message || `HTTP ${r2.status}`);

    const r3 = await req('GET', `/productos/${IDS.producto}`);
    if (r3.ok && r3.data?.success) pass('GET /productos/:id — seed', `${r3.ms}ms`);
    else fail('GET /productos/:id', r3.data?.message);

    const r4 = await req('POST', '/productos', { descripcion: 'Sin codigo' });
    if (r4.status === 422) pass('POST /productos — sin campos → 422');
    else warn('POST /productos — validación 422', `Recibido ${r4.status}`);

    const r5 = await req('GET', '/productos/alertas');
    if (r5.ok && r5.data?.success) pass('GET /productos/alertas', `${r5.data.count ?? 0} alertas · ${r5.ms}ms`);
    else fail('GET /productos/alertas', r5.data?.message);

    const r6 = await req('POST', '/productos', { ...body, codigo_interno: sku + '-NEG', precio_unitario_sin_igv: -50 });
    if (r6.status === 422) pass('POST /productos — precio negativo → 422');
    else warn('POST /productos — precio negativo', `Recibido ${r6.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 4 — VENTAS + SUNAT
// ═══════════════════════════════════════════════════════════════════════════════
async function testVentas() {
    header('MÓDULO 4 — VENTAS + SUNAT');
    let ventaCreada = null;

    const r1 = await req('GET', '/ventas?limit=5');
    if (r1.ok && r1.data?.success) pass('GET /ventas', `${r1.data.data?.length ?? 0} registros · ${r1.ms}ms`);
    else fail('GET /ventas', r1.data?.message || `HTTP ${r1.status}`);

    const r2 = await req('GET', `/ventas/${IDS.venta}`);
    if (r2.ok && r2.data?.success) { pass('GET /ventas/:id — seed', `${r2.ms}ms`); info(`detalles: ${r2.data.data?.detalles?.length ?? 0} línea(s)`); }
    else fail('GET /ventas/:id', r2.data?.message);

    const payload = {
        cliente_id: IDS.cliente, tipo_comprobante: '01', serie: 'F001',
        condicion_pago: 'CONTADO', moneda: 'PEN', op_gravada: 169.49, igv: 30.51, importe_total: 200.00,
        detalles: [{
            producto_id: IDS.producto, codigo_producto: 'TEST-001', descripcion: 'Producto test global',
            unidad_medida: 'NIU', cantidad: 2, valor_unitario: 84.75, precio_unitario: 100.00,
            descuento_unitario: 0, tipo_afectacion_igv: '10'
        }]
    };
    const r3 = await req('POST', '/ventas', payload);
    if (r3.ok && r3.data?.success) {
        ventaCreada = r3.data.data?.id;
        pass('POST /ventas — crear', `${r3.data.data?.numero_completo} · ${r3.ms}ms`);
    } else fail('POST /ventas — crear', r3.data?.message || `HTTP ${r3.status}`);

    if (ventaCreada) {
        const r4 = await req('POST', `/ventas/${ventaCreada}/reintentar`);
        if (r4.status === 200) pass('POST /ventas/:id/reintentar', `${r4.ms}ms`);
        else warn('POST /ventas/:id/reintentar', `HTTP ${r4.status}`);

        const r5 = await req('DELETE', `/ventas/${ventaCreada}`);
        if (r5.ok && r5.data?.success) pass('DELETE /ventas/:id — soft delete', `${r5.ms}ms`);
        else fail('DELETE /ventas/:id', r5.data?.message);
    }

    const r6 = await req('POST', '/ventas', { cliente_id: IDS.cliente, tipo_comprobante: '01' });
    if (r6.status === 422) pass('POST /ventas — sin detalles → 422');
    else warn('POST /ventas — validación 422', `Recibido ${r6.status}`);

    const r7 = await req('GET', '/ventas?estado_sunat=ANULADO&limit=3');
    if (r7.ok && r7.data?.success) pass('GET /ventas — filtro estado', `${r7.data.data?.length ?? 0} resultados · ${r7.ms}ms`);
    else warn('GET /ventas — filtro', r7.data?.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 5 — INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════
async function testInventario() {
    header('MÓDULO 5 — INVENTARIO');

    const r1 = await req('GET', '/inventario');
    if (r1.ok && r1.data?.success) pass('GET /inventario', `${r1.data.data?.length ?? 0} productos · ${r1.ms}ms`);
    else fail('GET /inventario', r1.data?.message || `HTTP ${r1.status}`);

    const r2 = await req('GET', '/inventario/alertas');
    if (r2.ok && r2.data?.success) pass('GET /inventario/alertas', `${r2.data.count ?? 0} alertas · ${r2.ms}ms`);
    else fail('GET /inventario/alertas', r2.data?.message);

    const bodyMov = { producto_id: IDS.producto, tipo_movimiento: 'ENTRADA', cantidad: 5, motivo: 'Test entrada v2' };
    const r3 = await req('POST', '/inventario/movimiento', bodyMov);
    if (r3.ok && r3.data?.success) pass('POST /inventario/movimiento — ENTRADA', `${r3.ms}ms`);
    else fail('POST /inventario/movimiento — ENTRADA', r3.data?.message);

    const r4 = await req('POST', '/inventario/movimiento', { ...bodyMov, tipo_movimiento: 'SALIDA', cantidad: 2 });
    if (r4.ok && r4.data?.success) pass('POST /inventario/movimiento — SALIDA', `${r4.ms}ms`);
    else fail('POST /inventario/movimiento — SALIDA', r4.data?.message);

    const r5 = await req('GET', `/inventario/kardex?producto_id=${IDS.producto}`);
    if (r5.ok && r5.data?.success) pass('GET /inventario/kardex', `${r5.data.data?.length ?? 0} movimientos · ${r5.ms}ms`);
    else warn('GET /inventario/kardex', r5.data?.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 6 — DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function testDashboard() {
    header('MÓDULO 6 — DASHBOARD');

    const r1 = await req('GET', '/dashboard/stats');
    if (r1.ok && r1.data?.success) {
        const s = r1.data.data?.stats;
        pass('GET /dashboard/stats', `${r1.ms}ms`);
        info(`ventasHoy: ${s?.ventasHoy} · totalMes: S/${s?.totalVentasMes} · clientes: ${s?.clientesActivos} · stock: ${s?.productosBajoStock}`);
    } else fail('GET /dashboard/stats', r1.data?.message || `HTTP ${r1.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 7 — SUNAT / RUC
// ═══════════════════════════════════════════════════════════════════════════════
async function testSunat() {
    header('MÓDULO 7 — SUNAT / RUC');

    const r1 = await req('GET', '/sunat/ruc?numero=20606853182');
    if (r1.ok && r1.data?.success) { pass('GET /sunat/ruc — RUC válido', `${r1.ms}ms`); info(`Razón social: ${r1.data.data?.nombre || r1.data.data?.razon_social}`); }
    else warn('GET /sunat/ruc', r1.data?.message || `HTTP ${r1.status}`);

    const r2 = await req('GET', '/sunat/ruc?numero=00000000000');
    if (!r2.data?.success && r2.status !== 500) pass('GET /sunat/ruc — RUC inválido manejado');
    else if (r2.status === 500) fail('GET /sunat/ruc — RUC inválido lanza 500');
    else warn('GET /sunat/ruc — RUC inválido', `HTTP ${r2.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 8 — REPORTES
// ═══════════════════════════════════════════════════════════════════════════════
async function testReportes() {
    header('MÓDULO 8 — REPORTES');
    const params = 'fecha_desde=2026-01-01&fecha_hasta=2026-12-31';

    const r1 = await req('GET', `/reportes/ventas-por-dia?${params}`);
    if (r1.ok && r1.data?.success) pass('GET /reportes/ventas-por-dia', `${r1.data.data?.length ?? 0} días · ${r1.ms}ms`);
    else fail('GET /reportes/ventas-por-dia', r1.data?.message || `HTTP ${r1.status}`);

    const r2 = await req('GET', `/reportes/top-productos?${params}&limit=5`);
    if (r2.ok && r2.data?.success) pass('GET /reportes/top-productos', `${r2.data.data?.length ?? 0} productos · ${r2.ms}ms`);
    else fail('GET /reportes/top-productos', r2.data?.message || `HTTP ${r2.status}`);

    const r3 = await req('GET', `/reportes/movimientos-stock?${params}`);
    if (r3.ok && r3.data?.success) pass('GET /reportes/movimientos-stock', `${r3.data.data?.length ?? 0} registros · ${r3.ms}ms`);
    else fail('GET /reportes/movimientos-stock', r3.data?.message || `HTTP ${r3.status}`);

    // Sin token → 401
    const r4 = await req('GET', `/reportes/ventas-por-dia?${params}`, null, false);
    if (r4.status === 401) pass('GET /reportes — sin token → 401');
    else warn('GET /reportes — sin token', `Esperado 401, recibido ${r4.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 9 — PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════════
async function testProveedores() {
    header('MÓDULO 9 — PROVEEDORES');

    const r1 = await req('GET', '/proveedores');
    if (r1.ok && r1.data?.success) pass('GET /proveedores', `${r1.data.data?.length ?? 0} registros · ${r1.ms}ms`);
    else fail('GET /proveedores', r1.data?.message || `HTTP ${r1.status}`);

    const ruc = '20' + Date.now().toString().slice(-9);
    const body = { tipo_documento: 'RUC', numero_documento: ruc, razon_social: 'PROVEEDOR TEST S.A.C.', condicion_pago: 'CONTADO' };
    const r2 = await req('POST', '/proveedores', body);
    if (r2.ok && r2.data?.success) {
        proveedorCreado = r2.data.data?.id;
        pass('POST /proveedores — crear', `ID: ${proveedorCreado} · ${r2.ms}ms`);
    } else fail('POST /proveedores — crear', r2.data?.message || `HTTP ${r2.status}`);

    if (proveedorCreado) {
        const r3 = await req('GET', `/proveedores/${proveedorCreado}`);
        if (r3.ok && r3.data?.success) pass('GET /proveedores/:id', `${r3.ms}ms`);
        else fail('GET /proveedores/:id', r3.data?.message);

        const r4 = await req('PUT', `/proveedores/${proveedorCreado}`, { ...body, telefono: '999000001' });
        if (r4.ok && r4.data?.success) pass('PUT /proveedores/:id — actualizar', `${r4.ms}ms`);
        else fail('PUT /proveedores/:id', r4.data?.message);
    }

    // Sin campos obligatorios → 422
    const r5 = await req('POST', '/proveedores', { tipo_documento: 'RUC' });
    if (r5.status === 422) pass('POST /proveedores — sin campos → 422');
    else warn('POST /proveedores — validación 422', `Recibido ${r5.status}`);

    // Duplicado → 409
    const r6 = await req('POST', '/proveedores', body);
    if (r6.status === 409 || r6.status === 422) pass('POST /proveedores — duplicado → 409/422');
    else warn('POST /proveedores — duplicado', `Recibido ${r6.status}`);

    // Soft delete
    if (proveedorCreado) {
        const r7 = await req('DELETE', `/proveedores/${proveedorCreado}`);
        if (r7.ok && r7.data?.success) pass('DELETE /proveedores/:id — soft delete', `${r7.ms}ms`);
        else fail('DELETE /proveedores/:id', r7.data?.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 10 — COMPRAS
// ═══════════════════════════════════════════════════════════════════════════════
async function testCompras() {
    header('MÓDULO 10 — COMPRAS');

    const r1 = await req('GET', '/compras');
    if (r1.ok && r1.data?.success) pass('GET /compras', `${r1.data.data?.length ?? 0} registros · ${r1.ms}ms`);
    else fail('GET /compras', r1.data?.message || `HTTP ${r1.status}`);

    // Necesitamos un proveedor activo para crear la compra
    const provRes = await req('GET', '/proveedores');
    const provId = provRes.data?.data?.[0]?.id;

    if (!provId) { warn('POST /compras — crear', 'Sin proveedores activos en BD'); }
    else {
        const payload = {
            proveedor_id: provId,
            tipo_comprobante: 'FACTURA',
            numero_comprobante: 'F001-TEST-' + Date.now().toString().slice(-5),
            fecha_comprobante: new Date().toISOString().split('T')[0],
            moneda: 'PEN',
            detalles: [{
                producto_id: IDS.producto,
                descripcion: 'Producto test compra',
                unidad_medida: 'NIU',
                cantidad: 10,
                costo_unitario: 50.00,
            }]
        };
        const r2 = await req('POST', '/compras', payload);
        if (r2.ok && r2.data?.success) {
            compraCreada = r2.data.data?.id;
            pass('POST /compras — crear', `Total: S/${r2.data.data?.importe_total} · ${r2.ms}ms`);
            info('Stock del producto debe haber aumentado en 10 unidades');
        } else fail('POST /compras — crear', r2.data?.message || `HTTP ${r2.status}`);

        if (compraCreada) {
            const r3 = await req('GET', `/compras/${compraCreada}`);
            if (r3.ok && r3.data?.success) { pass('GET /compras/:id', `${r3.ms}ms`); info(`detalles: ${r3.data.data?.detalles?.length ?? 0} línea(s)`); }
            else fail('GET /compras/:id', r3.data?.message);

            const r4 = await req('DELETE', `/compras/${compraCreada}`);
            if (r4.ok && r4.data?.success) pass('DELETE /compras/:id — anular', `${r4.ms}ms`);
            else fail('DELETE /compras/:id', r4.data?.message);
        }
    }

    // Sin campos → 422
    const r5 = await req('POST', '/compras', { tipo_comprobante: 'FACTURA' });
    if (r5.status === 422) pass('POST /compras — sin proveedor_id → 422');
    else warn('POST /compras — validación 422', `Recibido ${r5.status}`);

    // Filtro por estado
    const r6 = await req('GET', '/compras?estado=PENDIENTE');
    if (r6.ok && r6.data?.success) pass('GET /compras — filtro estado', `${r6.data.data?.length ?? 0} resultados · ${r6.ms}ms`);
    else warn('GET /compras — filtro', r6.data?.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 11 — CAJA
// ═══════════════════════════════════════════════════════════════════════════════
async function testCaja() {
    header('MÓDULO 11 — CAJA');

    const r1 = await req('GET', '/caja/resumen');
    if (r1.ok && r1.data?.success) {
        pass('GET /caja/resumen', `${r1.ms}ms`);
        info(`saldo: S/${r1.data.data?.saldo_actual} · ingresos hoy: S/${r1.data.data?.ingresos_hoy}`);
    } else fail('GET /caja/resumen', r1.data?.message || `HTTP ${r1.status}`);

    const r2 = await req('GET', '/caja/saldo');
    if (r2.ok && r2.data?.success) pass('GET /caja/saldo', `S/${r2.data.data?.saldo_actual} · ${r2.ms}ms`);
    else fail('GET /caja/saldo', r2.data?.message || `HTTP ${r2.status}`);

    const r3 = await req('GET', '/caja');
    if (r3.ok && r3.data?.success) pass('GET /caja — listar movimientos', `${r3.data.data?.length ?? 0} movimientos · ${r3.ms}ms`);
    else fail('GET /caja', r3.data?.message || `HTTP ${r3.status}`);

    // Registrar ingreso
    const bodyIngreso = { tipo: 'INGRESO', monto: 500, forma_pago: 'EFECTIVO', origen: 'MANUAL', descripcion: 'Test ingreso automatizado' };
    const r4 = await req('POST', '/caja', bodyIngreso);
    if (r4.ok && r4.data?.success) {
        cajaMovCreado = r4.data.data?.id;
        pass('POST /caja — INGRESO', `Nuevo saldo: S/${r4.data.data?.saldo_nuevo} · ${r4.ms}ms`);
    } else fail('POST /caja — INGRESO', r4.data?.message || `HTTP ${r4.status}`);

    // Registrar egreso
    const r5 = await req('POST', '/caja', { tipo: 'EGRESO', monto: 100, forma_pago: 'YAPE', origen: 'GASTO', descripcion: 'Test egreso' });
    if (r5.ok && r5.data?.success) pass('POST /caja — EGRESO', `Nuevo saldo: S/${r5.data.data?.saldo_nuevo} · ${r5.ms}ms`);
    else fail('POST /caja — EGRESO', r5.data?.message || `HTTP ${r5.status}`);

    // Tipo inválido → 422
    const r6 = await req('POST', '/caja', { tipo: 'INVALIDO', monto: 100 });
    if (r6.status === 422) pass('POST /caja — tipo inválido → 422');
    else warn('POST /caja — validación tipo', `Recibido ${r6.status}`);

    // Monto cero → 422
    const r7 = await req('POST', '/caja', { tipo: 'INGRESO', monto: 0 });
    if (r7.status === 422) pass('POST /caja — monto cero → 422');
    else warn('POST /caja — validación monto', `Recibido ${r7.status}`);

    // Egreso mayor al saldo → 422
    const r8 = await req('POST', '/caja', { tipo: 'EGRESO', monto: 999999, forma_pago: 'EFECTIVO', origen: 'MANUAL' });
    if (r8.status === 422) pass('POST /caja — saldo insuficiente → 422');
    else warn('POST /caja — saldo insuficiente', `Recibido ${r8.status}`);

    // Filtro por fecha
    const hoy = new Date().toISOString().split('T')[0];
    const r9 = await req('GET', `/caja?fecha_desde=${hoy}&fecha_hasta=${hoy}`);
    if (r9.ok && r9.data?.success) pass('GET /caja — filtro fecha', `${r9.data.data?.length ?? 0} movimientos hoy`);
    else warn('GET /caja — filtro fecha', r9.data?.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTE FINAL
// ═══════════════════════════════════════════════════════════════════════════════
function printReport() {
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const pct = total ? Math.round((passed / total) * 100) : 0;

    nl();
    log(`${C.bold}${'═'.repeat(50)}${C.reset}\n`);
    log(`${C.bold}  REPORTE FINAL — MAQUIMPOWER TEST SUITE v2.0${C.reset}\n`);
    log(`${'═'.repeat(50)}\n`);
    nl();
    log(`  Total de pruebas : ${C.bold}${total}${C.reset}\n`);
    log(`  ${C.green}✅ Pasaron        : ${passed}${C.reset}\n`);
    log(`  ${C.red}❌ Fallaron        : ${failed}${C.reset}\n`);
    log(`  ${C.yellow}⚠️  Advertencias  : ${warned}${C.reset}\n`);
    log(`  Cobertura        : ${pct >= 80 ? C.green : pct >= 60 ? C.yellow : C.red}${pct}%${C.reset}\n`);
    nl();

    if (failed > 0) {
        log(`${C.red}${C.bold}  FALLOS:${C.reset}\n`);
        results.filter(r => r.status === 'FAIL').forEach(r => {
            log(`  ${C.red}→ ${r.name}${C.reset}\n`);
            if (r.detail) log(`    ${C.gray}${r.detail}${C.reset}\n`);
        });
        nl();
    }

    if (warned > 0) {
        log(`${C.yellow}${C.bold}  ADVERTENCIAS:${C.reset}\n`);
        results.filter(r => r.status === 'WARN').forEach(r => {
            log(`  ${C.yellow}→ ${r.name}${C.reset}\n`);
            if (r.detail) log(`    ${C.gray}${r.detail}${C.reset}\n`);
        });
        nl();
    }

    log(`${'═'.repeat(50)}\n`);
    if (pct === 100) log(`${C.bgGreen}${C.bold}  🎉 TODOS LOS TESTS PASARON — SISTEMA LISTO  ${C.reset}\n`);
    else if (pct >= 80) log(`${C.bgYellow}  ⚡ SISTEMA MAYORMENTE FUNCIONAL — REVISAR FALLOS  ${C.reset}\n`);
    else log(`${C.bgRed}  🛑 MÚLTIPLES FALLOS — NO DESPLEGAR AÚN  ${C.reset}\n`);
    nl();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
    nl();
    log(`${C.bold}${C.white}  MAQUIMPOWER — TEST SUITE v2.0 — 11 MÓDULOS${C.reset}\n`);
    log(`  ${C.gray}${new Date().toLocaleString('es-PE')} · API: ${API}${C.reset}\n`);

    await testAuth();
    await testClientes();
    await testProductos();
    await testVentas();
    await testInventario();
    await testDashboard();
    await testSunat();
    await testReportes();
    await testProveedores();
    await testCompras();
    await testCaja();

    printReport();
}

main().catch(e => { log(`\n${C.red}ERROR FATAL: ${e.message}${C.reset}\n`); process.exit(1); });