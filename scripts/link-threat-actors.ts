// Links threat actors to recent news articles, then rebuilds the low-confidence actor-CVE links
// from articles that name both (WHA-55). Runs weekly after ingest-threat-actors.ts.
import "dotenv/config";
import { getDb } from "../server/db";
import { rebuildNewsActorCves, relinkArticleActors } from "../server/services/actor-news";

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing");
        process.exit(1);
    }
    const db = getDb() as any;

    const articles = await relinkArticleActors(db);
    console.log("Article-actor links:", articles);

    const cves = await rebuildNewsActorCves(db);
    console.log("News actor-CVE links:", cves);
    process.exit(0);
}

main().catch(error => {
    console.error("Linking failed:", error);
    process.exit(1);
});
