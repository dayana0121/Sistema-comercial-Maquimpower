/**
 * MAQUIMPOWER - SCRIPT DE DIAGNÓSTICO DE RED v1.0
 * Ejecución: node debug_maquimpower.js
 */

const http = require('http');

// CONFIGURACIÓN (Ajusta si tus rutas son distintas)
const CONFIG = {
    // Yo apunto el diagnostico al backend de este repo para no validar contra otra carpeta.
    BACKEND_DIRECTO: 'http://localhost/Sistema-comercial-Maquimpower/antigravity-backend',
    FRONTEND_PROXY: 'http://localhost:5173/api',
    ENDPOINTS_TEST: ['/auth/login', '/inventario/alertas', '/dashboard/stats']
};

console.log("🔍 INICIANDO AUDITORÍA DE CONEXIÓN...\n");

async function testUrl(url, nombre) {
    return new Promise((resolve) => {
        const start = Date.now();
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const isJson = res.headers['content-type']?.includes('application/json');
                resolve({
                    nombre,
                    status: res.statusCode,
                    type: res.headers['content-type'],
                    isJson,
                    time: Date.now() - start,
                    preview: data.substring(0, 50).replace(/\n/g, '')
                });
            });
        }).on('error', (err) => {
            resolve({ nombre, error: err.message });
        });
    });
}

async function run() {
    console.log("--- PASO 1: TEST DE BACKEND DIRECTO (APACHE) ---");
    const test1 = await testUrl(CONFIG.BACKEND_DIRECTO + '/auth/login', "Backend Directo");
    
    if (test1.error) {
        console.log(`❌ APACHE CAÍDO: No se pudo conectar a ${CONFIG.BACKEND_DIRECTO}`);
        console.log(`   Error: ${test1.error}`);
    } else {
        console.log(`✅ APACHE RESPONDE (${test1.status})`);
        if (test1.status === 404) console.log("   ⚠️ ERROR 404: Revisa si la carpeta o el .htaccess existen.");
        if (!test1.isJson) console.log("   ⚠️ ADVERTENCIA: No devolvió JSON (posible error de PHP o HTML de Apache).");
    }

    console.log("\n--- PASO 2: TEST DE PROXY VITE (PUENTE) ---");
    const test2 = await testUrl(CONFIG.FRONTEND_PROXY + '/auth/login', "Vite Proxy");
    
    if (test2.error) {
        console.log(`❌ VITE CAÍDO: ¿Corriste 'npm run dev'?`);
    } else {
        console.log(`✅ PROXY RESPONDE (${test2.status})`);
        if (test2.status === 404) {
            console.log("   🚨 ERROR CRÍTICO: El proxy de Vite no encuentra el backend.");
            console.log("      Revisa el 'target' en vite.config.js");
        }
    }

    console.log("\n--- PASO 3: VERIFICACIÓN DE RUTAS DUPLICADAS ---");
    const test3 = await testUrl(CONFIG.FRONTEND_PROXY + '/api/inventario/alertas', "Doble API");
    if (test3.status !== 404) {
        console.log("   ⚠️ ALERTA: Tu sistema responde a /api/api/... Tienes rutas duplicadas en el frontend.");
    } else {
        console.log("   ✅ Sin rutas duplicadas detectadas.");
    }

    console.log("\n--- RESUMEN FINAL ---");
    const todoOk = !test1.error && test1.status === 200 && !test2.error && test2.status === 200;
    if (todoOk) {
        console.log("🚀 ¡TODO PARECE ESTAR BIEN! Si React falla, limpia caché (Ctrl+F5).");
    } else {
        console.log("🛠️ REVISA LOS PUNTOS MARCADOS CON ❌ o ⚠️ ARRIBA.");
    }
}

run();
