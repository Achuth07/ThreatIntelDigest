
import { sql } from 'drizzle-orm';
import { getDb } from '../db.js';
import { uploadCveToR2 } from './r2.js';

// NVD allows at most 120 days per request; smaller windows also keep each run's memory use low.
const NVD_WINDOW_DAYS = 30;
const NVD_MAX_ATTEMPTS = 5;
const NVD_RETRYABLE_STATUSES = new Set([403, 429, 500, 502, 503, 504]);
// Older CVEs were pruned to save storage. Updates must not bring them back one by one.
const COVERAGE_START = '2021-01-01';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function splitNvdWindows(start: Date, end: Date): { start: Date; end: Date }[] {
    const windows: { start: Date; end: Date }[] = [];
    let current = start;
    while (current < end) {
        const next = new Date(Math.min(current.getTime() + NVD_WINDOW_DAYS * 86_400_000, end.getTime()));
        windows.push({ start: current, end: next });
        current = next;
    }
    return windows;
}

export async function fetchNvdJson(url: string): Promise<any> {
    for (let attempt = 1; ; attempt++) {
        const response = await fetch(url, {
            headers: {
                'apiKey': process.env.NVD_API_KEY || '',
                'User-Agent': 'ThreatIntelDigest/1.0',
                'Accept': 'application/json'
            }
        });
        if (response.ok) {
            return response.json();
        }
        if (attempt >= NVD_MAX_ATTEMPTS || !NVD_RETRYABLE_STATUSES.has(response.status)) {
            throw new Error(`NVD API error: ${response.status} ${response.statusText}`);
        }
        // NVD signals rate limiting with 403 over a rolling 30-second window.
        const delay = response.status === 403 || response.status === 429 ? 35_000 : 5_000 * attempt;
        console.warn(`[NVD Service] ${response.status} from NVD. Retrying in ${delay / 1000}s...`);
        await wait(delay);
    }
}

// Maps each stored CVE ID to its last-modified time, in NVD's timestamp format.
export async function getStoredLastModified(cveIds: string[]): Promise<Map<string, string>> {
    const db = getDb();
    const stored = new Map<string, string>();
    for (let i = 0; i < cveIds.length; i += 1000) {
        const result = await db.execute(sql`
          SELECT id, to_char(last_modified_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS last_modified
          FROM vulnerabilities
          WHERE id IN ${cveIds.slice(i, i + 1000)}
        `);
        for (const row of result.rows as { id: string; last_modified: string }[]) {
            stored.set(row.id, row.last_modified);
        }
    }
    return stored;
}

