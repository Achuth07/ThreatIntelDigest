import Parser from 'rss-parser';
import { RSS_SOURCES } from '../client/src/lib/rss-sources';

const sources = RSS_SOURCES;

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
});

async function checkFeeds() {
    console.log(`Checking ${sources.length} feeds...`);
    let successCount = 0;
    let failCount = 0;

    for (const source of sources) {
        try {
            // console.log(`Checking ${source.name}...`);

            // Add timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(source.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`❌ ${source.name}: HTTP ${response.status} ${response.statusText}`);
                failCount++;
                continue;
            }

            let xmlText = await response.text();

            // Sanitize XML (minimal)
            xmlText = xmlText.replace(/&(?![a-zA-Z0-9#]{1,10};)/g, '&amp;');
            xmlText = xmlText.replace(/\0/g, '');

            const feed = await parser.parseString(xmlText);

            if (feed.items && feed.items.length > 0) {
                console.log(`✅ ${source.name}: Found ${feed.items.length} items`);
                successCount++;
            } else {
                console.error(`⚠️ ${source.name}: Parsed successfully but found 0 items`);
                // Treat 0 items as a soft failure/warning
                successCount++;
            }

        } catch (error) {
            console.error(`❌ ${source.name}: Error - ${error.message}`);
            failCount++;
        }
    }

    console.log('-----------------------------------');
    console.log(`Summary: ${successCount} succeeded, ${failCount} failed`);
}

checkFeeds();
