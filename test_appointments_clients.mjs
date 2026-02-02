import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://4jKDMBGFBECkEWxp.root:RtBkfJlqJQPNBtZB@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion?ssl={"rejectUnauthorized":true}';

async function testAppointmentsClients() {
  const connection = await createConnection(DATABASE_URL);
  
  console.log('\n=== CITAS DE HOY (2026-02-02) ===');
  const [appointments] = await connection.execute(`
    SELECT id, clientId, date, startTime, status 
    FROM appointments 
    WHERE partnerId = 1 
    AND date = '2026-02-02'
    ORDER BY startTime
    LIMIT 5
  `);
  
  console.log('Total citas hoy:', appointments.length);
  console.log('\nPrimeras 5 citas:');
  appointments.forEach(apt => {
    console.log(`  - ID: ${apt.id}, ClientID: ${apt.clientId}, Hora: ${apt.startTime}, Estado: ${apt.status}`);
  });
  
  if (appointments.length > 0) {
    const clientIds = appointments.map(a => a.clientId).filter(Boolean);
    console.log('\n=== CLIENTES DE ESAS CITAS ===');
    console.log('ClientIDs a buscar:', clientIds);
    
    if (clientIds.length > 0) {
      const placeholders = clientIds.map(() => '?').join(',');
      const [clients] = await connection.execute(
        `SELECT id, name, address, email, phone FROM clients WHERE id IN (${placeholders})`,
        clientIds
      );
      
      console.log('\nClientes encontrados:', clients.length);
      clients.forEach(client => {
        console.log(`  - ID: ${client.id}, Nombre: ${client.name}, Dirección: ${client.address || 'NULL'}`);
      });
      
      // Verificar si hay clientIds que no se encontraron
      const foundIds = clients.map(c => c.id);
      const missingIds = clientIds.filter(id => !foundIds.includes(id));
      if (missingIds.length > 0) {
        console.log('\n⚠️ ClientIDs NO ENCONTRADOS:', missingIds);
      }
    }
  }
  
  await connection.end();
}

testAppointmentsClients().catch(console.error);
