// ═══════════════════════════════════════════════════════════════════════════════
// MAQUIMPOWER — TEST DE CONSULTA RUC/DNI v1.2
// Script de diagnóstico detallado
// ═══════════════════════════════════════════════════════════════════════════════

// Yo sincronizo este script con la ruta real del backend en este repo.
const API_BASE = 'http://localhost/Sistema-comercial-Maquimpower/antigravity-backend';
const CREDS = { email: "admin@maquimpower.com", password: "password" };

const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', gray: '\x1b[90m', white: '\x1b[97m',
    bgRed: '\x1b[41m',
};

let TOKEN = null;
let PASS = 0, FAIL = 0;

async function request(method, endpoint, body = null, useToken = true) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (useToken && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const t0 = Date.now();
    try {
        const res = await fetch(url, opts);
        const ms = Date.now() - t0;
        const raw = await res.text();
        
        let data = null;
        try { data = JSON.parse(raw); } catch (e) {}

        return { 
            status: res.status, 
            ok: res.ok, 
            data, 
            raw: raw, 
            ms: ms
        };
    } catch (e) {
        return { status: 0, ok: false, error: e.message, ms: 0 };
    }
}

/**
 * @param {string} name - Nombre del test
 * @param {string} endpoint - Endpoint a consultar
 * @param {object} opts - Opciones
 * @param {number} [opts.expectStatus] - HTTP status esperado (default: 200)
 * @param {string} [opts.expectMessage] - Substring que debe contener el mensaje de error
 */
async function runTest(name, endpoint, opts = {}) {
    const { expectStatus = 200, expectMessage } = opts;
    const expectingError = expectStatus >= 400;

    console.log(`\n${C.bold}${C.cyan}TEST: ${name}${C.reset}  (${C.gray}${endpoint}${C.reset})`);
    const res = await request('GET', endpoint);

    // ── Caso ÉXITO esperado (HTTP 200) ──────────────────────────────────
    if (!expectingError) {
        if (res.ok && res.data?.success) {
            PASS++;
            console.log(`  ${C.green}✅ PASS${C.reset} (HTTP ${res.status}) · ${res.ms}ms`);
            const d = res.data.data;
            if (d.razon_social || d.nombre) {
                console.log(`  Razón Social: ${C.white}${d.razon_social || d.nombre}${C.reset}`);
                console.log(`  Dirección: ${C.gray}${d.direccion || 'No disponible'}${C.reset}`);
                if (d.fuente) console.log(`  Fuente: ${C.yellow}${d.fuente}${C.reset}`);
            } else {
                console.log(`  ${C.yellow}⚠ ADVERTENCIA: Éxito pero datos vacíos${C.reset}`);
                console.log(`  Respuesta:`, res.data);
            }
        } else {
            FAIL++;
            console.log(`  ${C.red}❌ FAIL${C.reset} (HTTP ${res.status}, esperado 200) · ${res.ms}ms`);
            printErrorDetails(res);
        }
        return;
    }

    // ── Caso ERROR esperado (HTTP 400, 422, etc.) ───────────────────────
    if (res.status === expectStatus) {
        // Verificar mensaje si se proporcionó
        const msg = res.data?.message || '';
        if (expectMessage && !msg.includes(expectMessage)) {
            FAIL++;
            console.log(`  ${C.red}❌ FAIL${C.reset} (HTTP ${res.status} correcto, pero mensaje inesperado) · ${res.ms}ms`);
            console.log(`  Esperado: "${expectMessage}"`);
            console.log(`  Recibido: "${msg}"`);
        } else {
            PASS++;
            console.log(`  ${C.green}✅ PASS${C.reset} (HTTP ${res.status} — error esperado) · ${res.ms}ms`);
            console.log(`  Mensaje: ${C.gray}${msg}${C.reset}`);
        }
    } else {
        FAIL++;
        console.log(`  ${C.red}❌ FAIL${C.reset} (HTTP ${res.status}, esperado ${expectStatus}) · ${res.ms}ms`);
        printErrorDetails(res);
    }
}

function printErrorDetails(res) {
    if (res.data) {
        console.log(`  Mensaje: ${C.yellow}${res.data.message || 'Sin mensaje'}${C.reset}`);
        if (res.data.debug) {
            console.log(`  Debug:`, JSON.stringify(res.data.debug, null, 2));
        }
        if (res.data.error) console.log(`  Error: ${C.red}${res.data.error}${C.reset}`);
    } else {
        console.log(`  ${C.bgRed}RESPUESTA NO ES JSON O ESTÁ VACÍA${C.reset}`);
        const preview = res.raw ? res.raw.substring(0, 500) : 'Sin datos';
        console.log(`  Raw: ${preview}`);
    }
}

async function main() {
    console.log(`\n${C.bold}${C.white}=== MAQUIMPOWER RUC DIAGNOSTIC v1.2 ===${C.reset}`);
    console.log(`API Base: ${API_BASE}`);
    
    // Auth
    console.log(`\n${C.bold}1. Autenticando...${C.reset}`);
    const auth = await request('POST', '/auth/login', CREDS, false);
    if (auth.ok && auth.data?.data?.token) {
        TOKEN = auth.data.data.token;
        console.log(`  ${C.green}✅ Autenticado correctamente${C.reset}`);
    } else {
        console.log(`  ${C.red}❌ Error de autenticación.${C.reset}`);
        console.log(`  HTTP: ${auth.status}`);
        console.log(`  Raw: ${auth.raw}`);
        process.exit(1);
    }

    // Diagnostic Tests
    console.log(`\n${C.bold}2. Pruebas de Documentos...${C.reset}`);
    
    // ── Casos exitosos ──
    await runTest('RUC SUNAT (Conocido)', '/sunat/ruc?numero=20131312955');
    await runTest('RUC OXXO (Conocido)', '/sunat/ruc?numero=20606853182');
    await runTest('DNI (Válido)', '/sunat/ruc?numero=45789632');
    
    // ── Casos de error esperados ──
    await runTest('RUC Inexistente', '/sunat/ruc?numero=11111111111', {
        expectStatus: 400,
        expectMessage: 'RUC no encontrado'
    });
    await runTest('Número Inválido', '/sunat/ruc?numero=123', {
        expectStatus: 400,
        expectMessage: 'Ingresa 8 dígitos'
    });

    // Resumen
    console.log(`\n${C.bold}${C.white}═══════════════════════════════════════${C.reset}`);
    const total = PASS + FAIL;
    const color = FAIL === 0 ? C.green : C.red;
    console.log(`  ${color}${C.bold}${PASS}/${total} tests pasaron${C.reset}`);
    if (FAIL > 0) console.log(`  ${C.red}${FAIL} tests fallaron${C.reset}`);
    console.log(`${C.bold}${C.white}=== FIN DEL DIAGNÓSTICO ===${C.reset}\n`);

    process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(console.error);
