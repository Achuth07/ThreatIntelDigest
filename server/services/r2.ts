
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { CveChangeEvent } from '../../shared/cve-history.js';

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

    const endpoint = process.env.R2_ENDPOINT_URL || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

    r2Client = new S3Client({
        region: 'auto',
        endpoint,
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

// Unlike fetchCveFromR2, a failed read throws: callers merge into what they read,
// so treating an outage as "no file" would overwrite stored data.
async function readR2Json<T>(key: string): Promise<T | null> {
    try {
        const response = await getR2().send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        if (!response.Body) return null;
        return JSON.parse(await response.Body.transformToString()) as T;
    } catch (error: any) {
        if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
}

async function writeR2Json(key: string, data: unknown): Promise<void> {
    await getR2().send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: 'application/json',
    }));
}

export async function getCveHistory(cveId: string): Promise<CveChangeEvent[]> {
    return (await readR2Json<CveChangeEvent[]>(`cve-history/${cveId}.json`)) ?? [];
}

export async function saveCveHistory(cveId: string, changes: CveChangeEvent[]): Promise<void> {
    await writeR2Json(`cve-history/${cveId}.json`, changes);
}

export interface NvdSyncState {
    lastSyncedAt: string;
}

export async function getNvdSyncState(): Promise<NvdSyncState | null> {
    return readR2Json<NvdSyncState>('sync/nvd-state.json');
}

export async function saveNvdSyncState(state: NvdSyncState): Promise<void> {
    await writeR2Json('sync/nvd-state.json', state);
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
