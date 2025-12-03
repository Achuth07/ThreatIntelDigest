import 'dotenv/config';
import { digestService } from '../server/services/digest-service.js';

async function main() {
    try {
        console.log('Testing weekly digest generation...');
        const result = await digestService.generateWeeklyDigest();
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

main();
