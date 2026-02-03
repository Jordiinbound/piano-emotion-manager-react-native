import mysql from 'mysql2/promise';

async function verifyConnection() {
  console.log('🔍 Verificando conexión a TiDB...\n');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida en el entorno');
    console.log('\n📋 Variables de entorno disponibles:');
    Object.keys(process.env).filter(k => k.includes('DATABASE')).forEach(k => {
      console.log(`   ${k}: ${process.env[k]?.substring(0, 50)}...`);
    });
    process.exit(1);
  }
  
  // Mostrar información de la conexión (ocultando password)
  const urlParts = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
  if (urlParts) {
    console.log('📡 Información de conexión:');
    console.log(`   Usuario: ${urlParts[1]}`);
    console.log(`   Host: ${urlParts[3]}`);
    console.log(`   Base de datos: ${urlParts[4]}`);
    console.log('');
  }
  
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Conexión exitosa a TiDB\n');
    
    // Verificar que es TiDB
    const [versionRows] = await connection.execute('SELECT VERSION() as version');
    console.log(`📊 Versión del servidor: ${versionRows[0].version}`);
    
    // Verificar base de datos actual
    const [dbRows] = await connection.execute('SELECT DATABASE() as db');
    console.log(`📊 Base de datos actual: ${dbRows[0].db}\n`);
    
    // Listar todas las tablas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 Tablas en la base de datos (${tables.length}):`);
    tables.forEach((row, i) => {
      const tableName = Object.values(row)[0];
      console.log(`   ${i + 1}. ${tableName}`);
    });
    
    // Verificar tabla invoices específicamente
    const [invoiceCheck] = await connection.execute(`
      SELECT COUNT(*) as total FROM invoices
    `);
    console.log(`\n📊 Total de registros en tabla 'invoices': ${invoiceCheck[0].total}`);
    
    await connection.end();
    console.log('\n✅ Verificación completada');
    
  } catch (err) {
    console.error('❌ Error al conectar:', err.message);
    if (err.code) console.error(`   Código de error: ${err.code}`);
    if (err.errno) console.error(`   Errno: ${err.errno}`);
    process.exit(1);
  }
}

verifyConnection();
