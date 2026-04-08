// ═══════════════════════════════════════════════════════════════════════════════
// MAQUIMPOWER — BATERÍA DE PRUEBAS GLOBAL AGRESIVA (CHAOS ENGINEERING) v3.0
// Diseñado para ROMPER el sistema, inyectar SQL, enviar campos malformados, 
// buscar debilidades de stock negativo y validar resiliencia del negocio.
// ═══════════════════════════════════════════════════════════════════════════════

// Yo sincronizo este script con la ruta real del backend en este repo.
const API = 'http://localhost/Sistema-comercial-Maquimpower/antigravity-backend';

// ─── Estado global ─────────────────────────────────────────────────────────────
let TOKEN = null;
const results = [];
let IDS = {
    cliente: "b3d0e6c6-1ca5-11f1-977b-d843aea88809",
    producto: "d478d2b9-1cd2-11f1-977b-d843aea88809",
    venta: "43e28227-24ba-11f1-8aa8-d843aea88809",
    proveedor: null
};

// ─── Colores ANSI ──────────────────────────────────────────────────────────────
const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', 
    yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m', white: '\x1b[97m',
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
// MÓDULO 1 — AUTH & SEGURIDAD (SQL Injection, XSS)
// ═══════════════════════════════════════════════════════════════════════════════
async function testGlobalAuth() {
    header('MÓDULO 1 — AUTH & SEGURIDAD (SQL INJECTION)');
    
    // 1. HAPPY PATH
    const r1 = await req('POST', '/auth/login', { email: "admin@maquimpower.com", password: "password" }, false);
    if (r1.ok && r1.data?.success) { TOKEN = r1.data.data.token; pass('POST /auth/login correcto'); }
    else fail('POST /auth/login (CRÍTICO)');

    // 2. CHAOS: Inyección SQL básica en Login
    const r2 = await req('POST', '/auth/login', { email: "' OR 1=1 --", password: "' OR '1'='1" }, false);
    if (r2.status === 401 || r2.status === 422) pass('SQLi Prevent (Login)', `Detenido por backend (${r2.status})`);
    else if (r2.ok) fail('SQLi Vulnerability (Login)', '¡Se logró iniciar sesión con payload SQL maldito!');
    else warn('SQLi Prevent (Login)', `Respondio ${r2.status}`);

    // 3. CHAOS: Fuerza Bruta / JSON Malformado
    const r3 = await req('POST', '/auth/login', "NOT_A_JSON_STRING", false);
    // Si la API no crashea (500) devolviendo HTML
    if (r3.status !== 500) pass('Protección contra JSON malformado', `HTTP ${r3.status}`);
    else fail('Protección JSON malformado', `Server Crashed (500)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 2 — CLIENTES (Overflows, Duplicados, Tipos Incorrectos)
// ═══════════════════════════════════════════════════════════════════════════════
async function testGlobalClientes() {
    header('MÓDULO 2 — CLIENTES (ABUSO DE DATA)');
    
    // 1. CHAOS: RUC extremadamente largo / letras en lugar de números
    const bodyMalo = { tipo_documento: 'RUC', numero_documento: 'ESTOESUNRUC123INTENTANDOROMPERLAUNICA', razon_social: 'Chaos SA' };
    const r1 = await req('POST', '/clientes', bodyMalo);
    // Asumimos que la BD limitará el RUC a ~11 o 20 chars max.
    if (r1.status === 422 || r1.status === 400 || r1.status === 500) {
        if(r1.status === 500) warn('Abuso de longitud / tipo', 'BD arrojó 500 (falta validación previa de largo)');
        else pass('Protección contra RUC larguísimo', `Bloqueado (${r1.status})`);
    } else fail('Abuso de longitud / tipo', `Permitió guardar basura (${r1.status})`);

    // 2. CHAOS: SQLi en ?search=
    const r2 = await req('GET', "/clientes?search=' OR 1=1; DROP TABLE ventas;--");
    if (r2.status === 200 && r2.data?.success) pass('Prevención de SQLi en Búsqueda');
    else if (r2.status === 500) fail('SQLi Search', 'La base de datos crasheó con la consulta maliciosa.');
    else warn('SQLi Search', `Comportamiento inesperado ${r2.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 3 — PRODUCTOS (Precios Negativos, Valores Nulos)
// ═══════════════════════════════════════════════════════════════════════════════
async function testGlobalProductos() {
    header('MÓDULO 3 — PRODUCTOS (REGLAS DE NEGOCIO)');
    
    const sku = 'SKU' + Date.now();
    // 1. CHAOS: Producto costo mayor al precio de venta
    const body = { codigo_interno: sku, descripcion: `Chaos ${sku}`, precio_unitario_sin_igv: 10, costo_unitario: 5000, unidad_medida: 'NIU', tipo_afectacion_igv: '10' };
    const r1 = await req('POST', '/productos', body);
    if (r1.ok) {
        warn('Regla de Negocio (Stock)', `Permitió crear producto donde COSTO (5000) es mayor que PRECIO (10)`);
        IDS.producto = r1.data.data.id; // Lo usaremos para romper el kardex
    } else pass('Regla de Negocio (Stock)', 'Sistema bloqueó costo irreal');

    // 2. CHAOS: Precios nulos o negativos
    const bodyNegativo = { ...body, codigo_interno: sku+'-2', precio_unitario_sin_igv: -50 };
    const r2 = await req('POST', '/productos', bodyNegativo);
    if (r2.ok) fail('Validación Precios', '¡Permitió guardar un precio NEGATIVO!');
    else pass('Precios Negativos', `Bloqueo exitoso (${r2.status})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 4 — VENTAS (Pagos Incompletos, IDs falsos)
// ═══════════════════════════════════════════════════════════════════════════════
async function testGlobalVentas() {
    header('MÓDULO 4 — VENTAS (INTEGRIDAD REFERENCIAL)');
    
    // 1. CHAOS: Venta con cliente UUID Falso pero formato correcto
    const payload = {
        cliente_id: "00000000-0000-0000-0000-000000000000", tipo_comprobante: '01', serie: 'F001',
        condicion_pago: 'CONTADO', moneda: 'PEN', importe_total: 100,
        detalles: [{ producto_id: IDS.producto, descripcion: 'X', unidad_medida:'NIU', cantidad: 1, precio_unitario: 100 }]
    };
    const r1 = await req('POST', '/ventas', payload);
    if (r1.ok) fail('Integridad Referencial Cliente', 'Permitió vender a un UUID cliente que NO existe en BD.');
    else pass('Integridad Referencial Cliente', `Atrapado por Foreign Key o Validacion (${r1.data?.message || r1.status})`);

    // 2. CHAOS: Cantidades negativas
    payload.cliente_id = IDS.cliente;
    payload.detalles[0].cantidad = -9999;
    const r2 = await req('POST', '/ventas', payload);
    if (r2.ok) fail('Peligro Crítico: Shorting Stocks', '¡Permitió vender CANTIDADES NEGATIVAS!');
    else pass('Validación Cantidades', `Bloqueo exitoso (${r2.status})`);

    // 3. Obtener venta válida e intentar Inyectar SQL a GET /pdf
    const r3 = await req('GET', '/ventas?limit=1');
    if (r3.ok && r3.data.data.length > 0) {
        const fakeUUID = "' OR 1=1--";
        const r4 = await req('GET', `/ventas/${fakeUUID}/pdf`);
        if (r4.status === 200 && r4.raw.includes('PDF')) fail('SQLi en VentaPdf', 'Se vulneró el fetching de PDF');
        else pass('Prevencion SQLi en PDF', `Protegido (${r4.status})`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 5 — INVENTARIO (Duplicados de lote, Tipos raros)
// ═══════════════════════════════════════════════════════════════════════════════
async function testGlobalInventario() {
    header('MÓDULO 5 — INVENTARIO (KARDEX TAMPERING)');

    // 1. CHAOS: Movimiento con tipo de enumeración no válida
    const bodyMov = { producto_id: IDS.producto, tipo_movimiento: 'ROBAR_ALMACEN', cantidad: 100, motivo: 'Hack' };
    const r1 = await req('POST', '/inventario/movimiento', bodyMov);
    if (r1.ok) fail('Validación ENUM Kardex', 'Permitió ingresar un tipo de movimiento no estándar.');
    else pass('Validación ENUM Kardex', `Base de datos/Backend blindado (${r1.status})`);

    // 2. CHAOS: Sacar millones de stock (Negative Stock)
    const bodySalida = { producto_id: IDS.producto, tipo_movimiento: 'SALIDA', cantidad: 9999999, motivo: 'Hack' };
    const r2 = await req('POST', '/inventario/movimiento', bodySalida);
    if (r2.ok) warn('Negative Inventory', 'El sistema ENUM permite dejar el stock en SUPER negativo sin avisar.');
    else pass('Negative Inventory Protection', `Sistema bloqueó sobre-giro de stock (${r2.status})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO 6 — COMPRAS / CAJA (Sangrado Fiscal)
// ═══════════════════════════════════════════════════════════════════════════════
async function testGlobalComprasCaja() {
    header('MÓDULO 6 — CAJA / TESORERÍA');

    // 1. CHAOS: Robar de la caja infinita
    const body = { tipo: 'EGRESO', monto: 999999999, forma_pago: 'EFECTIVO', origen: 'MANUAL', descripcion: 'Robo sistémico' };
    const r1 = await req('POST', '/caja', body);
    if (r1.ok) {
        fail('Vulnerabilidad Tesorería (Caja)', '¡Permitió retirar MIL MILLONES dejando la caja en negativo severo!');
    } else pass('Vulnerabilidad Tesorería', `Protegido (Saldo insuficiente - ${r1.status})`);

    // 2. CHAOS: Ingresar tipo de dato corrupto en lugar de número al monto
    const body2 = { tipo: 'INGRESO', monto: 'CIEN_SOLES_PAPE', forma_pago: 'EFECTIVO', origen: 'MANUAL' };
    const r2 = await req('POST', '/caja', body2);
    if(r2.status === 500) warn('Tipado (Monto Caja)', 'Crasheó con 500, falta cast estricto o try/catch');
    else if (r2.ok) fail('Tipado (Monto Caja)', 'Lo aceptó y guardó NaN/0 silenciosamente');
    else pass('Estabilidad Tipado', `Respondió con codigo controlado (${r2.status})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN MAESTRA
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
    nl();
    log(`${C.bold}${C.white}  MAQUIMPOWER — CHAOS ENGINEERING SUITE v3.0${C.reset}\n`);
    log(`  ${C.gray}Buscando Errores Críticos, Fallos y Debilidades${C.reset}\n`);

    await testGlobalAuth();
    await testGlobalClientes();
    await testGlobalProductos();
    await testGlobalVentas();
    await testGlobalInventario();
    await testGlobalComprasCaja();

    // --- REPORTE GLOBAL ---
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const pct = total ? Math.round((passed / total) * 100) : 0;

    nl();
    log(`${C.bold}${'═'.repeat(50)}${C.reset}\n`);
    log(`${C.bold}  REPORTE FINAL CHAOS — DEBILIDADES DEL SISTEMA${C.reset}\n`);
    log(`${'═'.repeat(50)}\n`);
    nl();
    log(`  Pruebas de Estrés: ${C.bold}${total}${C.reset}\n`);
    log(`  ${C.green}✅ Soportadas     : ${passed}${C.reset}\n`);
    log(`  ${C.red}❌ Vulneradas      : ${failed}${C.reset} (¡CRÍTICO!)\n`);
    log(`  ${C.yellow}⚠️  Advertencias  : ${warned}${C.reset} (Mejoras requeridas)\n`);
    log(`  Resiliencia API  : ${pct >= 90 ? C.green : pct >= 60 ? C.yellow : C.red}${pct}%${C.reset}\n`);
    nl();

    if (failed > 0) {
        log(`${C.bgRed}${C.white}${C.bold}  VULNERABILIDADES DETECTADAS (DEBEN FIXEARSE)  ${C.reset}\n`);
        results.filter(r => r.status === 'FAIL').forEach(r => log(`  ${C.red}→ ${r.name}: ${C.white}${r.detail}${C.reset}\n`));
        nl();
    }
    if (warned > 0) {
        log(`${C.yellow}${C.bold}  COMPORTAMIENTOS NO ÓPTIMOS (FALTA VALIDACIÓN)  ${C.reset}\n`);
        results.filter(r => r.status === 'WARN').forEach(r => log(`  ${C.yellow}→ ${r.name}: ${C.white}${r.detail}${C.reset}\n`));
        nl();
    }
}

main().catch(e => { log(`\n${C.red}FATAL: ${e.message}${C.reset}\n`); process.exit(1); });
