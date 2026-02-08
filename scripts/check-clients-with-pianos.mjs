import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function checkClientsWithPianos() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  
  try {
    // Consulta exacta del código
    const [result1] = await connection.execute(`
      SELECT COUNT(DISTINCT clientId) as count 
      FROM pianos
    `);
    console.log('📊 Clientes con pianos (COUNT DISTINCT clientId):', result1[0].count);
    
    // Verificar si hay clientId NULL
    const [nullCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM pianos 
      WHERE clientId IS NULL
    `);
    console.log('❌ Pianos con clientId NULL:', nullCheck[0].count);
    
    // Verificar si hay clientId duplicados
    const [duplicates] = await connection.execute(`
      SELECT clientId, COUNT(*) as piano_count
      FROM pianos
      GROUP BY clientId
      HAVING COUNT(*) > 1
      ORDER BY piano_count DESC
      LIMIT 10
    `);
    console.log('\n🔄 Clientes con múltiples pianos (top 10):');
    duplicates.forEach(d => {
      console.log(`  - Cliente ID ${d.clientId}: ${d.piano_count} pianos`);
    });
    
    // Verificar total de clientes
    const [totalClients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    console.log('\n👥 Total clientes en tabla clients:', totalClients[0].count);
    
    // Clientes sin pianos
    const [clientsWithoutPianos] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM clients 
      WHERE id NOT IN (SELECT DISTINCT clientId FROM pianos WHERE clientId IS NOT NULL)
    `);
    console.log('❌ Clientes SIN pianos:', clientsWithoutPianos[0].count);
    
    if (clientsWithoutPianos[0].count > 0) {
      const [missingClients] = await connection.execute(`
        SELECT id, name, email 
        FROM clients 
        WHERE id NOT IN (SELECT DISTINCT clientId FROM pianos WHERE clientId IS NOT NULL)
        LIMIT 25
      `);
      console.log('\n📋 Primeros 25 clientes sin pianos:');
      missingClients.forEach(c => {
        console.log(`  - ID: ${c.id}, Nombre: ${c.name}, Email: ${c.email || 'N/A'}`);
      });
    }
    
  } finally {
    await connection.end();
  }
}

checkClientsWithPianos().catch(console.error);
