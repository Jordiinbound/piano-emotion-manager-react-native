import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2GeAqAcm5LrcHRv.root',
  password: '0wdx8FeWcw01ht74',
  database: 'piano_emotion_db',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

// Ver columnas de la tabla pianos
const [columns] = await connection.execute(`SHOW COLUMNS FROM pianos`);
console.log('\nColumnas de tabla pianos:');
columns.forEach(col => console.log(`- ${col.Field}`));

await connection.end();
