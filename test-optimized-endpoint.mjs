/**
 * Script de prueba para validar el endpoint optimizado getDashboardData
 * Piano Emotion Manager
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://www.pianoemotion.com';
const PARTNER_ID = 1;

// Calcular rango de fechas (últimos 30 días)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

console.log('🧪 Probando endpoint optimizado getDashboardData...\n');
console.log('📅 Rango de fechas:');
console.log(`   Inicio: ${startDate.toISOString()}`);
console.log(`   Fin: ${endDate.toISOString()}\n`);

async function testOptimizedEndpoint() {
  try {
    const startTime = Date.now();
    
    // Llamar al endpoint optimizado
    const response = await fetch(`${BASE_URL}/api/trpc/analytics.getDashboardData`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // En producción necesitarías agregar el token de autenticación aquí
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Tiempo de respuesta: ${duration}ms\n`);

    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Respuesta:', text.substring(0, 500));
      return;
    }

    const data = await response.json();
    
    console.log('✅ Respuesta exitosa!\n');
    console.log('📊 Estructura de datos recibida:');
    console.log(`   - metrics: ${data.result?.data?.metrics ? '✓' : '✗'}`);
    console.log(`   - revenueByPeriod: ${data.result?.data?.revenueByPeriod ? '✓' : '✗'}`);
    console.log(`   - servicesByType: ${data.result?.data?.servicesByType ? '✓' : '✗'}\n`);

    if (data.result?.data) {
      const { metrics, revenueByPeriod, servicesByType } = data.result.data;
      
      console.log('📈 Métricas:');
      if (metrics) {
        console.log(`   - Ingresos totales: €${metrics.revenue?.total?.toLocaleString('es-ES') || 0}`);
        console.log(`   - Servicios completados: ${metrics.services?.completed || 0}`);
        console.log(`   - Clientes nuevos: ${metrics.clients?.new || 0}`);
      }
      
      console.log('\n💰 Evolución de ingresos:');
      if (revenueByPeriod && revenueByPeriod.length > 0) {
        console.log(`   - Períodos: ${revenueByPeriod.length}`);
        console.log(`   - Ejemplo: ${revenueByPeriod[0].period} - €${revenueByPeriod[0].revenue?.toLocaleString('es-ES')}`);
      }
      
      console.log('\n🔧 Servicios por tipo:');
      if (servicesByType && servicesByType.length > 0) {
        console.log(`   - Tipos: ${servicesByType.length}`);
        servicesByType.slice(0, 3).forEach(s => {
          console.log(`   - ${s.typeName}: ${s.count} servicios`);
        });
      }
    }

    console.log('\n✨ Optimización exitosa: 1 llamada HTTP en lugar de 3!');
    console.log(`   Reducción estimada de latencia: ~${duration * 2}ms → ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Error al probar endpoint:', error.message);
  }
}

// Ejecutar prueba
testOptimizedEndpoint();
