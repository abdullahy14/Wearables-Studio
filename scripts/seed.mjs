import { promises as fs } from 'fs';
import path from 'path';

const target = path.join(process.cwd(), 'data', 'store.json');
await fs.rm(target, { force: true });
console.log('Seed reset. Start the app to recreate data/store.json.');
