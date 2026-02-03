import mysql from 'mysql2/promise';

async function checkUserPartner() {
  console.log('🔍 Verificando partnerId del usuario...\n');
  
  const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';
  
  try {
    const connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: { rejectUnauthorized: true }
    });
    
    // Buscar el usuario Jordi Navarrete
    const [userRows] = await connection.execute(`
      SELECT id, openId, name, email, partnerId 
      FROM users 
      WHERE email = 'jnavarrete@inboundemotion.com'
    `);
    
    if (userRows.length === 0) {
      console.log('❌ Usuario no encontrado con email jnavarrete@inboundemotion.com');
      
      // Mostrar todos los usuarios
      const [allUsers] = await connection.execute(`
        SELECT id, openId, name, email, partnerId 
        FROM users
      `);
      
      console.log('\n👥 Todos los usuarios en la BD:');
      allUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ID: ${user.id} | ${user.name} | ${user.email} | Partner: ${user.partnerId === null ? 'NULL' : user.partnerId}`);
      });
    } else {
      const user = userRows[0];
      console.log('✅ Usuario encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   OpenID: ${user.openId}`);
      console.log(`   Nombre: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   PartnerId: ${user.partnerId === null ? '❌ NULL (PROBLEMA)' : `✅ ${user.partnerId}`}`);
      
      if (user.partnerId === null) {
        console.log('\n⚠️  PROBLEMA ENCONTRADO:');
        console.log('   El usuario NO tiene partnerId asignado.');
        console.log('   Por eso no puede ver las facturas (todas tienen partnerId = 1)');
        console.log('\n💡 SOLUCIÓN:');
        console.log('   Ejecutar: UPDATE users SET partnerId = 1 WHERE email = \'jnavarrete@inboundemotion.com\';');
      } else {
        console.log('\n✅ El usuario tiene partnerId asignado correctamente.');
        
        // Verificar facturas con ese partnerId
        const [invoiceCount] = await connection.execute(`
          SELECT COUNT(*) as total 
          FROM invoices 
          WHERE partnerId = ?
        `, [user.partnerId]);
        
        console.log(`   Facturas con partnerId ${user.partnerId}: ${invoiceCount[0].total}`);
      }
    }
    
    await connection.end();
    console.log('\n✅ Verificación completada');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkUserPartner();
