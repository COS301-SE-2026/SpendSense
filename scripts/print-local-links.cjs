const links = [
  ['Frontend', 'http://localhost:5173'],
  ['Backend API', 'http://localhost:3000/api/v1'],
  ['Backend Health', 'http://localhost:3000/api/v1/health'],
  ['Backend Swagger', 'http://localhost:3000/api/v1/docs'],
  ['AI Service', 'http://localhost:8000'],
  ['AI Health', 'http://localhost:8000/health'],
  ['AI OpenAPI JSON', 'http://localhost:8000/openapi.json'],
  ['MinIO API', 'http://localhost:9000'],
  ['MinIO Console', 'http://localhost:9001'],
  ['PostgreSQL', 'localhost:5432'],
];

const maxLabelLength = Math.max(...links.map(([label]) => label.length));

console.log('\nSpendSense local links\n');
for (const [label, url] of links) {
  console.log(`${label.padEnd(maxLabelLength)}  ${url}`);
}
console.log('');
