import mysql from 'mysql2/promise';

const DATABASE_URL = 'mysql://2GeAqAcm5LrcHRv.root:0wdx8FeWcw01ht74@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/piano_emotion_db';

async function addPianoValueFields() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('✅ Conectado a TiDB\n');

    // Verificar si los campos ya existen
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'piano_emotion_db' 
      AND TABLE_NAME = 'pianos'
      AND COLUMN_NAME IN ('purchasePrice', 'currentValue', 'insuranceValue')
    `);

    if (columns.length > 0) {
      console.log('⚠️  Algunos campos ya existen:');
      columns.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
      console.log('\nEliminando campos existentes antes de recrearlos...\n');
      
      for (const col of columns) {
        await connection.execute(`ALTER TABLE pianos DROP COLUMN ${col.COLUMN_NAME}`);
        console.log(`✅ Campo ${col.COLUMN_NAME} eliminado`);
      }
    }

    // Agregar purchasePrice
    console.log('\n📝 Agregando campo purchasePrice...');
    await connection.execute(`
      ALTER TABLE pianos 
      ADD COLUMN purchasePrice DECIMAL(10, 2) NULL
      COMMENT 'Precio de compra original del piano'
    `);
    console.log('✅ Campo purchasePrice agregado');

    // Agregar currentValue
    console.log('\n📝 Agregando campo currentValue...');
    await connection.execute(`
      ALTER TABLE pianos 
      ADD COLUMN currentValue DECIMAL(10, 2) NULL
      COMMENT 'Valor actual estimado del piano'
    `);
    console.log('✅ Campo currentValue agregado');

    // Agregar insuranceValue
    console.log('\n📝 Agregando campo insuranceValue...');
    await connection.execute(`
      ALTER TABLE pianos 
      ADD COLUMN insuranceValue DECIMAL(10, 2) NULL
      COMMENT 'Valor asegurado del piano'
    `);
    console.log('✅ Campo insuranceValue agregado');

    // Verificar que se agregaron correctamente
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'piano_emotion_db' 
      AND TABLE_NAME = 'pianos'
      AND COLUMN_NAME IN ('purchasePrice', 'currentValue', 'insuranceValue')
      ORDER BY COLUMN_NAME
    `);

    console.log('\n📊 Campos agregados exitosamente:');
    newColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.COLUMN_COMMENT})`);
    });

    console.log('\n✅ Migración completada exitosamente!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

addPianoValueFields();
