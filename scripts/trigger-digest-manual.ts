import 'dotenv/config';
import { digestService } from '../server/services/digest-service.js';

async function main() {
    console.log('🚀 Triggering manual weekly digest for ALL eligible users...');
    console.log('This will send emails to all users with emailWeeklyDigest=true and emailVerified=true.');

    try {
        const start = Date.now();

        // Exclude users who already received it today
        const excludeEmails: string[] = [];

        const result = await digestService.generateWeeklyDigest({ excludeEmails });
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        console.log('\n✅ Digest generation complete!');
        console.log(`⏱️ Duration: ${duration}s`);
        console.log(`Total Recipients: ${result.total || 0}`);
        console.log(`Successfully Sent: ${result.sent}`);
        console.log(`Errors: ${result.errors}`);
        console.log(`Skipped: ${result.skipped || 0}`);

    } catch (error) {
        console.error('❌ Failed to trigger digest:', error);
    }

    process.exit(0);
}

main();
