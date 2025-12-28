
import requests
import csv
import io
import json
import os
import time
import boto3
from dotenv import load_dotenv

load_dotenv()

# Configuration
THREATFOX_CSV_URL = "https://threatfox.abuse.ch/export/csv/ip-port/recent/"
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")

def get_r2_client():
    endpoint = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    return boto3.client(
        service_name='s3',
        endpoint_url=endpoint,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto'
    )

def fetch_threatfox_data():
    print("Fetching ThreatFox data...")
    response = requests.get(THREATFOX_CSV_URL)
    response.raise_for_status()
    # Skip comments
    content = response.content.decode('utf-8', errors='replace')
    lines = [line for line in content.splitlines() if not line.startswith('#')]
    return lines

def geolocate_ips(ips):
    print(f"Geolocating {len(ips)} IPs...")
    # ip-api.com batch limit is 100 per request
    active_ips = list(ips)
    results = {}
    
    for i in range(0, len(active_ips), 100):
        batch = active_ips[i:i+100]
        try:
            resp = requests.post("http://ip-api.com/batch", json=batch, timeout=10)
            data = resp.json()
            for item in data:
                if item.get('status') == 'success':
                    results[item['query']] = {
                        'lat': item['lat'],
                        'lon': item['lon'],
                        'country': item['countryCode']
                    }
            time.sleep(1) # Rate limiting
        except Exception as e:
            print(f"Batch failed: {e}")
            
    return results

def generate_map_data():
    csv_lines = fetch_threatfox_data()
    reader = csv.reader(csv_lines)
    
    # Extract Botnet C2s (Type: botnet_cc)
    c2_candidates = []
    unique_ips = set()
    
    # Heuristic: Extract IPs from ioc_value if possible
    # ThreatFox IOC types: ip:port, domain, url
    
    for row in reader:
        if len(row) < 5: continue
        
        # Debug first row
        if len(c2_candidates) == 0 and len(unique_ips) == 0:
            print(f"Sample Row: {row}")

        ioc_value = row[2].strip().strip('"')
        ioc_type = row[3].strip().strip('"')
        threat_type = row[4].strip().strip('"')
        malware = row[5].strip().strip('"')
        
        if threat_type not in ['botnet_cc', 'payload_delivery']:
            continue

        # Extract IP/Host
        target = None
        if ioc_type == 'ip:port':
            target = ioc_value.split(':')[0]
        elif ioc_type == 'domain':
            try:
                # Resolve domain to IP (Limit checks to avoid spam? We rely on unique set later)
                # Only resolve if we don't have enough IPs yet?
                if len(unique_ips) < 50: 
                    import socket
                    target = socket.gethostbyname(ioc_value)
            except:
                continue
        
        if target and target.replace('.','').isdigit(): # Simple IP check
             c2_candidates.append({
                 'ip': target,
                 'malware': malware,
                 'type': 'botnet_cc'
             })
             unique_ips.add(target)

    # Limit to latest 500 unique IPs to map to avoid clutter/rate-limits
    limited_ips = list(unique_ips)[:500] 
    
    geo_data = geolocate_ips(limited_ips)
    
    map_points = []
    for c2 in c2_candidates:
        if c2['ip'] in geo_data:
            loc = geo_data[c2['ip']]
            map_points.append({
                'name': c2['malware'],
                'coordinates': [loc['lon'], loc['lat']], # D3 uses [lon, lat]
                'type': 'C2',
                'country': loc['country']
            })
            
    return map_points

def upload_to_r2(data):
    print("Uploading to R2...")
    client = get_r2_client()
    json_data = json.dumps(data)
    
    client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key='threat-map/data.json',
        Body=json_data,
        ContentType='application/json',
        ACL='public-read' # Ensure public reading is allowed or handle via signed/worker
    )
    print("Upload complete!")

if __name__ == "__main__":
    data = generate_map_data()
    print(f"Generated {len(data)} map points.")
    upload_to_r2(data)
