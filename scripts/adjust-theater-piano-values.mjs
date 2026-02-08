import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function adjustTheaterPianoValues() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB\n');

    // Identificar teatros y salas de conciertos
    const [theaters] = await connection.execute(`
      SELECT id, name
      FROM clients
      WHERE partnerId = 1
      AND (
        name LIKE '%Teatro%'
        OR name LIKE '%Sala de Conciertos%'
        OR name LIKE '%Auditorio%'
      )
      ORDER BY name
    `);

    console.log(`🎭 Teatros y salas de conciertos encontrados: ${theaters.length}\n`);
    
    if (theaters.length > 0) {
      console.log('📋 Listado:');
      theaters.forEach((theater, index) => {
        console.log(`  ${index + 1}. ${theater.name}`);
      });

      const theaterIds = theaters.map(t => t.id);
      const placeholders = theaterIds.map(() => '?').join(',');

      // Contar pianos de teatros
      const [pianoCount] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM pianos
        WHERE clientId IN (${placeholders})
        AND partnerId = 1
      `, theaterIds);

      console.log(`\n🎹 Total pianos de teatros: ${pianoCount[0].total}`);

      // Cambiar todos los pianos de teatros a categoría 'grand' (cola)
      console.log('\n📝 Convirtiendo todos los pianos de teatros a pianos de cola...');
      const [updateCategory] = await connection.execute(`
        UPDATE pianos
        SET category = 'grand'
        WHERE clientId IN (${placeholders})
        AND partnerId = 1
      `, theaterIds);

      console.log(`✅ ${updateCategory.affectedRows} pianos convertidos a categoría 'grand'`);

      // Ajustar valores a rango alto (50,000€ - 150,000€)
      console.log('\n📝 Ajustando valores a rango alto (50,000€ - 150,000€)...');
      const [updateValues] = await connection.execute(`
        UPDATE pianos
        SET 
          purchasePrice = FLOOR(50000 + (RAND() * 100000)),
          currentValue = FLOOR(45000 + (RAND() * 95000)),
          insuranceValue = FLOOR(55000 + (RAND() * 105000))
        WHERE clientId IN (${placeholders})
        AND partnerId = 1
      `, theaterIds);

      console.log(`✅ ${updateValues.affectedRows} pianos actualizados con valores de alto rango`);

      // Mostrar estadísticas de teatros
      const [theaterStats] = await connection.execute(`
        SELECT 
          c.name,
          COUNT(p.id) as piano_count,
          AVG(GREATEST(
            COALESCE(p.purchasePrice, 0),
            COALESCE(p.currentValue, 0),
            COALESCE(p.insuranceValue, 0)
          )) as avg_value,
          MAX(GREATEST(
            COALESCE(p.purchasePrice, 0),
            COALESCE(p.currentValue, 0),
            COALESCE(p.insuranceValue, 0)
          )) as max_value
        FROM clients c
        INNER JOIN pianos p ON c.id = p.clientId
        WHERE c.id IN (${placeholders})
        AND p.partnerId = 1
        GROUP BY c.id, c.name
        ORDER BY max_value DESC
        LIMIT 10
      `, theaterIds);

      console.log(`\n📊 Top 10 teatros por valor de piano:`);
      theaterStats.forEach((theater, index) => {
        console.log(`  ${index + 1}. ${theater.name}`);
        console.log(`     ${theater.piano_count} piano(s) | Promedio: ${Math.round(theater.avg_value).toLocaleString('es-ES')}€ | Máximo: ${Math.round(theater.max_value).toLocaleString('es-ES')}€`);
      });

      // Recalcular VIPs
      console.log('\n📝 Recalculando clientes VIP...');
      
      // Primero, resetear todos los VIP
      await connection.execute(`
        UPDATE clients
        SET isVip = 0
        WHERE partnerId = 1
      `);

      // Marcar como VIP clientes con pianos de más de 30,000€
      const [vipCandidates] = await connection.execute(`
        SELECT DISTINCT c.id
        FROM clients c
        INNER JOIN pianos p ON c.id = p.clientId
        WHERE c.partnerId = 1
        AND p.partnerId = 1
        AND GREATEST(
          COALESCE(p.purchasePrice, 0),
          COALESCE(p.currentValue, 0),
          COALESCE(p.insuranceValue, 0)
        ) >= 30000
      `);

      const vipIds = vipCandidates.map(c => c.id);
      if (vipIds.length > 0) {
        const vipPlaceholders = vipIds.map(() => '?').join(',');
        await connection.execute(`
          UPDATE clients
          SET isVip = 1
          WHERE id IN (${vipPlaceholders})
        `, vipIds);
      }

      console.log(`✅ ${vipIds.length} clientes marcados como VIP`);

      // Estadísticas finales
      const [finalStats] = await connection.execute(`
        SELECT 
          SUM(CASE WHEN category = 'grand' THEN 1 ELSE 0 END) as grand_pianos,
          SUM(CASE WHEN category = 'vertical' THEN 1 ELSE 0 END) as vertical_pianos,
          AVG(GREATEST(
            COALESCE(purchasePrice, 0),
            COALESCE(currentValue, 0),
            COALESCE(insuranceValue, 0)
          )) as avg_value,
          SUM(GREATEST(
            COALESCE(purchasePrice, 0),
            COALESCE(currentValue, 0),
            COALESCE(insuranceValue, 0)
          )) as total_value
        FROM pianos
        WHERE partnerId = 1
      `);

      console.log(`\n📊 Estadísticas finales del inventario:`);
      console.log(`  - Pianos de cola: ${finalStats[0].grand_pianos}`);
      console.log(`  - Pianos verticales: ${finalStats[0].vertical_pianos}`);
      console.log(`  - Valor promedio: ${Math.round(finalStats[0].avg_value).toLocaleString('es-ES')}€`);
      console.log(`  - Valor total: ${Math.round(finalStats[0].total_value).toLocaleString('es-ES')}€`);

    } else {
      console.log('⚠️  No se encontraron teatros o salas de conciertos');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

adjustTheaterPianoValues();
