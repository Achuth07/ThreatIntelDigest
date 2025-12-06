
import axios from 'axios';

async function testThreatApi() {
    const baseUrl = 'http://localhost:5002'; // Trying port 5002 as seen in terminal output
    // Or try 5001 if 5002 was just an attempt. The server log said "Server running on port 5002".

    try {
        console.log('Fetching threat groups list...');
        const listRes = await axios.get(`${baseUrl}/api/threat-groups?limit=1`);
        console.log('List status:', listRes.status);

        if (listRes.data && listRes.data.data && listRes.data.data.length > 0) {
            const group = listRes.data.data[0];
            console.log('Found group:', group.name, 'ID:', group.id);

            console.log(`Fetching details for ID: ${group.id}...`);
            const detailRes = await axios.get(`${baseUrl}/api/threat-groups/${group.id}`);
            console.log('Detail status:', detailRes.status);
            console.log('Detail data:', detailRes.data);
        } else {
            console.log('No groups found in list.');
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('API Error:', error.response?.status, error.response?.statusText);
            console.error('Response data:', error.response?.data);
        } else {
            console.error('Error:', error);
        }
    }
}

testThreatApi();
