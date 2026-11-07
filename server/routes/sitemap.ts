import { Router } from "express";
import { getDb } from "../db";
import { renderSitemap } from "../services/sitemap";

// Dev / non-Vercel server. Production serves the same XML from api/index.ts.
const router = Router();

router.get(/^\/sitemap(?:-([a-z]+))?\.xml$/, async (req, res) => {
    try {
        const xml = await renderSitemap(req.params[0], getDb);
        if (xml === null) {
            return res.status(404).send("Not found");
        }
        res.header("Content-Type", "application/xml; charset=utf-8");
        res.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
        res.send(xml);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        res.status(500).send("Error generating sitemap");
    }
});

export default router;
