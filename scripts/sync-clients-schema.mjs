/**
 * Script para sincronizar el schema de la tabla clients
 * Agrega todos los campos faltantes
 */
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function syncClientsSchema() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Sincronizando schema de la tabla clients...\n');
    
    // Lista de campos a verificar y agregar
    const fieldsToAdd = [
      {
        name: 'isVip',
        definition: 'isVip TINYINT DEFAULT 0',
        after: 'clientType'
      },
      {
        name: 'route_id',
        definition: 'route_id INT',
        after: 'routeGroup'
      },
      {
        name: 'fiscalAddress',
        definition: 'fiscalAddress TEXT',
        after: 'address'
      }
    ];
    
    for (const field of fieldsToAdd) {
      // Verificar si la columna ya existe
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM clients LIKE '${field.name}'`
      );
      
      if (columns.length > 0) {
        console.log(`✅ ${field.name}: Ya existe`);
      } else {
        console.log(`❌ ${field.name}: No existe, agregando...`);
        
        try {
          await connection.query(
            `ALTER TABLE clients ADD COLUMN ${field.definition} AFTER ${field.after}`
          );
          console.log(`   ✅ Campo ${field.name} agregado exitosamente`);
        } catch (error) {
          console.log(`   ⚠️  Error al agregar ${field.name}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Sincronización completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

syncClientsSchema();