export async function fetchAndStoreNvdCves(
    startDate: Date,
    endDate: Date,
    startIndex = 0,
    resultsPerPage = 1000,
    dateField: 'published' | 'modified' = 'published'
) {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const dateRange = dateField === 'modified'
        ? `lastModStartDate=${startDate.toISOString()}&lastModEndDate=${endDate.toISOString()}`
        : `pubStartDate=${startDateStr}T00:00:00.000&pubEndDate=${endDateStr}T23:59:59.999`;
    let uploadFailures = 0;
    let totalResults = 0;
    let processedCount = 0;
    let pageCount = 0;
    let hasMore = true;
    let currentStartIndex = startIndex;

    while (hasMore) {
        pageCount++;
        console.log(`[NVD Service] Fetching page ${pageCount} (startIndex: ${currentStartIndex}, dateRange: ${startDateStr} to ${endDateStr})...`);

        if (currentStartIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const data = await fetchNvdJson(
            `https://services.nvd.nist.gov/rest/json/cves/2.0/?${dateRange}&resultsPerPage=${resultsPerPage}&startIndex=${currentStartIndex}`
        );
        const vulnerabilities = data.vulnerabilities || [];
        totalResults = data.totalResults || 0;

        console.log(`[NVD Service] Found ${vulnerabilities.length} CVEs (Total available: ${totalResults})`);

        if (vulnerabilities.length > 0) {
            const valuesChunks: any[] = [];
            const errors: string[] = [];
            const stored = dateField === 'modified'
                ? await getStoredLastModified(vulnerabilities.map((vuln: any) => vuln.cve.id))
                : null;

            for (const vuln of vulnerabilities) {
                try {
                    const cve = vuln.cve;
                    const cveId = cve.id;
                    if (stored) {
                        const storedLastModified = stored.get(cveId);
                        const isUnchanged = storedLastModified === cve.lastModified.slice(0, 23);
                        const isOutOfCoverage = storedLastModified === undefined && cve.published < COVERAGE_START;
                        if (isUnchanged || isOutOfCoverage) continue;
                    }

                    const description = cve.descriptions?.find((desc: any) => desc.lang === 'en')?.value || 'No description available';
                    const metrics = cve.metrics;

                    // Extract Scores
                    let cvssV3Score = null;
                    let cvssV3Severity = null;
                    let cvssVector = null;
                    let exploitabilityScore = null;
                    let impactScore = null;

                    if (metrics?.cvssMetricV31?.[0]) {
                        const m = metrics.cvssMetricV31[0];
                        cvssV3Score = m.cvssData.baseScore;
                        cvssV3Severity = m.cvssData.baseSeverity;
                        cvssVector = m.cvssData.vectorString;
                        exploitabilityScore = m.exploitabilityScore;
                        impactScore = m.impactScore;
                    } else if (metrics?.cvssMetricV30?.[0]) {
                        const m = metrics.cvssMetricV30[0];
                        cvssV3Score = m.cvssData.baseScore;
                        cvssV3Severity = m.cvssData.baseSeverity;
                        cvssVector = m.cvssData.vectorString;
                        exploitabilityScore = m.exploitabilityScore;
                        impactScore = m.impactScore;
                    }

                    let cvssV2Score = null;
                    let cvssV2Severity = null;
                    if (metrics?.cvssMetricV2?.[0]) {
                        cvssV2Score = metrics.cvssMetricV2[0].cvssData.baseScore;
                        cvssV2Severity = metrics.cvssMetricV2[0].baseSeverity;
                    }

                    const weaknesses = cve.weaknesses?.map((w: any) =>
                        w.description?.find((d: any) => d.lang === 'en')?.value
                    ).filter(Boolean) || [];

                    const references = cve.references?.map((ref: any) => ({
                        url: ref.url,
                        source: ref.source || 'Unknown',
                        tags: ref.tags || []
                    })) || [];

                    // Extract Vendors and Products
                    const vendors = new Set<string>();
                    const affectedProducts: { vendor: string, product: string, versions?: string[] }[] = [];
                    const processedProducts = new Set<string>();

                    if (cve.configurations) {
                        for (const config of cve.configurations) {
                            if (config.nodes) {
                                for (const node of config.nodes) {
                                    if (node.cpeMatch) {
                                        for (const match of node.cpeMatch) {
                                            if (match.criteria) {
                                                const parts = match.criteria.split(':');
                                                if (parts.length >= 5) {
                                                    const vendor = parts[3];
                                                    const product = parts[4];
                                                    const version = parts[5];
                                                    if (vendor && vendor !== '*') {
                                                        vendors.add(vendor);
                                                        if (product && product !== '*') {
                                                            const key = `${vendor}:${product}`;
                                                            if (!processedProducts.has(key)) {
                                                                affectedProducts.push({
                                                                    vendor, product,
                                                                    versions: version && version !== '*' ? [version] : []
                                                                });
                                                                processedProducts.add(key);
                                                            } else {
                                                                const existing = affectedProducts.find(p => p.vendor === vendor && p.product === product);
                                                                if (existing && version && version !== '*' && existing.versions && !existing.versions.includes(version)) {
                                                                    if (existing.versions.length < 10) existing.versions.push(version);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    const vendorsArray = Array.from(vendors);
                    const weaknessesLiteral = '{' + weaknesses.map((w: string) => `"${w?.replace(/"/g, '\\"') || ''}"`).join(',') + '}';

                    // R2 Upload Construction
                    const fullData = {
                        id: cveId,
                        description,
                        publishedDate: cve.published,
                        lastModifiedDate: cve.lastModified,
                        vulnStatus: cve.vulnStatus,
                        cvssV3Score, cvssV3Severity, cvssV2Score, cvssV2Severity, cvssVector,
                        exploitabilityScore, impactScore,
                        weaknesses, vendors: vendorsArray, affectedProducts, references
                    };

                    // Search Vector Construction
                    const searchRef = references.map((r: any) => r.url).join(' ') || '';
                    const searchProd = affectedProducts.map(p => `${p.vendor} ${p.product}`).join(' ') || '';
                    const searchVector = `${cveId} ${description} ${searchProd}`.substring(0, 10000);

                    // Perform R2 Upload
                    if (!(await uploadCveToR2(cveId, fullData))) {
                        uploadFailures++;
                        continue;
                    }

                    valuesChunks.push(sql`(${cveId}, ${cve.published}, ${cve.lastModified}, ${cve.vulnStatus}, ${cvssV3Score !== null ? String(cvssV3Score) : null}, ${cvssV3Severity}, ${cvssV2Score !== null ? String(cvssV2Score) : null}, ${cvssV2Severity}, ${weaknessesLiteral}::text[], ${JSON.stringify(vendorsArray)}::jsonb, ${cvssVector}, ${exploitabilityScore !== null ? String(exploitabilityScore) : null}, ${impactScore !== null ? String(impactScore) : null}, ${true}, ${searchVector})`);
                    processedCount++;

                } catch (err) {
                    errors.push(`Failed to parse ${vuln.cve?.id}: ${err}`);
                }
            }

            if (valuesChunks.length > 0) {
                const finalValues = valuesChunks.reduce((acc, chunk, i) => {
                    return i === 0 ? chunk : sql`${acc}, ${chunk}`;
                }, sql``);

                await db.execute(sql`
                  INSERT INTO vulnerabilities (
                    id, published_date, last_modified_date, vuln_status,
                    cvss_v3_score, cvss_v3_severity, cvss_v2_score, cvss_v2_severity,
                    weaknesses, vendors,
                    cvss_vector, exploitability_score, impact_score,
                    has_r2_backing, search_vector
                  )
                  VALUES ${finalValues}
                  ON CONFLICT (id) DO UPDATE SET
                    published_date = EXCLUDED.published_date,
                    last_modified_date = EXCLUDED.last_modified_date,
                    vuln_status = EXCLUDED.vuln_status,
                    cvss_v3_score = EXCLUDED.cvss_v3_score,
                    cvss_v3_severity = EXCLUDED.cvss_v3_severity,
                    cvss_v2_score = EXCLUDED.cvss_v2_score,
                    cvss_v2_severity = EXCLUDED.cvss_v2_severity,
                    weaknesses = EXCLUDED.weaknesses,
                    vendors = EXCLUDED.vendors,
                    cvss_vector = EXCLUDED.cvss_vector,
                    exploitability_score = EXCLUDED.exploitability_score,
                    impact_score = EXCLUDED.impact_score,
                    has_r2_backing = EXCLUDED.has_r2_backing,
                    search_vector = EXCLUDED.search_vector
                `);
            }
        }

        if (totalResults > 0 && (currentStartIndex + resultsPerPage < totalResults)) {
            currentStartIndex += resultsPerPage;
        } else {
            hasMore = false;
        }
    }

    if (uploadFailures > 0) {
        throw new Error(`${uploadFailures} CVE record(s) failed to upload to R2`);
    }
}
