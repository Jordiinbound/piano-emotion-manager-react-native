import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function debugExcludedClients() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB\n');

    // Obtener todos los pianos con sus datos de organización
    const [allPianos] = await connection.execute(`
      SELECT 
        clientId,
        partnerId,
        odId,
        organizationId,
        COUNT(*) as piano_count
      FROM pianos 
      WHERE partnerId = 1 AND clientId IS NOT NULL
      GROUP BY clientId, partnerId, odId, organizationId
      ORDER BY clientId
    `);

    console.log(`📊 Total grupos de pianos por cliente: ${allPianos.length}\n`);

    // Analizar distribución de organizationId
    const orgDistribution = {};
    allPianos.forEach(p => {
      const orgId = p.organizationId === null ? 'NULL' : p.organizationId;
      orgDistribution[orgId] = (orgDistribution[orgId] || 0) + 1;
    });

    console.log('📈 Distribución por organizationId:');
    Object.entries(orgDistribution).forEach(([orgId, count]) => {
      console.log(`  - organizationId ${orgId}: ${count} clientes`);
    });

    // Analizar distribución de odId
    const odDistribution = {};
    allPianos.forEach(p => {
      const odId = p.odId === null ? 'NULL' : p.odId;
      odDistribution[odId] = (odDistribution[odId] || 0) + 1;
    });

    console.log('\n📈 Distribución por odId:');
    const odEntries = Object.entries(odDistribution).sort((a, b) => b[1] - a[1]);
    odEntries.slice(0, 10).forEach(([odId, count]) => {
      console.log(`  - odId "${odId}": ${count} clientes`);
    });
    if (odEntries.length > 10) {
      console.log(`  ... y ${odEntries.length - 10} odIds más`);
    }

    // Obtener clientes únicos (DISTINCT clientId)
    const [uniqueClients] = await connection.execute(`
      SELECT COUNT(DISTINCT clientId) as total 
      FROM pianos 
      WHERE partnerId = 1 AND clientId IS NOT NULL
    `);
    console.log(`\n👥 Total clientes únicos con pianos: ${uniqueClients[0].total}`);

    // Simular el filtro que probablemente usa el backend
    // Suponiendo que filtra por organizationId IS NOT NULL o un odId específico
    
    // Opción 1: Solo pianos con organizationId NOT NULL
    const [withOrgId] = await connection.execute(`
      SELECT COUNT(DISTINCT clientId) as total 
      FROM pianos 
      WHERE partnerId = 1 
      AND clientId IS NOT NULL
      AND organizationId IS NOT NULL
    `);
    console.log(`\n🔍 Clientes con organizationId NOT NULL: ${withOrgId[0].total}`);
    console.log(`   Diferencia: ${uniqueClients[0].total - withOrgId[0].total} clientes excluidos`);

    // Opción 2: Solo pianos con un odId específico (el más común)
    const mostCommonOdId = odEntries[0][0];
    if (mostCommonOdId !== 'NULL') {
      const [withSpecificOdId] = await connection.execute(`
        SELECT COUNT(DISTINCT clientId) as total 
        FROM pianos 
        WHERE partnerId = 1 
        AND clientId IS NOT NULL
        AND odId = ?
      `, [mostCommonOdId]);
      console.log(`\n🔍 Clientes con odId = "${mostCommonOdId}": ${withSpecificOdId[0].total}`);
      console.log(`   Diferencia: ${uniqueClients[0].total - withSpecificOdId[0].total} clientes excluidos`);
    }

    // Listar los clientes que tienen pianos con organizationId NULL
    const [clientsWithNullOrg] = await connection.execute(`
      SELECT DISTINCT 
        c.id,
        c.name,
        c.email,
        p.organizationId,
        p.odId,
        COUNT(p.id) as piano_count
      FROM clients c
      INNER JOIN pianos p ON c.id = p.clientId
      WHERE p.partnerId = 1 
      AND p.organizationId IS NULL
      GROUP BY c.id, c.name, c.email, p.organizationId, p.odId
      LIMIT 25
    `);

    if (clientsWithNullOrg.length > 0) {
      console.log(`\n📋 Clientes con pianos donde organizationId IS NULL (primeros 25):`);
      clientsWithNullOrg.forEach(client => {
        console.log(`  - ID ${client.id}: ${client.name} | odId: "${client.odId}" | ${client.piano_count} piano(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

debugExcludedClients();
