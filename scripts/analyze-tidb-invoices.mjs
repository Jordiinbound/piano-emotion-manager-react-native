import mysql from 'mysql2/promise';

async function analyzeInvoices() {
  console.log('🔍 Analizando facturas en TiDB (Producción)...\n');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }
  
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    // 1. Total de facturas
    const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM invoices');
    console.log(`📊 Total de facturas: ${totalRows[0].total}\n`);
    
    // 2. Distribución por año
    const [yearRows] = await connection.execute(`
      SELECT YEAR(date) as year, COUNT(*) as count 
      FROM invoices 
      GROUP BY YEAR(date) 
      ORDER BY year DESC
    `);
    console.log('📊 Distribución por año:');
    yearRows.forEach(row => {
      console.log(`   ${row.year}: ${row.count} facturas`);
    });
    
    // 3. Distribución por mes en cada año
    const [monthRows] = await connection.execute(`
      SELECT 
        YEAR(date) as year, 
        MONTH(date) as month, 
        COUNT(*) as count 
      FROM invoices 
      GROUP BY YEAR(date), MONTH(date) 
      ORDER BY year DESC, month DESC
      LIMIT 24
    `);
    console.log('\n📊 Distribución por mes (últimos 24 meses):');
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    monthRows.forEach(row => {
      console.log(`   ${monthNames[row.month - 1]} ${row.year}: ${row.count} facturas`);
    });
    
    // 4. Primeras 10 facturas ordenadas por fecha descendente
    const [recentRows] = await connection.execute(`
      SELECT 
        id, 
        invoiceNumber, 
        clientName, 
        DATE_FORMAT(date, '%Y-%m-%d') as date, 
        total, 
        status,
        partnerId
      FROM invoices 
      ORDER BY date DESC 
      LIMIT 10
    `);
    console.log('\n📋 Últimas 10 facturas:');
    recentRows.forEach((inv, i) => {
      console.log(`   ${i + 1}. ${inv.invoiceNumber} | ${inv.clientName} | ${inv.date} | €${inv.total} | ${inv.status} | Partner: ${inv.partnerId || 'NULL'}`);
    });
    
    // 5. Distribución por estado
    const [statusRows] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM invoices 
      GROUP BY status
    `);
    console.log('\n📊 Distribución por estado:');
    statusRows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} facturas`);
    });
    
    // 6. Verificar partnerId (filtro de organización)
    const [partnerRows] = await connection.execute(`
      SELECT 
        partnerId, 
        COUNT(*) as count 
      FROM invoices 
      GROUP BY partnerId
    `);
    console.log('\n📊 Distribución por partnerId:');
    partnerRows.forEach(row => {
      console.log(`   Partner ${row.partnerId || 'NULL'}: ${row.count} facturas`);
    });
    
    // 7. Rango de fechas
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
    process.exit(1);
  }
}

analyzeInvoices();
