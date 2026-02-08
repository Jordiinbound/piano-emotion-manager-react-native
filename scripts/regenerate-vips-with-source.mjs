import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';
const VIP_THRESHOLD = 30000;

async function main() {
  console.log('🔄 Regenerando VIPs con vipSource...');
  
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    typeCast: true
  });

  try {
    console.log('✅ Conectado a TiDB');

    // 1. Limpiar VIPs automáticos existentes
    console.log('\n📝 Limpiando VIPs automáticos existentes...');
    await connection.query(`
      UPDATE clients 
      SET isVip = 0, vipSource = NULL 
      WHERE vipSource = 'auto' OR vipSource IS NULL
    `);

    // 2. Obtener todos los pianos con sus valores
    console.log(`\n🔍 Buscando clientes con pianos de más de ${VIP_THRESHOLD}€...`);
    
    const [pianos] = await connection.query(`
      SELECT 
        p.clientId,
        c.name as clientName,
        p.purchasePrice,
        p.currentValue,
        p.insuranceValue
      FROM pianos p
      INNER JOIN clients c ON p.clientId = c.id
      WHERE p.clientId IS NOT NULL
        AND p.partnerId = 1
    `);

    // 3. Procesar en JavaScript para encontrar clientes VIP
    const clientMaxValues = new Map();
    
    for (const piano of pianos) {
      const maxValue = Math.max(
        piano.purchasePrice || 0,
        piano.currentValue || 0,
        piano.insuranceValue || 0
      );
      
      if (!clientMaxValues.has(piano.clientId) || clientMaxValues.get(piano.clientId).value < maxValue) {
        clientMaxValues.set(piano.clientId, {
          clientId: piano.clientId,
          name: piano.clientName,
          value: maxValue
        });
      }
    }

    // 4. Filtrar clientes que superan el umbral
    const vipClients = Array.from(clientMaxValues.values())
      .filter(client => client.value >= VIP_THRESHOLD)
      .sort((a, b) => b.value - a.value);

    console.log(`✅ Encontrados ${vipClients.length} clientes que superan el umbral`);

    if (vipClients.length > 0) {
      // 5. Marcar como VIP automático
      console.log('\n📝 Marcando clientes como VIP automático...');
      
      const clientIds = vipClients.map(c => c.clientId);
      const placeholders = clientIds.map(() => '?').join(',');
      
      const [updateResult] = await connection.query(`
        UPDATE clients 
        SET isVip = 1, vipSource = 'auto' 
        WHERE id IN (${placeholders})
          AND partnerId = 1
      `, clientIds);

      console.log(`✅ ${updateResult.affectedRows} clientes marcados como VIP automático`);

      // 6. Mostrar top 10 VIPs
      console.log('\n🏆 Top 10 clientes VIP:');
      for (let i = 0; i < Math.min(10, vipClients.length); i++) {
        const client = vipClients[i];
        console.log(`  ${i + 1}. ${client.name} - ${client.value.toLocaleString('es-ES')}€`);
      }
    }

    // 7. Estadísticas finales
    console.log('\n📊 Estadísticas finales:');
    const [stats] = await connection.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        SUM(CASE WHEN c.isVip = 1 AND c.vipSource = 'auto' THEN 1 ELSE 0 END) as auto_vips,
        SUM(CASE WHEN c.isVip = 1 AND c.vipSource = 'manual' THEN 1 ELSE 0 END) as manual_vips,
        COUNT(DISTINCT p.id) as total_pianos
      FROM clients c
      LEFT JOIN pianos p ON c.id = p.clientId
      WHERE c.partnerId = 1
    `);

    console.log(`  Total clientes: ${stats[0].total_clients}`);
    console.log(`  VIPs automáticos: ${stats[0].auto_vips}`);
    console.log(`  VIPs manuales: ${stats[0].manual_vips}`);
    console.log(`  Total pianos: ${stats[0].total_pianos}`);

    console.log('\n✅ Regeneración completada exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
