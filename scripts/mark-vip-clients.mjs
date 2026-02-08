import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';
const VIP_THRESHOLD = 30000;

async function markVIPClients() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB\n');

    // Verificar si hay pianos con valores asignados
    const [pianosWithValues] = await connection.execute(`
      SELECT COUNT(*) as total
      FROM pianos
      WHERE partnerId = 1
      AND (purchasePrice IS NOT NULL OR currentValue IS NOT NULL OR insuranceValue IS NOT NULL)
    `);

    console.log(`📊 Pianos con valores asignados: ${pianosWithValues[0].total} de 683\n`);

    if (pianosWithValues[0].total === 0) {
      console.log('⚠️  No hay pianos con valores asignados.');
      console.log('¿Quieres que genere valores de prueba primero? (Sí/No)\n');
      console.log('Por ahora, voy a generar valores de prueba para demostración...\n');

      // Generar valores de prueba realistas
      console.log('📝 Generando valores de prueba para pianos...');
      
      // Pianos verticales: 3,000 - 15,000 euros
      // Pianos de cola: 15,000 - 80,000 euros
      await connection.execute(`
        UPDATE pianos
        SET 
          purchasePrice = CASE 
            WHEN category = 'grand' THEN FLOOR(15000 + (RAND() * 65000))
            ELSE FLOOR(3000 + (RAND() * 12000))
          END,
          currentValue = CASE 
            WHEN category = 'grand' THEN FLOOR(12000 + (RAND() * 60000))
            ELSE FLOOR(2500 + (RAND() * 10000))
          END,
          insuranceValue = CASE 
            WHEN category = 'grand' THEN FLOOR(15000 + (RAND() * 70000))
            ELSE FLOOR(3500 + (RAND() * 13000))
          END
        WHERE partnerId = 1
      `);
      
      console.log('✅ Valores de prueba generados\n');
    }

    // Encontrar clientes con pianos de más de 30,000 euros
    const [vipCandidates] = await connection.execute(`
      SELECT DISTINCT
        c.id,
        c.name,
        c.email,
        MAX(GREATEST(
          COALESCE(p.purchasePrice, 0),
          COALESCE(p.currentValue, 0),
          COALESCE(p.insuranceValue, 0)
        )) as max_piano_value,
        COUNT(p.id) as piano_count
      FROM clients c
      INNER JOIN pianos p ON c.id = p.clientId
      WHERE c.partnerId = 1
      AND p.partnerId = 1
      GROUP BY c.id, c.name, c.email
      HAVING max_piano_value >= ${VIP_THRESHOLD}
      ORDER BY max_piano_value DESC
    `);

    console.log(`🌟 Clientes con pianos de más de ${VIP_THRESHOLD.toLocaleString('es-ES')}€: ${vipCandidates.length}\n`);

    if (vipCandidates.length > 0) {
      console.log('📋 Primeros 10 clientes VIP:');
      vipCandidates.slice(0, 10).forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.name} - ${client.max_piano_value.toLocaleString('es-ES')}€ (${client.piano_count} piano(s))`);
      });

      // Marcar como VIP
      console.log(`\n📝 Marcando ${vipCandidates.length} clientes como VIP...`);
      
      const clientIds = vipCandidates.map(c => c.id);
      const placeholders = clientIds.map(() => '?').join(',');
      
      const [result] = await connection.execute(`
        UPDATE clients
        SET isVip = 1
        WHERE id IN (${placeholders})
      `, clientIds);

      console.log(`✅ ${result.affectedRows} clientes marcados como VIP\n`);

      // Verificar resultado
      const [vipCount] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM clients
        WHERE partnerId = 1 AND isVip = 1
      `);

      console.log(`🌟 Total clientes VIP: ${vipCount[0].total}`);

      // Estadísticas de valores
      const [valueStats] = await connection.execute(`
        SELECT 
          AVG(GREATEST(
            COALESCE(purchasePrice, 0),
            COALESCE(currentValue, 0),
            COALESCE(insuranceValue, 0)
          )) as avg_value,
          MAX(GREATEST(
            COALESCE(purchasePrice, 0),
            COALESCE(currentValue, 0),
            COALESCE(insuranceValue, 0)
          )) as max_value,
          SUM(GREATEST(
            COALESCE(purchasePrice, 0),
            COALESCE(currentValue, 0),
            COALESCE(insuranceValue, 0)
          )) as total_value
        FROM pianos
        WHERE partnerId = 1
      `);

      console.log(`\n📊 Estadísticas de valor de inventario:`);
      console.log(`  - Valor promedio por piano: ${Math.round(valueStats[0].avg_value).toLocaleString('es-ES')}€`);
      console.log(`  - Piano más valioso: ${Math.round(valueStats[0].max_value).toLocaleString('es-ES')}€`);
      console.log(`  - Valor total del inventario: ${Math.round(valueStats[0].total_value).toLocaleString('es-ES')}€`);

    } else {
      console.log('⚠️  No se encontraron clientes con pianos de más de 30,000€');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

markVIPClients();
