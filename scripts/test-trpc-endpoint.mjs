/**
 * Script para probar el endpoint tRPC de facturas
 * Simula exactamente la petición que hace el frontend
 */

import fetch from 'node-fetch';

const API_URL = 'https://www.pianoemotion.com/api/trpc/invoices.list';

// Parámetros exactos que envía el frontend
const params = {
  limit: 100,
  search: null,
  status: null,
  clientId: null,
  dateFrom: "2026-01-31T23:00:00.000Z",
  dateTo: "2026-02-28T22:59:59.000Z",
};

console.log('🧪 Probando endpoint tRPC de facturas...\n');
console.log('📥 URL:', API_URL);
console.log('📥 Parámetros:', JSON.stringify(params, null, 2));
console.log('');

try {
  // Construir URL con parámetros
  const url = new URL(API_URL);
  url.searchParams.set('input', JSON.stringify({ json: params }));
  
  console.log('🔗 URL completa:', url.toString().substring(0, 150) + '...');
  console.log('');
  
  // Hacer la petición
  console.log('📡 Enviando petición...');
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  console.log('📊 Status:', response.status, response.statusText);
  console.log('');
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error en la respuesta:');
    console.error(errorText);
    process.exit(1);
  }
  
  // Parsear respuesta
  const data = await response.json();
  
  console.log('✅ Respuesta recibida exitosamente');
  console.log('');
  console.log('📋 Estructura de la respuesta:');
  console.log('  - result.data.json.items:', data.result?.data?.json?.items?.length || 0, 'facturas');
  console.log('  - result.data.json.total:', data.result?.data?.json?.total || 0);
  console.log('  - result.data.json.nextCursor:', data.result?.data?.json?.nextCursor);
  console.log('');
  
  if (data.result?.data?.json?.items?.length > 0) {
    console.log('📄 Primeras 3 facturas:');
    data.result.data.json.items.slice(0, 3).forEach((inv, i) => {
      console.log(`  ${i + 1}. ${inv.invoiceNumber} - ${inv.clientName} - €${inv.total} - ${inv.date}`);
    });
  } else {
    console.log('⚠️  No se encontraron facturas en la respuesta');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
