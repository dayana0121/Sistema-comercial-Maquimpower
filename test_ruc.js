// ═══════════════════════════════════════════════════════════════════════════════
// MAQUIMPOWER — TEST DE CONSULTA RUC/DNI v1.1
// Script de diagnóstico detallado
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost/REPO3/Sistema-comercial-Maquimpower/antigravity-backend';
const CREDS = { email: "admin@maquimpower.com", password: "password" };

const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', gray: '\x1b[90m', white: '\x1b[97m',
    bgRed: '\x1b[41m',
};

let TOKEN = null;

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

async function runTest(name, endpoint) {
    console.log(`\n${C.bold}${C.cyan}TEST: ${name}${C.reset}  (${C.gray}${endpoint}${C.reset})`);
    const res = await request('GET', endpoint);

    if (res.ok && res.data?.success) {
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
        console.log(`  ${C.red}❌ FAIL${C.reset} (HTTP ${res.status}) · ${res.ms}ms`);
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
}

async function main() {
    console.log(`\n${C.bold}${C.white}=== MAQUIMPOWER RUC DIAGNOSTIC v1.1 ===${C.reset}`);
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
    
    // RUC SUNAT
    await runTest('RUC SUNAT (Conocido)', '/sunat/ruc?numero=20131312955');
    
    // RUC OXXO
    await runTest('RUC OXXO (Conocido)', '/sunat/ruc?numero=20606853182');
    
    // DNI 
    await runTest('DNI (Válido)', '/sunat/ruc?numero=45789632');
    
    // Error cases
    await runTest('RUC Inexistente', '/sunat/ruc?numero=11111111111');
    await runTest('Número Inválido', '/sunat/ruc?numero=123');

    console.log(`\n${C.bold}${C.white}=== FIN DEL DIAGNÓSTICO ===${C.reset}\n`);
}

main().catch(console.error);
