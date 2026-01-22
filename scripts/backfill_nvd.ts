
import { fetchAndStoreNvdCves } from '../server/services/nvd.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('Starting NVD Backfill Process...');

    // Default to 90 days if not specified
    let daysToBackfill = 90;

    // Simple arg parsing
    const args = process.argv.slice(2);
    const daysArgIndex = args.indexOf('--days');
    const allArgIndex = args.indexOf('--all');

    const endDate = new Date();
    let startDate = new Date();

    if (allArgIndex !== -1) {
        console.log('Backfilling ALL CVEs since 1999...');
        startDate = new Date('1999-01-01');
    } else if (daysArgIndex !== -1 && args[daysArgIndex + 1]) {
        daysToBackfill = parseInt(args[daysArgIndex + 1], 10);
        console.log(`Backfilling for the last ${daysToBackfill} days...`);
        startDate.setDate(startDate.getDate() - daysToBackfill);
    } else {
        console.log(`Backfilling for the last ${daysToBackfill} days (default)...`);
        startDate.setDate(startDate.getDate() - daysToBackfill);
    }

    // Split into 30-day chunks to respect NVD recommendations/limits and keeping URL length sane
    // NVD max range is 120 days actually.
    const chunkSize = 30;
    let currentStart = new Date(startDate);

    while (currentStart < endDate) {
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + chunkSize);
        if (currentEnd > endDate) currentEnd = endDate;

        console.log(`Processing chunk: ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}`);

        try {
            await fetchAndStoreNvdCves(currentStart, currentEnd);
        } catch (error) {
            console.error(`Error processing chunk ${currentStart.toISOString()} - ${currentEnd.toISOString()}:`, error);
        }

        currentStart = new Date(currentEnd);
        // Small buffer between chunks
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('Backfill complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
