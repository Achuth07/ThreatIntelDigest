import Parser from 'rss-parser';

const url = "https://www.tripwire.com/state-of-security/feed/";

async function debugFeed() {
    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            console.error(`HTTP ${response.status} ${response.statusText}`);
            return;
        }

        const rawXml = await response.text();
        console.log('--- RAW XML (First 500 chars) ---');
        console.log(rawXml.substring(0, 500));
        console.log('---------------------------------');

        let xmlText = rawXml;

        // Apply minimal sanitization
        // 1. Unescaped ampersands
        xmlText = xmlText.replace(/&(?![a-zA-Z0-9#]{1,10};)/g, '&amp;');

        // 2. Null bytes
        xmlText = xmlText.replace(/\0/g, '');

        console.log('--- SANITIZED XML (First 500 chars) ---');
        console.log(xmlText.substring(0, 500));
        console.log('---------------------------------------');

        const parser = new Parser();
        try {
            const feed = await parser.parseString(xmlText);
            console.log(`✅ Parsed successfully. Found ${feed.items.length} items`);
        } catch (e) {
            console.error(`❌ Parse Error: ${e.message}`);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

debugFeed();
