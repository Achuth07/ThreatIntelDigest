
import { sql } from 'drizzle-orm';
import { getDb } from '../db.js';

export async function fetchAndStoreNvdCves(startDate: Date, endDate: Date, startIndex = 0, resultsPerPage = 1000) {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
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

        const url = `https://services.nvd.nist.gov/rest/json/cves/2.0/?pubStartDate=${startDateStr}T00:00:00.000&pubEndDate=${endDateStr}T23:59:59.999&resultsPerPage=${resultsPerPage}&startIndex=${currentStartIndex}`;

        const response = await fetch(url, {
            headers: {
                'apiKey': process.env.NVD_API_KEY || '',
                'User-Agent': 'ThreatIntelDigest/1.0',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 503) {
                console.warn('[NVD Service] Service Unavailable (503). Retrying in 5s...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
            throw new Error(`NVD API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const vulnerabilities = data.vulnerabilities || [];
        totalResults = data.totalResults || 0;

        console.log(`[NVD Service] Found ${vulnerabilities.length} CVEs (Total available: ${totalResults})`);

        if (vulnerabilities.length > 0) {
            const valuesChunks: any[] = [];
            const errors: string[] = [];

            for (const vuln of vulnerabilities) {
                try {
                    const cve = vuln.cve;
                    const cveId = cve.id;
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

                    valuesChunks.push(sql`(${cveId}, ${description}, ${cve.published}, ${cve.lastModified}, ${cve.vulnStatus}, ${cvssV3Score !== null ? String(cvssV3Score) : null}, ${cvssV3Severity}, ${cvssV2Score !== null ? String(cvssV2Score) : null}, ${cvssV2Severity}, ${weaknessesLiteral}::text[], ${JSON.stringify(references)}::jsonb, ${JSON.stringify(vendorsArray)}::jsonb, ${cvssVector}, ${exploitabilityScore !== null ? String(exploitabilityScore) : null}, ${impactScore !== null ? String(impactScore) : null}, ${JSON.stringify(affectedProducts)}::jsonb)`);
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
                    id, description, published_date, last_modified_date, vuln_status,
                    cvss_v3_score, cvss_v3_severity, cvss_v2_score, cvss_v2_severity,
                    weaknesses, reference_urls, vendors,
                    cvss_vector, exploitability_score, impact_score, affected_products
                  )
                  VALUES ${finalValues}
                  ON CONFLICT (id) DO UPDATE SET
                    description = EXCLUDED.description,
                    published_date = EXCLUDED.published_date,
                    last_modified_date = EXCLUDED.last_modified_date,
                    vuln_status = EXCLUDED.vuln_status,
                    cvss_v3_score = EXCLUDED.cvss_v3_score,
                    cvss_v3_severity = EXCLUDED.cvss_v3_severity,
                    cvss_v2_score = EXCLUDED.cvss_v2_score,
                    cvss_v2_severity = EXCLUDED.cvss_v2_severity,
                    weaknesses = EXCLUDED.weaknesses,
                    reference_urls = EXCLUDED.reference_urls,
                    vendors = EXCLUDED.vendors,
                    cvss_vector = EXCLUDED.cvss_vector,
                    exploitability_score = EXCLUDED.exploitability_score,
                    impact_score = EXCLUDED.impact_score,
                    affected_products = EXCLUDED.affected_products
                `);
            }
        }

        if (totalResults > 0 && (currentStartIndex + resultsPerPage < totalResults)) {
            currentStartIndex += resultsPerPage;
        } else {
            hasMore = false;
        }
    }
}
