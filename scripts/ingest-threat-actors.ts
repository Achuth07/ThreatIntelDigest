// Imports MITRE ATT&CK Enterprise: groups with their ATT&CK IDs, techniques, software, and the
// CVEs MITRE says each group used (WHA-55). Runs weekly from weekly_threat_actor_update.yml.
// Usage: npx tsx scripts/ingest-threat-actors.ts [--file path/to/enterprise-attack.json]
import "dotenv/config";
import { readFileSync } from "fs";
import { getDb } from "../server/db";
import { assignMissingSlugs } from "../server/services/threat-group-slugs";
import { ATTACK_BUNDLE_URL, importAttack, parseAttackBundle } from "../server/services/attack-import";

// A valid bundle has well over this many groups; fewer means a truncated or wrong download.
const MIN_GROUPS = 100;

async function loadBundle(): Promise<{ objects: any[] }> {
    const fileFlag = process.argv.indexOf("--file");
    if (fileFlag !== -1) return JSON.parse(readFileSync(process.argv[fileFlag + 1], "utf8"));
    const response = await fetch(ATTACK_BUNDLE_URL, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`ATT&CK download failed: HTTP ${response.status}`);
    return response.json();
}

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }
    const db = getDb();

    console.log("Fetching MITRE ATT&CK data...");
    const parsed = parseAttackBundle(await loadBundle());
    const activeGroups = parsed.groups.filter(group => group.status === "active").length;
    console.log(`ATT&CK ${parsed.version ?? "unknown version"}: ${activeGroups} active groups, ${parsed.techniques.length} techniques, ${parsed.software.length} software, ${parsed.groupCves.length} group-CVE mentions`);
    if (activeGroups < MIN_GROUPS) throw new Error(`Only ${activeGroups} active groups in the bundle; refusing to import`);

    const summary = await importAttack(db as any, parsed);
    console.log("Import complete:", summary);

    // New groups get their public address; existing ones keep theirs.
    const assigned = await assignMissingSlugs(db);
    console.log(`Assigned ${assigned} new slugs.`);
    process.exit(0);
}

main().catch(error => {
    console.error("Threat actor import failed:", error);
    process.exit(1);
});
