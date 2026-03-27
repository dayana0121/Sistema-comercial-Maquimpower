// Script de Pruebas de Integración - Módulo Ventas
// Ejecutar con: node test_ventas.js

const API_URL = 'http://localhost/REPO3/Sistema-comercial-Maquimpower/antigravity-backend/api';
// ⚠️ ASEGÚRATE DE QUE ESTE TOKEN SEA VÁLIDO
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTU2NjUxMWEtMWE2Ni0xMWYxLTk2YzUtNWNjY2ViMzc0ZWU0IiwiZW1haWwiOiJhZG1pbkBtYXF1aW1wb3dlci5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IgU2lzdGVtYSIsImlhdCI6MTc3MzQxODc2MywiZXhwIjoxNzczNDYxOTYzfQ.1ltC93DLyVrO9Qa76Vdge6gUNn-wnkaAQY0o0tHyCsQ';

async function apiCall(endpoint, method = 'GET', body = null) {
    console.log(`\n▶ [${method}] ${endpoint}...`);

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
            'Accept': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const rawText = await res.text(); // Capturamos TODO lo que diga PHP

        // Intento de parsear JSON
        try {
            const data = JSON.parse(rawText);
            console.log(`  Status: ${res.status}`);
            if (!res.ok) console.warn(`  ⚠️ El servidor respondió con error.`);
            console.log(`  Respuesta:`, JSON.stringify(data, null, 2));
            return { status: res.status, data, success: data.success };
        } catch (parseError) {
            // Si llegamos aquí, PHP envió un Fatal Error, un Warning o un echo antes del JSON
            console.error(`  ❌ ERROR CRÍTICO: PHP DEVOLVIÓ TEXTO PLANO EN LUGAR DE JSON.`);
            console.error(`  Status HTTP: ${res.status}`);
            console.error(`  👇 CONTENIDO RECIBIDO (REVISA ESTO) 👇\n`);
            console.error("---------------------------------------------------------");
            console.error(rawText || "(Vacío: Probablemente un error de configuración de Apache o ruta inexistente)");
            console.error("---------------------------------------------------------");
            return { status: res.status, data: null, success: false, raw: rawText };
        }
    } catch (error) {
        console.error(`  ❌ Error de red/conexión:`, error.message);
        return null;
    }
}

async function runTests() {
    console.log('🚀 INICIANDO BATERÍA DE PRUEBAS - MÓDULO VENTAS');
    console.log('=================================================');

    try {
        let idVentaGenerada = null;

        // 1. TEST: CREAR VENTA
        // Usamos los IDs que tienes en tu base de datos local
        const payloadCrear = {
            cliente_id: "b3d0e6c6-1ca5-11f1-977b-d843aea88809",
            tipo_comprobante: "01", // Factura
            serie: "F001",
            moneda: "PEN",
            detalles: [
                {
                    producto_id: "dbac6a66-1d61-11f1-9ca6-d843aea88809",
                    producto_nombre: "Producto de Prueba API",
                    codigo_producto: "TEST-001",
                    cantidad: 2,
                    precio_unitario: 100.00 // 200 total inc. IGV
                }
            ]
        };

        const resCrear = await apiCall('/ventas', 'POST', payloadCrear);

        if (resCrear?.success) {
            console.log('  ✅ Crear Venta: PASÓ');
            idVentaGenerada = resCrear.data.data.id;
        } else {
            throw new Error('Crear Venta falló. No se puede continuar con las demás pruebas.');
        }

        // 2. TEST: LISTAR VENTAS
        const resListar = await apiCall('/ventas?limit=5');
        if (resListar?.success) {
            console.log('  ✅ Listar Ventas: PASÓ');
        } else {
            console.error('  ❌ Listar Ventas: FALLÓ');
        }

        // 3. TEST: OBTENER VENTA
        const resObtener = await apiCall(`/ventas/${idVentaGenerada}`);
        if (resObtener?.success) {
            console.log('  ✅ Obtener Venta: PASÓ');
        } else {
            console.error('  ❌ Obtener Venta: FALLÓ');
        }

        // 4. TEST: REINTENTAR SUNAT
        // Aquí es donde probaremos si SunatHelper.php está bien mapeado
        const resReintentar = await apiCall(`/ventas/${idVentaGenerada}/reintentar`, 'POST');
        if (resReintentar?.status === 200) {
            console.log('  ✅ Reintentar SUNAT: PASÓ');
        } else {
            console.error('  ❌ Reintentar SUNAT: FALLÓ (Verifica logs de PHP)');
        }

        // 5. TEST: ANULAR VENTA (SOFT DELETE)
        const resAnular = await apiCall(`/ventas/${idVentaGenerada}`, 'DELETE');
        if (resAnular?.success) {
            console.log('  ✅ Anular Venta (Soft Delete): PASÓ');
        } else {
            console.error('  ❌ Anular Venta: FALLÓ');
        }

    } catch (globalError) {
        console.error(`\n🛑 FLUJO ABORTADO: ${globalError.message}`);
    } finally {
        console.log('\n=================================================');
        console.log('🏁 PRUEBAS FINALIZADAS');
    }
}

runTests();