import * as dotenv from 'dotenv';
import { ingestEpss } from '../server/services/epss.js';

dotenv.config();

ingestEpss({ force: process.argv.includes('--force') })
  .then(() => process.exit(0))
  .catch(error => {
    console.error('EPSS ingest failed:', error);
    process.exit(1);
  });
