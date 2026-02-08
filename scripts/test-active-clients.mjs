import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function testActiveClients() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB\n');

    // Total de clientes
    const [totalClients] = await connection.execute(
      'SELECT COUNT(*) as total FROM clients WHERE partnerId = 1'
    );
    console.log(`📊 Total clientes: ${totalClients[0].total}`);

    // Fecha de hace 12 meses
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    console.log(`📅 Fecha de hace 12 meses: ${oneYearAgoStr}\n`);

    // Clientes activos (con servicios en los últimos 12 meses)
    const [activeClients] = await connection.execute(`
      SELECT COUNT(DISTINCT clientId) as total 
      FROM services 
      WHERE partnerId = 1 
      AND date >= ?
      AND clientId IS NOT NULL
    `, [oneYearAgoStr]);
    console.log(`✅ Clientes activos (con servicios últimos 12 meses): ${activeClients[0].total}`);

    // Clientes inactivos
    const inactiveCount = totalClients[0].total - activeClients[0].total;
    console.log(`❌ Clientes inactivos (sin servicios últimos 12 meses): ${inactiveCount}`);

    // Distribución de servicios por fecha
    const [servicesByYear] = await connection.execute(`
      SELECT 
        YEAR(date) as year,
        COUNT(*) as service_count,
        COUNT(DISTINCT clientId) as unique_clients
      FROM services 
      WHERE partnerId = 1
      GROUP BY YEAR(date)
      ORDER BY year DESC
    `);

    console.log(`\n📈 Distribución de servicios por año:`);
    servicesByYear.forEach(row => {
      console.log(`  - ${row.year}: ${row.service_count} servicios, ${row.unique_clients} clientes únicos`);
    });

    // Servicios en los últimos 12 meses
    const [recentServices] = await connection.execute(`
      SELECT COUNT(*) as total 
      FROM services 
      WHERE partnerId = 1 
      AND date >= ?
    `, [oneYearAgoStr]);
    console.log(`\n🔧 Total servicios últimos 12 meses: ${recentServices[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

testActiveClients();
