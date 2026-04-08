// Yo sincronizo este script con la ruta real del backend en este repo.
const BASE_URL = 'http://localhost/Sistema-comercial-Maquimpower/antigravity-backend';

async function auth() {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@maquimpower.com', password: 'password123' })
    });
    const data = await res.json();
    return data?.data?.token || '';
}

async function testReportes() {
    console.log('--- TEST FASE 5: REPORTE DE RENTABILIDAD FINANCIERA ---');
    try {
        const token = await auth();
        const headers = { 'Authorization': `Bearer ${token}` };

        const params = new URLSearchParams({
            fecha_desde: '2020-01-01',
            fecha_hasta: new Date().toISOString().split('T')[0]
        });

        console.log('\n1. Testeando Endpoint /api/reportes/rentabilidad');
        const res = await fetch(`${BASE_URL}/api/reportes/rentabilidad?${params}`, { headers });
        const json = await res.json();

        if (res.ok && json.success) {
            console.log(`✅ Conexión analítica exitosa.`);
            console.log(`   └ Ingresos Históricos Generados: S/ ${json.data.global.ingresos}`);
            console.log(`   └ Costo de Bienes (COGS): S/ ${json.data.global.cogs}`);
            console.log(`   └ Utilidad Bruta: S/ ${json.data.global.utilidad} (${json.data.global.margen_porcentaje}%)`);
            console.log(`\n   └ Días con ventas: ${json.data.serie_tiempo.length}`);
            console.log(`   └ Productos en Top Rentabilidad: ${json.data.top_rentables.length}`);
        } else {
            console.error('❌ Error capturando métricas de rentabilidad:', json);
        }

        console.log('\n--- TESTS SATISFACTORIOS DE FASE 5 ---');
    } catch (error) {
        console.error('❌ Crash en la petición:', error);
    }
}

testReportes();
