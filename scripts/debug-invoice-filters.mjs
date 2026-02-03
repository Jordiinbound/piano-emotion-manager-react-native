import mysql from 'mysql2/promise';

async function debugFilters() {
  console.log('🔍 Debuggeando filtros de facturas...\n');
  
  const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';
  
  try {
    const connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: { rejectUnauthorized: true }
    });
    
    // 1. Verificar partnerId en facturas
    const [partnerRows] = await connection.execute(`
      SELECT partnerId, COUNT(*) as count 
      FROM invoices 
      GROUP BY partnerId
      ORDER BY count DESC
    `);
    
    console.log('📊 Facturas por partnerId:');
    partnerRows.forEach(row => {
      console.log(`   Partner ${row.partnerId === null ? 'NULL' : row.partnerId}: ${row.count} facturas`);
    });
    
    // 2. Facturas de enero 2026 por partnerId
    const [jan2026Rows] = await connection.execute(`
      SELECT partnerId, COUNT(*) as count 
      FROM invoices 
      WHERE date >= '2026-01-01' AND date <= '2026-01-31 23:59:59'
      GROUP BY partnerId
    `);
    
    console.log('\n📊 Facturas de enero 2026 por partnerId:');
    jan2026Rows.forEach(row => {
      console.log(`   Partner ${row.partnerId === null ? 'NULL' : row.partnerId}: ${row.count} facturas`);
    });
    
    // 3. Muestra de facturas de enero 2026
    const [sampleRows] = await connection.execute(`
      SELECT 
        id,
        invoiceNumber,
        clientName,
        DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') as date,
        total,
        status,
        partnerId
      FROM invoices 
      WHERE date >= '2026-01-01' AND date <= '2026-01-31 23:59:59'
      ORDER BY date DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Muestra de facturas de enero 2026:');
    sampleRows.forEach((inv, i) => {
      console.log(`   ${i + 1}. ${inv.invoiceNumber} | ${inv.clientName} | ${inv.date} | €${inv.total} | ${inv.status} | Partner: ${inv.partnerId === null ? 'NULL' : inv.partnerId}`);
    });
    
    // 4. Verificar usuarios/partners en la BD
    const [usersRows] = await connection.execute(`
      SELECT id, openId, name, email 
      FROM users 
      LIMIT 5
    `);
    
    console.log('\n👥 Usuarios en la BD:');
    usersRows.forEach((user, i) => {
      console.log(`   ${i + 1}. ID: ${user.id} | OpenID: ${user.openId} | ${user.name} | ${user.email}`);
    });
    
    // 5. Verificar partners
    const [partnersRows] = await connection.execute(`
      SELECT id, name, email, status 
      FROM partners 
      LIMIT 5
    `);
    
    console.log('\n🏢 Partners en la BD:');
    partnersRows.forEach((partner, i) => {
      console.log(`   ${i + 1}. ID: ${partner.id} | ${partner.name} | ${partner.email} | Status: ${partner.status}`);
    });
    
    await connection.end();
    console.log('\n✅ Debug completado');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

debugFilters();
