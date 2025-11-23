
import { RSS_SOURCES } from '../client/src/lib/rss-sources';

function findDuplicates() {
    const urlMap = new Map<string, string[]>();
    const nameMap = new Map<string, string[]>();

    RSS_SOURCES.forEach(source => {
        // Check URLs
        const normalizedUrl = source.url.toLowerCase().trim();
        if (!urlMap.has(normalizedUrl)) {
            urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl)?.push(source.name);

        // Check Names
        const normalizedName = source.name.toLowerCase().trim();
        if (!nameMap.has(normalizedName)) {
            nameMap.set(normalizedName, []);
        }
        nameMap.get(normalizedName)?.push(source.url);
    });

    console.log('--- Duplicate URLs ---');
    urlMap.forEach((names, url) => {
        if (names.length > 1) {
            console.log(`URL: ${url}`);
            console.log(`  Names: ${names.join(', ')}`);
        }
    });

    console.log('\n--- Duplicate Names ---');
    nameMap.forEach((urls, name) => {
        if (urls.length > 1) {
            console.log(`Name: ${name}`);
            console.log(`  URLs: ${urls.join(', ')}`);
        }
    });
}

findDuplicates();
