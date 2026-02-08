import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function checkPartnerId() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  
  try {
    // Verificar partnerId distintos en pianos
    const [partnerIds] = await connection.execute(`
      SELECT partnerId, COUNT(*) as piano_count, COUNT(DISTINCT clientId) as client_count
      FROM pianos
      GROUP BY partnerId
      ORDER BY piano_count DESC
    `);
    console.log('📊 PartnerIds en tabla pianos:');
    partnerIds.forEach(p => {
      console.log(`  - PartnerID: ${p.partnerId || 'NULL'}, Pianos: ${p.piano_count}, Clientes: ${p.client_count}`);
    });
    
    // Verificar partnerId en clientes
    const [clientPartnerIds] = await connection.execute(`
      SELECT partnerId, COUNT(*) as client_count
      FROM clients
      GROUP BY partnerId
      ORDER BY client_count DESC
    `);
    console.log('\n👥 PartnerIds en tabla clients:');
    clientPartnerIds.forEach(p => {
      console.log(`  - PartnerID: ${p.partnerId || 'NULL'}, Clientes: ${p.client_count}`);
    });
    
    // Verificar si hay clientes con partnerId diferente a sus pianos
    const [mismatch] = await connection.execute(`
      SELECT 
        c.id as client_id,
        c.name as client_name,
        c.partnerId as client_partnerId,
        p.partnerId as piano_partnerId,
        COUNT(*) as piano_count
      FROM clients c
      JOIN pianos p ON c.id = p.clientId
      WHERE c.partnerId != p.partnerId OR c.partnerId IS NULL OR p.partnerId IS NULL
      GROUP BY c.id, c.name, c.partnerId, p.partnerId
      LIMIT 10
    `);
    
    if (mismatch.length > 0) {
      console.log('\n⚠️  Clientes con partnerId diferente a sus pianos:');
      mismatch.forEach(m => {
        console.log(`  - Cliente ID: ${m.client_id}, Nombre: ${m.client_name}`);
        console.log(`    Cliente partnerId: ${m.client_partnerId || 'NULL'}, Piano partnerId: ${m.piano_partnerId || 'NULL'}, Pianos: ${m.piano_count}`);
      });
    } else {
      console.log('\n✅ Todos los clientes tienen el mismo partnerId que sus pianos');
    }
    
  } finally {
    await connection.end();
  }
}

checkPartnerId().catch(console.error);
