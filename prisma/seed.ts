import { ensureSeeded } from '../server/seed';

ensureSeeded()
  .then(() => {
    console.log('Seed selesai.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed gagal:', err);
    process.exit(1);
  });
