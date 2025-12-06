
import "dotenv/config";
import { getDb } from "../server/db";
import { threatGroups } from "../shared/schema";
import { sql } from "drizzle-orm";
import https from "https";

const MITRE_URL = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json";

interface StixObject {
    type: string;
    id: string;
    name: string;
    description?: string;
    aliases?: string[];
    x_mitre_aliases?: string[]; // Sometimes aliases are here
    modified: string;
    revoked?: boolean;
    x_mitre_deprecated?: boolean;
}

interface StixBundle {
    objects: StixObject[];
}

function fetchMitreData(): Promise<StixBundle> {
    return new Promise((resolve, reject) => {
        https.get(MITRE_URL, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
            res.on("error", reject);
        });
    });
}

async function main() {
    console.log("Starting Threat Actor Ingestion...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }

    const db = getDb();

    try {
        console.log("Fetching MITRE ATT&CK data...");
        const bundle = await fetchMitreData();

        const groups = bundle.objects.filter(
            (obj) =>
                obj.type === "intrusion-set" &&
                !obj.revoked &&
                !obj.x_mitre_deprecated
        );

        console.log(`Found ${groups.length} active intrusion sets.`);

        let count = 0;
        for (const group of groups) {
            const aliases = group.aliases || group.x_mitre_aliases || [];
            // Clean up aliases (remove duplicate of name if present)
            const uniqueAliases = [...new Set(aliases)].filter(a => a !== group.name);

            await db
                .insert(threatGroups)
                .values({
                    stixId: group.id,
                    name: group.name,
                    description: group.description || "",
                    aliases: uniqueAliases, // JSONB handles array natively
                    lastUpdated: new Date(group.modified),
                })
                .onConflictDoUpdate({
                    target: threatGroups.stixId,
                    set: {
                        name: group.name,
                        description: group.description || "",
                        aliases: uniqueAliases,
                        lastUpdated: new Date(group.modified),
                    },
                });

            count++;
            if (count % 10 === 0) process.stdout.write(".");
        }

        console.log(`\nSuccessfully processed ${count} threat groups.`);
    } catch (error) {
        console.error("Error ingestion failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
