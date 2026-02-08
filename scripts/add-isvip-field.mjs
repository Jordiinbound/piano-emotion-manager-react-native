/**
 * Script para agregar el campo isVip a la tabla clients
 * Ejecuta ALTER TABLE directamente en la base de datos
 */
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function addIsVipField() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Verificando si el campo isVip ya existe...\n');
    
    // Verificar si la columna ya existe
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM clients LIKE 'isVip'`
    );
    
    if (columns.length > 0) {
      console.log('✅ El campo isVip ya existe en la tabla clients');
      console.log('   No es necesario hacer nada.\n');
      await connection.end();
      process.exit(0);
    }
    
    console.log('❌ El campo isVip NO existe en la tabla clients');
    console.log('🔨 Agregando campo isVip...\n');
    
    // Agregar la columna
    await connection.query(
      `ALTER TABLE clients ADD COLUMN isVip TINYINT DEFAULT 0 AFTER clientType`
    );
    
    console.log('✅ Campo isVip agregado exitosamente\n');
    
    // Verificar que se agregó correctamente
    const [newColumns] = await connection.query(
      `SHOW COLUMNS FROM clients LIKE 'isVip'`
    );
    
    if (newColumns.length > 0) {
      console.log('✅ Verificación exitosa: el campo isVip está presente');
      console.log('   Tipo:', newColumns[0].Type);
      console.log('   Default:', newColumns[0].Default);
      console.log('   Null:', newColumns[0].Null);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addIsVipField();
