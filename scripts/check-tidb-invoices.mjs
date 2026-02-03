import mysql from 'mysql2/promise';

async function checkTiDBInvoices() {
  console.log('🔍 Conectando a TiDB en producción...\n');
  
  // La URL de TiDB debe estar en las variables de entorno
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }
  
  console.log('📡 Conectando a:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    
    // 1. Total de facturas
    const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM invoices');
    console.log(`\n📊 Total de facturas en TiDB: ${totalRows[0].total}`);
    
    // 2. Primeras 5 facturas
    const [sampleRows] = await connection.execute(
      'SELECT id, invoiceNumber, clientName, date, total, status FROM invoices ORDER BY date DESC LIMIT 5'
    );
    console.log('\n📋 Últimas 5 facturas:');
    sampleRows.forEach((inv, i) => {
      console.log(`   ${i + 1}. ${inv.invoiceNumber} - ${inv.clientName} - ${inv.date} - €${inv.total} - ${inv.status}`);
    });
    
    // 3. Facturas por año
    const [yearRows] = await connection.execute(`
      SELECT YEAR(date) as year, COUNT(*) as count 
      FROM invoices 
      GROUP BY YEAR(date) 
      ORDER BY year
    `);
    console.log('\n📊 Facturas por año:');
    yearRows.forEach(row => {
      console.log(`   ${row.year}: ${row.count} facturas`);
    });
    
    // 4. Facturas de enero 2026
    const [jan2026Rows] = await connection.execute(`
      SELECT COUNT(*) as total 
      FROM invoices 
      WHERE date >= '2026-01-01' AND date <= '2026-01-31 23:59:59'
    `);
    console.log(`\n📅 Facturas en enero 2026: ${jan2026Rows[0].total}`);
    
    // 5. Facturas por mes en 2026
    const [month2026Rows] = await connection.execute(`
      SELECT MONTH(date) as month, COUNT(*) as count 
      FROM invoices 
      WHERE YEAR(date) = 2026
      GROUP BY MONTH(date) 
      ORDER BY month
    `);
    console.log('\n📊 Facturas por mes en 2026:');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    month2026Rows.forEach(row => {
      console.log(`   ${monthNames[row.month - 1]}: ${row.count} facturas`);
    });
    
    // 6. Facturas por estado
    const [statusRows] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM invoices 
      GROUP BY status
    `);
    console.log('\n📊 Facturas por estado:');
    statusRows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} facturas`);
    });
    
    await connection.end();
    console.log('\n✅ Verificación completada');
    
  } catch (err) {
    console.error('❌ Error al conectar a TiDB:', err.message);
    process.exit(1);
  }
}

checkTiDBInvoices();
