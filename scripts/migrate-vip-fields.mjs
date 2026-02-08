import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function main() {
  console.log('🔄 Iniciando migración de campos VIP...');
  
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB');

    // 1. Agregar campo vipSource a clients si no existe
    console.log('\n📝 Agregando campo vipSource a tabla clients...');
    try {
      await connection.query(`
        ALTER TABLE clients 
        ADD COLUMN vipSource ENUM('auto', 'manual') NULL AFTER isVip
      `);
      console.log('✅ Campo vipSource agregado');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Campo vipSource ya existe');
      } else {
        throw error;
      }
    }

    // 2. Agregar campo vipThreshold a partner_settings si no existe
    console.log('\n📝 Agregando campo vipThreshold a tabla partner_settings...');
    try {
      await connection.query(`
        ALTER TABLE partner_settings 
        ADD COLUMN vipThreshold DECIMAL(10, 2) DEFAULT 30000.00 AFTER calendarSync
      `);
      console.log('✅ Campo vipThreshold agregado');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Campo vipThreshold ya existe');
      } else {
        throw error;
      }
    }

    // 3. Marcar VIPs existentes como 'auto' (fueron generados automáticamente)
    console.log('\n📝 Actualizando VIPs existentes a vipSource="auto"...');
    const [updateResult] = await connection.query(`
      UPDATE clients 
      SET vipSource = 'auto' 
      WHERE isVip = 1 AND vipSource IS NULL
    `);
    console.log(`✅ ${updateResult.affectedRows} clientes VIP actualizados a vipSource="auto"`);

    // 4. Verificar resultados
    console.log('\n📊 Verificando resultados...');
    const [vipStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_vips,
        SUM(CASE WHEN vipSource = 'auto' THEN 1 ELSE 0 END) as auto_vips,
        SUM(CASE WHEN vipSource = 'manual' THEN 1 ELSE 0 END) as manual_vips,
        SUM(CASE WHEN vipSource IS NULL AND isVip = 1 THEN 1 ELSE 0 END) as vips_sin_source
      FROM clients
      WHERE isVip = 1
    `);
    
    console.log('\n📈 Estadísticas VIP:');
    console.log(`  Total VIPs: ${vipStats[0].total_vips}`);
    console.log(`  VIPs automáticos: ${vipStats[0].auto_vips}`);
    console.log(`  VIPs manuales: ${vipStats[0].manual_vips}`);
    console.log(`  VIPs sin source: ${vipStats[0].vips_sin_source}`);

    console.log('\n✅ Migración completada exitosamente!');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
