const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const { seedIfEmpty } = require('./src/services/seed');

(async () => {
  await connectDB();
  await seedIfEmpty(); // first run only: creates demo labs, PCs and users
  app.listen(env.port, () => {
    console.log('\n  ┌──────────────────────────────────────────────┐');
    console.log('  │  UNIFIX API running                          │');
    console.log(`  │  http://localhost:${String(env.port).padEnd(27)}│`);
    console.log('  └──────────────────────────────────────────────┘\n');
  });
})();
