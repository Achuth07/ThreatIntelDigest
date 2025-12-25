import 'dotenv/config';
import { digestService } from '../server/services/digest-service.js';

async function main() {
    console.log("🚀 Simulating Vercel Cron Logic (Safe Mode)...");

    // 1. Simulate the Auth Check Logic from api/index.ts
    // Logic: if (process.env.CRON_SECRET && (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`))

    // Scenario: CRON_SECRET is MISSING in env (User's reported state)
    delete process.env.CRON_SECRET;
    console.log("ℹ️  Environment: CRON_SECRET is currently undefined (as reported in Vercel).");

    const mockReq = { headers: {} }; // No Auth header
    const authHeader = mockReq.headers['authorization'];

    // Evaluate the condition exactly as written in api/index.ts
    const shouldReject = process.env.CRON_SECRET && (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`);

    if (shouldReject) {
        console.error("❌ Auth Check: FAILED. accessing endpoint would return 401.");
    } else {
        console.log("✅ Auth Check: PASSED. Endpoint is accessible (Fail Open).");
        console.log("   Reason: CRON_SECRET is missing, so the check `process.env.CRON_SECRET && ...` evaluates to false/undefined, skipping the block.");
    }

    // 2. Run the Digest Service Safely
    console.log("\n📧 Triggering Digest Service for TEST USER only...");
    try {
        const result = await digestService.generateWeeklyDigest({
            limitToEmails: ['achuth@umd.edu']
        });
        console.log("✅ Simulation Complete:", result);
    } catch (error) {
        console.error("💥 Service execution failed:", error);
    }
    process.exit(0);
}

main();
