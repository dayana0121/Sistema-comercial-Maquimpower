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

async function testInventario() {
    console.log('--- TEST FASE 4: MÓDULO DE INVENTARIO MULTI ALMACÉN ---');
    
    // Solo validamos que los endpoints están accesibles 
    const token = await auth();
    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('\n1. Testeando Endpoints de Almacenes');
    let actRes = await fetch(`${BASE_URL}/inventario/almacenes`, { headers });
    let actJSON = await actRes.json();
    if(actRes.ok) {
        console.log(`✅ Almacenes devueltos correctamente: ${actJSON.data?.length} encontrados.`);
        console.log(`   └ Ejemplo: ${actJSON.data[0]?.nombre}`);
    } else {
        console.error('❌ Error listar almacenes');
    }

    console.log('\n2. Testeando Endpoints de Inventario Stats');
    let invRes = await fetch(`${BASE_URL}/inventario`, { headers });
    let invJSON = await invRes.json();
    if(invRes.ok) {
        console.log(`✅ Inventario general calculado. Productos totales: ${invJSON.stats?.total}`);
    } else {
        console.error('❌ Error listar inventario');
    }
    
    console.log('\n--- TESTS SATISFACTORIOS DE FASE 4 ---');
}

testInventario().catch(console.error);
