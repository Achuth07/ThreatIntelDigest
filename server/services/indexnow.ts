import https from 'https';

const HOST = 'whatcyber.com';
const KEY = '9ab9a8c4087e4e4f860f308d4d0daee4';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

export async function submitUrl(urls: string | string[]): Promise<void> {
    const urlList = Array.isArray(urls) ? urls : [urls];

    const data = JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: urlList
    });

    const options = {
        hostname: 'api.indexnow.org',
        port: 443,
        path: '/indexnow',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 202) {
                console.log(`IndexNow submission successful for ${urlList.length} URLs.`);
                resolve();
            } else {
                console.error(`IndexNow submission failed with status code: ${res.statusCode}`);
                // Consume response data to free up memory
                res.resume();
                reject(new Error(`IndexNow submission failed: ${res.statusCode}`));
            }
        });

        req.on('error', (error) => {
            console.error('IndexNow submission error:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}
