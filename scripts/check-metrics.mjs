import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function checkMetrics() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });
  
  try {
    // Total de clientes
    const [totalClients] = await connection.execute('SELECT COUNT(*) as count FROM clients');
    console.log('📊 Total clientes:', totalClients[0].count);
    
    // Clientes VIP
    const [vipClients] = await connection.execute('SELECT COUNT(*) as count FROM clients WHERE isVip = 1');
    console.log('⭐ Clientes VIP:', vipClients[0].count);
    
    // Total de pianos
    const [totalPianos] = await connection.execute('SELECT COUNT(*) as count FROM pianos');
    console.log('🎹 Total pianos:', totalPianos[0].count);
    
    // Clientes con pianos
    const [clientsWithPianos] = await connection.execute(`
      SELECT COUNT(DISTINCT clientId) as count 
      FROM pianos
    `);
    console.log('👥 Clientes con pianos:', clientsWithPianos[0].count);
    
    // Clientes sin pianos
    const [clientsWithoutPianos] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM clients 
      WHERE id NOT IN (SELECT DISTINCT clientId FROM pianos)
    `);
    console.log('❌ Clientes SIN pianos:', clientsWithoutPianos[0].count);
    
    // Listar algunos clientes sin pianos
    if (clientsWithoutPianos[0].count > 0) {
      const [clientsWithout] = await connection.execute(`
        SELECT id, name, email 
        FROM clients 
        WHERE id NOT IN (SELECT DISTINCT clientId FROM pianos)
        LIMIT 10
      `);
      console.log('\n📋 Primeros 10 clientes sin pianos:');
      clientsWithout.forEach(c => {
        console.log(`  - ID: ${c.id}, Nombre: ${c.name}, Email: ${c.email}`);
      });
    }
    
  } finally {
    await connection.end();
  }
}

checkMetrics().catch(console.error);
