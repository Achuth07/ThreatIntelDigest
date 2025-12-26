import 'dotenv/config';
import { digestService } from '../server/services/digest-service.js';

async function main() {
    const TEST_EMAIL = 'achuth@umd.edu';
    console.log(`🚀 Starting Test Digest Workflow for: ${TEST_EMAIL}`);

    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL is missing.');
        process.exit(1);
    }
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ Error: RESEND_API_KEY is missing.');
        process.exit(1);
    }

    try {
        console.log('Generating digest...');
        const result = await digestService.generateWeeklyDigest({
            limitToEmails: [TEST_EMAIL]
        });

        console.log('\n✅ Test Workflow Complete!');
        console.log(`Sent: ${result.sent}`);
        console.log(`Errors: ${result.errors}`);
        console.log(`Skipped: ${result.skipped}`);

        if (result.sent === 0) {
            console.warn(`⚠️ Warning: No email was sent. Check if '${TEST_EMAIL}' enables 'emailWeeklyDigest' in their preferences.`);
        }

    } catch (error) {
        console.error('💥 Workflow Failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
