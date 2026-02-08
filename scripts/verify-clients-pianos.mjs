import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function verifyClientsPianos() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB');

    // Total de clientes
    const [totalClients] = await connection.execute(
      'SELECT COUNT(*) as total FROM clients WHERE partnerId = 1'
    );
    console.log(`\n📊 Total clientes: ${totalClients[0].total}`);

    // Total de pianos
    const [totalPianos] = await connection.execute(
      'SELECT COUNT(*) as total FROM pianos WHERE partnerId = 1'
    );
    console.log(`🎹 Total pianos: ${totalPianos[0].total}`);

    // Clientes con pianos (DISTINCT clientId)
    const [clientsWithPianos] = await connection.execute(
      'SELECT COUNT(DISTINCT clientId) as total FROM pianos WHERE partnerId = 1 AND clientId IS NOT NULL'
    );
    console.log(`👥 Clientes con pianos: ${clientsWithPianos[0].total}`);

    // Clientes SIN pianos
    const [clientsWithoutPianos] = await connection.execute(`
      SELECT COUNT(*) as total 
      FROM clients c
      WHERE c.partnerId = 1
      AND c.id NOT IN (
        SELECT DISTINCT clientId 
        FROM pianos 
        WHERE partnerId = 1 AND clientId IS NOT NULL
      )
    `);
    console.log(`❌ Clientes SIN pianos: ${clientsWithoutPianos[0].total}`);

    // Listar los primeros 10 clientes sin pianos
    const [clientsWithoutPianosDetails] = await connection.execute(`
      SELECT c.id, c.name, c.email, c.phone
      FROM clients c
      WHERE c.partnerId = 1
      AND c.id NOT IN (
        SELECT DISTINCT clientId 
        FROM pianos 
        WHERE partnerId = 1 AND clientId IS NOT NULL
      )
      LIMIT 10
    `);

    if (clientsWithoutPianosDetails.length > 0) {
      console.log(`\n📋 Primeros 10 clientes sin pianos:`);
      clientsWithoutPianosDetails.forEach(client => {
        console.log(`  - ID ${client.id}: ${client.name} (${client.email || client.phone})`);
      });
    }

    // Verificar si hay pianos con clientId NULL
    const [pianosWithoutClient] = await connection.execute(
      'SELECT COUNT(*) as total FROM pianos WHERE partnerId = 1 AND clientId IS NULL'
    );
    console.log(`\n🎹 Pianos sin cliente asignado: ${pianosWithoutClient[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifyClientsPianos();
