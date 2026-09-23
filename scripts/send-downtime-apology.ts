import 'dotenv/config';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { getDb } from '../server/db.js';
import { users } from '../shared/schema.js';

const SENDER_EMAIL = 'contact@whatcyber.com';
const SENDER_NAME = 'WhatCyber';
const BASE_URL = 'https://www.whatcyber.com';

function createTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.mailersend.net';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });
}

export function generateServiceRestoredHtml(recipientName?: string): string {
    const name = recipientName && recipientName.trim() ? recipientName.trim() : 'Cybersecurity Professional';

    return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> 
    <meta name="x-apple-disable-message-reformatting"> 
    <title>WhatCyber ThreatFeed is Back Online</title> 

    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->

    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #ffffff; color: #000000; }

        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: auto !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .hero-text { font-size: 26px !important; line-height: 32px !important; }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">

    <!-- Outer Wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 20px;">
                
                <!-- Green Frame Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #10b981; border-radius: 16px; overflow: hidden;">
                    <tr>
                        <td align="center" style="padding: 16px;">
                            
                            <!-- Inner Content Container -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                                
                                <!-- TOP HEADER -->
                                <tr>
                                    <td bgcolor="#ffffff" style="padding: 20px 30px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td valign="middle">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td valign="middle" style="padding-right: 12px;">
                                                                <a href="${BASE_URL}" style="text-decoration: none; border: 0;">
                                                                    <img src="https://i.ibb.co/bMR9GwhF/android-chrome-192x192.png" width="40" height="40" alt="WhatCyber Logo" style="display: block; border: 0; border-radius: 8px;">
                                                                </a>
                                                            </td>
                                                            <td valign="middle">
                                                                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #000000; line-height: 1; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">WhatCyber</h1>
                                                                <p style="margin: 0; font-size: 11px; font-weight: 600; color: #10b981; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Threatfeed</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td align="right" valign="middle">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="background-color: #10b981; border-radius: 50px; padding: 8px 20px;">
                                                                <a href="${BASE_URL}/login/" style="color: #000000; font-size: 13px; font-weight: 700; text-decoration: none; display: block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Log in</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- HERO SECTION -->
                                <tr>
                                    <td bgcolor="#f3f4f6" style="padding: 45px 30px; border-bottom: 1px solid #e5e7eb;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td align="left">
                                                    <span style="background-color: #10b981; color: #000000; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">Service Update</span>
                                                    <h2 class="hero-text" style="color: #111827; font-size: 30px; line-height: 38px; font-weight: 900; margin: 12px 0 10px 0; letter-spacing: -0.5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        WE'RE BACK ONLINE!
                                                    </h2>
                                                    <p style="color: #4b5563; font-size: 16px; margin: 0; font-weight: 400; line-height: 1.5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        Our threat intelligence platform and feeds are fully restored.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- MAIN BODY SECTION (DARK CARDS) -->
                                <tr>
                                    <td bgcolor="#000000" style="padding: 40px 25px;">
                                        
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border: 1px solid #333333; border-radius: 12px; margin-bottom: 25px;">
                                            <tr>
                                                <td style="padding: 30px;">
                                                    <h3 style="margin: 0 0 16px 0; font-size: 18px; line-height: 24px; font-weight: 700; color: #ffffff;">
                                                        Hi ${name},
                                                    </h3>
                                                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 24px; color: #d1d5db;">
                                                        We are writing to let you know that <strong style="color: #10b981;">WhatCyber ThreatFeed is back online</strong> and operating normally.
                                                    </p>
                                                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 24px; color: #d1d5db;">
                                                        Over the past few weeks, our platform experienced an unexpected service interruption due to a domain DNS delegation configuration issue. We sincerely apologize for any disruption or inconvenience this caused while accessing real-time threat intelligence and vulnerability updates.
                                                    </p>
                                                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 24px; color: #d1d5db;">
                                                        All domain routing, SSL security certificates, and automated RSS intelligence ingestion are now fully verified and functioning seamlessly.
                                                    </p>
                                                    
                                                    <!-- CTA BUTTON -->
                                                    <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 10px;">
                                                        <tr>
                                                            <td style="background-color: #10b981; border-radius: 8px; padding: 12px 28px;">
                                                                <a href="${BASE_URL}/threatfeed" style="color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; display: inline-block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                                    Explore ThreatFeed &rarr;
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- FOOTER SECTION INSIDE DARK AREA -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; border-top: 1px solid #333333;">
                                            <tr>
                                                <td align="center" style="padding-top: 30px;">
                                                    <a href="${BASE_URL}/" style="text-decoration: none; border: 0;">
                                                        <img src="https://i.ibb.co/bMR9GwhF/android-chrome-192x192.png" width="32" height="32" alt="WhatCyber Logo" style="display: block; border: 0; border-radius: 6px; margin-bottom: 10px;">
                                                    </a>
                                                    <p style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 2px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">WhatCyber</p>
                                                    <p style="color: #666666; font-size: 12px; margin: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Cybersecurity Threat Intelligence</p>
                                                    
                                                    <!-- Socials -->
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="padding: 0 10px;">
                                                                <a href="mailto:contact@whatcyber.com" style="text-decoration: none;">
                                                                    <img src="https://img.icons8.com/ios-filled/50/ffffff/mail.png" width="24" height="24" alt="Email" style="display: block; border: 0;">
                                                                </a>
                                                            </td>
                                                            <td style="padding: 0 10px;">
                                                                <a href="https://x.com/WhatCyber_" style="text-decoration: none;">
                                                                    <img src="https://img.icons8.com/ios-filled/50/ffffff/twitterx.png" width="24" height="24" alt="X" style="display: block; border: 0;">
                                                                </a>
                                                            </td>
                                                            <td style="padding: 0 10px;">
                                                                <a href="https://www.linkedin.com/company/whatcyber/" style="text-decoration: none;">
                                                                    <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png" width="24" height="24" alt="LinkedIn" style="display: block; border: 0;">
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <p style="color: #666666; font-size: 11px; margin-top: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        &copy; ${new Date().getFullYear()} WhatCyber. All rights reserved.<br>
                                                        You are receiving this operational service update as a registered user of WhatCyber.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>
                            <!-- End Inner Content Container -->

                        </td>
                    </tr>
                </table>
                <!-- End Green Frame Container -->
                
            </td>
        </tr>
    </table>

</body>
</html>
  `;
}

async function sendEmail(to: string, name: string, html: string): Promise<boolean> {
    const subject = `We're Back Online: WhatCyber ThreatFeed Service Restored`;

    // Try Resend API first if configured
    if (process.env.RESEND_API_KEY) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const res = await resend.emails.send({
                from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                to: [to],
                subject,
                html,
            });

            if (!res.error) {
                console.log(`✅ Sent email via Resend to ${to} (ID: ${res.data?.id})`);
                return true;
            }
            console.warn(`⚠️ Resend API returned error for ${to}:`, res.error.message);
        } catch (err: any) {
            console.warn(`⚠️ Resend attempt failed: ${err.message}`);
        }
    }

    // Fallback to SMTP Transporter
    const transporter = createTransporter();
    if (!transporter) {
        console.error(`❌ Neither Resend API key nor SMTP credentials are available.`);
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to,
            subject,
            html,
        });
        console.log(`✅ Sent email via SMTP to ${to} (MessageId: ${info.messageId})`);
        return true;
    } catch (err: any) {
        console.error(`❌ Failed to send email via SMTP to ${to}:`, err.message);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isTest = args.includes('--test');
    const isSendAll = args.includes('--send-all');

    const testEmailIndex = args.indexOf('--test');
    const testEmailArg = testEmailIndex !== -1 && args[testEmailIndex + 1] ? args[testEmailIndex + 1] : 'achuthumd@gmail.com';

    console.log(`🚀 Starting Downtime Apology / Service Restored Email Tool`);
    console.log(`Modes: dry-run=${isDryRun}, test=${isTest} (${testEmailArg}), send-all=${isSendAll}\n`);

    if (isTest) {
        console.log(`📧 Sending TEST email to: ${testEmailArg}...`);
        const html = generateServiceRestoredHtml('Achuth');
        const success = await sendEmail(testEmailArg, 'Achuth', html);
        if (success) {
            console.log(`🎉 Test email sent successfully to ${testEmailArg}! Check your inbox.`);
        } else {
            console.error(`❌ Failed to send test email to ${testEmailArg}. Check API/SMTP keys.`);
        }
        return;
    }

    const db = getDb();
    if (!db) {
        throw new Error('Database connection failed');
    }

    // Query all registered users
    console.log(`🔍 Fetching registered users from database...`);
    const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
    }).from(users);

    console.log(`📋 Total users found in database: ${allUsers.length}`);

    if (isDryRun || (!isSendAll && !isTest)) {
        console.log(`\n🔍 DRY RUN SUMMARY (No emails were actually sent):`);
        console.log(`──────────────────────────────────────────────────`);
        allUsers.forEach((u, i) => {
            console.log(` [${i + 1}] ID: ${u.id} | Name: ${u.name} | Email: ${u.email}`);
        });
        console.log(`──────────────────────────────────────────────────`);
        console.log(`To send a test email to ${testEmailArg}:`);
        console.log(`  npx tsx scripts/send-downtime-apology.ts --test ${testEmailArg}`);
        console.log(`To send to ALL ${allUsers.length} users:`);
        console.log(`  npx tsx scripts/send-downtime-apology.ts --send-all\n`);
        return;
    }

    if (isSendAll) {
        console.log(`\n⚠️ PREPARING TO BROADCAST TO ALL ${allUsers.length} USERS...`);
        let successCount = 0;
        let failCount = 0;

        for (const u of allUsers) {
            console.log(`Sending to ${u.email} (${u.name})...`);
            const html = generateServiceRestoredHtml(u.name);
            const sent = await sendEmail(u.email, u.name, html);
            if (sent) {
                successCount++;
            } else {
                failCount++;
            }
            // Small delay between sends to respect rate limits
            await new Promise((r) => setTimeout(r, 300));
        }

        console.log(`\n🎉 BROADCAST COMPLETE: ${successCount} sent, ${failCount} failed out of ${allUsers.length} total users.`);
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
