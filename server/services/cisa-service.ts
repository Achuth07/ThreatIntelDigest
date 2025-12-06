
import { storage } from "../storage";
import { InsertKnownExploitedVulnerability } from "@shared/schema";
import axios from "axios";

const CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

interface CisaKevItem {
    cveID: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: string;
    shortDescription: string;
    requiredAction: string;
    dueDate: string;
    knownRansomwareCampaignUse: string;
    notes: string;
}

interface CisaKevResponse {
    title: string;
    catalogVersion: string;
    dateReleased: string;
    count: number;
    vulnerabilities: CisaKevItem[];
}

export async function fetchCisaKevData() {
    console.log("Fetching CISA KEV data...");
    try {
        const response = await axios.get<CisaKevResponse>(CISA_KEV_URL);
        const data = response.data;

        console.log(`Fetched ${data.count} vulnerabilities from CISA KEV.`);

        let processedCount = 0;
        let errorCount = 0;

        for (const item of data.vulnerabilities) {
            try {
                const kev: InsertKnownExploitedVulnerability = {
                    cveID: item.cveID,
                    vendorProject: item.vendorProject,
                    product: item.product,
                    vulnerabilityName: item.vulnerabilityName,
                    dateAdded: new Date(item.dateAdded),
                    shortDescription: item.shortDescription,
                    requiredAction: item.requiredAction,
                    dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
                    knownRansomwareCampaignUse: item.knownRansomwareCampaignUse,
                    notes: item.notes,
                };

                // This method handles upsert
                await storage.createKnownExploitedVulnerability(kev);
                processedCount++;
            } catch (err) {
                console.error(`Error processing KEV item ${item.cveID}:`, err);
                errorCount++;
            }
        }

        console.log(`CISA KEV fetch fetch complete. Processed: ${processedCount}, Errors: ${errorCount}`);
        return {
            success: true,
            processed: processedCount,
            errors: errorCount,
            total: data.count
        };

    } catch (error) {
        console.error("Failed to fetch CISA KEV data:", error);
        throw error;
    }
}
