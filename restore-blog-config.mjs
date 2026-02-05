/**
 * Script para restaurar la configuración del blog de WooCommerce
 */

import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2GeAqAcm5LrcHRv.root',
  password: '0wdx8FeWcw01ht74',
  database: 'piano_emotion_db',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
};

async function main() {
  console.log('🔍 Conectando a la base de datos...\n');
  
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    // 1. Verificar si existe la tabla
    console.log('📋 Verificando tabla distributor_woocommerce_config...');
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'distributor_woocommerce_config'"
    );
    
    if (tables.length === 0) {
      console.log('❌ La tabla distributor_woocommerce_config no existe');
      console.log('   Necesitas ejecutar las migraciones primero');
      return;
    }
    
    console.log('✅ Tabla existe\n');
    
    // 2. Verificar si existe configuración
    console.log('🔍 Buscando configuración existente...');
    const [configs] = await connection.query(
      'SELECT * FROM distributor_woocommerce_config'
    );
    
    if (configs.length > 0) {
      console.log('✅ Configuración encontrada:');
      console.log(JSON.stringify(configs[0], null, 2));
      console.log('\n📝 URL actual:', configs[0].url);
      console.log('📝 Estado:', configs[0].enabled ? 'Habilitado' : 'Deshabilitado');
      console.log('📝 Estado de conexión:', configs[0].connectionStatus);
    } else {
      console.log('❌ No se encontró configuración');
      console.log('\n📋 Estructura necesaria:');
      console.log('- distributorId: ID del distribuidor');
      console.log('- url: https://www.pianoemotion.es');
      console.log('- consumerKey: Clave de API de WooCommerce');
      console.log('- consumerSecret: Secret de API de WooCommerce');
    }
    
    // 3. Verificar distributors
    console.log('\n🔍 Verificando distribuidores...');
    const [distributors] = await connection.query(
      'SELECT * FROM distributors LIMIT 5'
    );
    
    if (distributors.length > 0) {
      console.log(`✅ Encontrados ${distributors.length} distribuidores:`);
      distributors.forEach(d => {
        console.log(`   - ID: ${d.id}, Nombre: ${d.name}, Activo: ${d.is_active}`);
      });
    } else {
      console.log('❌ No se encontraron distribuidores');
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
