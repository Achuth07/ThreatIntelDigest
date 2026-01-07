
import { Router } from "express";
import { createClient } from "@sanity/client";

const router = Router();

const client = createClient({
    projectId: "0odjb7zx",
    dataset: "production",
    useCdn: true, // Use CDN for sitemap as it doesn't need to be instant
    apiVersion: "2024-01-01",
});

router.get("/sitemap.xml", async (_req, res) => {
    try {
        const query = `*[_type == "post"] { "slug": slug.current, publishedAt, _updatedAt }`;
        const posts = await client.fetch(query);

        const baseUrl = "https://www.whatcyber.com";

        // Static pages
        const staticPages = [
            "",
            "/threatfeed",
            "/about",
            "/contact",
            "/privacy",
            "/terms",
            "/blog"
        ];

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Add static pages
        staticPages.forEach((page) => {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}${page}</loc>\n`;
            sitemap += `    <changefreq>daily</changefreq>\n`;
            sitemap += `    <priority>0.8</priority>\n`;
            sitemap += `  </url>\n`;
        });

        // Add blog posts
        posts.forEach((post: any) => {
            if (post.slug) {
                const lastMod = post._updatedAt || post.publishedAt || new Date().toISOString();
                sitemap += `  <url>\n`;
                sitemap += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
                sitemap += `    <lastmod>${lastMod}</lastmod>\n`;
                sitemap += `    <changefreq>weekly</changefreq>\n`;
                sitemap += `    <priority>0.9</priority>\n`;
                sitemap += `  </url>\n`;
            }
        });

        sitemap += `</urlset>`;

        res.header("Content-Type", "application/xml");
        res.send(sitemap);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        res.status(500).send("Error generating sitemap");
    }
});

export default router;
