
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    console.error("Missing R2 environment variables");
}


let r2Client: S3Client | null = null;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'whatcyber-datalake';

function getR2() {
    if (r2Client) return r2Client;

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        console.error("Missing R2 environment variables during initialization");
        // We might still return a client to avoid crashing, but it won't work
    }

    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
    });
    return r2Client;
}

export async function uploadCveToR2(cveId: string, data: any) {
    try {
        const r2 = getR2();
        const key = `cves/${cveId}.json`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data),
            ContentType: 'application/json',
        });
        await r2.send(command);
        return true;
    } catch (error) {
        console.error(`Failed to upload ${cveId} to R2:`, error);
        return false;
    }
}

export async function fetchCveFromR2(cveId: string) {
    try {
        const r2 = getR2();
        const key = `cves/${cveId}.json`;
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        const response = await r2.send(command);
        if (!response.Body) return null;
        const str = await response.Body.transformToString();
        return JSON.parse(str);
    } catch (error) {
        console.error(`Failed to fetch ${cveId} from R2:`, error);
        return null; // Return null to fallback (though fallback data is empty now)
    }
}

export async function checkCveInR2(cveId: string) {
    try {
        const r2 = getR2();
        const key = `cves/${cveId}.json`;
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await r2.send(command);
        return true;
    } catch (error) {
        return false;
    }
}
