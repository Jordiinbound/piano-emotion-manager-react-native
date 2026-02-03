import mysql from 'mysql2/promise';

async function checkProductionDB() {
  console.log('🔍 Conectando a TiDB de PRODUCCIÓN (piano_emotion_db)...\n');
  
  const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';
  
  try {
    console.log('📡 Conectando a: gateway01.eu-central-1.prod.aws.tidbcloud.com');
    console.log('📊 Base de datos: piano_emotion_db\n');
    
    const connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: {
        rejectUnauthorized: true,
      }
    });
    
    console.log('✅ Conexión exitosa\n');
    
    // Verificar versión
    const [versionRows] = await connection.execute('SELECT VERSION() as version');
    console.log(`📊 Versión: ${versionRows[0].version}\n`);
    
    // Total de facturas
    const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM invoices');
    console.log(`📊 Total de facturas en producción: ${totalRows[0].total}\n`);
    
    // Distribución por año y mes
    const [monthRows] = await connection.execute(`
      SELECT 
        YEAR(date) as year, 
        MONTH(date) as month, 
        COUNT(*) as count 
      FROM invoices 
      GROUP BY YEAR(date), MONTH(date) 
      ORDER BY year DESC, month DESC
      LIMIT 12
    `);
    
    console.log('📊 Facturas por mes:');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    monthRows.forEach(row => {
      console.log(`   ${monthNames[row.month - 1]} ${row.year}: ${row.count} facturas`);
    });
    
    // Últimas 10 facturas
    const [recentRows] = await connection.execute(`
      SELECT 
        id, 
        invoiceNumber, 
        clientName, 
        DATE_FORMAT(date, '%Y-%m-%d') as date, 
        total, 
        status
      FROM invoices 
      ORDER BY date DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Últimas 10 facturas:');
    recentRows.forEach((inv, i) => {
      console.log(`   ${i + 1}. ${inv.invoiceNumber} - ${inv.clientName} - ${inv.date} - €${inv.total} - ${inv.status}`);
    });
    
    // Estados
    const [statusRows] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM invoices 
      GROUP BY status
    `);
    
    console.log('\n📊 Facturas por estado:');
    statusRows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    
    // Rango de fechas
    const [rangeRows] = await connection.execute(`
      SELECT 
        MIN(date) as min_date, 
        MAX(date) as max_date 
      FROM invoices
    `);
    
    console.log('\n📅 Rango de fechas:');
    console.log(`   Desde: ${rangeRows[0].min_date}`);
    console.log(`   Hasta: ${rangeRows[0].max_date}`);
    
    await connection.end();
    console.log('\n✅ Análisis completado');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code) console.error(`   Código: ${err.code}`);
    process.exit(1);
  }
}

checkProductionDB();
