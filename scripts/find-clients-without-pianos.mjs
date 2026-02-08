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

// Encontrar clientes sin pianos
const [clientsWithoutPianos] = await connection.execute(`
  SELECT c.id, c.first_name, c.last_name1, c.last_name2
  FROM clients c
  LEFT JOIN pianos p ON c.id = p.client_id
  WHERE p.id IS NULL
  ORDER BY c.id
  LIMIT 30
`);

console.log(`\nClientes sin pianos: ${clientsWithoutPianos.length}\n`);
clientsWithoutPianos.forEach((client, index) => {
  const fullName = [client.first_name, client.last_name1, client.last_name2].filter(Boolean).join(' ');
  console.log(`${index + 1}. ID: ${client.id} - ${fullName}`);
});

await connection.end();
