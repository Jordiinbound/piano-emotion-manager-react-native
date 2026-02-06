/**
 * Script para ejecutar migración de categorías de inventario
 * Usa el sistema de BD del proyecto
 */
import * as db from '../drizzle/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de categorías...');
    
    const database = await db.getDb();
    if (!database) {
      throw new Error('No se pudo obtener la conexión a la base de datos');
    }
    
    console.log('✅ Conexión a BD establecida');
    
    // Leer el script SQL
    const sqlScript = fs.readFileSync('./scripts/create-inventory-categories-table.sql', 'utf8');
    
    // Ejecutar cada statement
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📝 Ejecutando ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`  [${i + 1}/${statements.length}] Ejecutando...`);
        await database.execute(sql.raw(statement));
      }
    }
    
    console.log('✅ Migración completada exitosamente');
    
    // Verificar
    const result = await database.execute(
      sql.raw('SELECT COUNT(*) as total FROM inventory_categories WHERE is_system = true')
    );
    
    console.log('📊 Total categorías del sistema:', result.rows[0]?.total || 0);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigration();
