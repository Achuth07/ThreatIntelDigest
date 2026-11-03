import requests
import csv
import io
import json
import os
import time
import socket
import zipfile
from urllib.parse import urlparse
import boto3
from dotenv import load_dotenv

load_dotenv()

# Configuration
ABUSE_AUTH_KEY = (
    os.getenv("ABUSE_AUTH_KEY")
    or os.getenv("ABUSE_CH_AUTH_KEY")
    or os.getenv("THREATFOX_AUTH_KEY")
)
THREATFOX_API_URL = "https://threatfox-api.abuse.ch/api/v1/"
THREATFOX_CSV_URL = os.getenv("THREATFOX_CSV_URL")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")

def get_r2_client():
    endpoint = R2_ENDPOINT_URL
    if not endpoint and R2_ACCOUNT_ID:
        endpoint = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    if not all([R2_BUCKET_NAME, endpoint, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]):
        return None

    return boto3.client(
        service_name='s3',
        endpoint_url=endpoint,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name='auto'
    )

def fetch_threatfox_data():
    """
    Fetches recent ThreatFox IOCs.
    First tries the official ThreatFox API (POST get_iocs).
    Falls back to CSV export URL if API fails or if custom CSV URL configured.
    """
    if not ABUSE_AUTH_KEY and not THREATFOX_CSV_URL:
        raise ValueError(
            "Missing required secret 'ABUSE_AUTH_KEY'. abuse.ch now requires an Auth-Key for ThreatFox data. "
            "Please add 'ABUSE_AUTH_KEY' to your GitHub Repository Secrets."
        )

    headers = {
        "User-Agent": "ThreatIntelDigest/1.0 (Research Project)"
    }
    if ABUSE_AUTH_KEY:
        headers["Auth-Key"] = ABUSE_AUTH_KEY

    # 1. Try official ThreatFox API
    if ABUSE_AUTH_KEY:
        try:
            print("Fetching ThreatFox data via API (POST get_iocs)...")
            api_headers = {**headers, "Content-Type": "application/json"}
            payload = {"query": "get_iocs", "days": 3}
            resp = requests.post(THREATFOX_API_URL, headers=api_headers, json=payload, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("query_status") == "ok":
                    iocs = data.get("data", [])
                    print(f"Successfully fetched {len(iocs)} IOCs from ThreatFox API.")
                    return iocs
                else:
                    print(f"ThreatFox API query_status: {data.get('query_status')}")
            else:
                print(f"ThreatFox API returned HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            print(f"ThreatFox API request failed: {e}. Falling back to CSV export...")

    # 2. Fallback to CSV export
    csv_url = THREATFOX_CSV_URL or (
        f"https://threatfox-api.abuse.ch/v2/files/exports/{ABUSE_AUTH_KEY}/recent.csv"
        if ABUSE_AUTH_KEY else "https://threatfox.abuse.ch/export/csv/ip-port/recent/"
    )
    print(f"Fetching ThreatFox data from CSV export: {csv_url.split('/')[2]}...")
    resp = requests.get(csv_url, headers=headers, timeout=60)
    resp.raise_for_status()

    raw_content = resp.content
    if raw_content.startswith(b"PK\x03\x04"):
        with zipfile.ZipFile(io.BytesIO(raw_content)) as z:
            csv_files = [n for n in z.namelist() if n.endswith('.csv')]
            csv_file = csv_files[0] if csv_files else z.namelist()[0]
            text = z.read(csv_file).decode('utf-8', errors='replace')
    else:
        text = raw_content.decode('utf-8', errors='replace')

    # Convert CSV to list of IOC dicts
    lines = [l for l in text.splitlines() if not l.startswith('#') and l.strip()]
    reader = csv.reader(lines)
    iocs = []
    for row in reader:
        if len(row) < 5:
            continue
        # ThreatFox CSV: [0] first_seen_utc, [1] ioc_id, [2] ioc_value, [3] ioc_type, [4] threat_type, [5] malware
        ioc_val = row[2].strip().strip('"')
        ioc_type = row[3].strip().strip('"')
        threat_type = row[4].strip().strip('"')
        malware = row[5].strip().strip('"') if len(row) > 5 else "Unknown"
        iocs.append({
            "ioc": ioc_val,
            "ioc_type": ioc_type,
            "threat_type": threat_type,
            "malware": malware,
            "malware_printable": malware
        })
    print(f"Parsed {len(iocs)} IOCs from CSV export.")
    return iocs

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
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get('status') == 'success':
                        results[item['query']] = {
                            'lat': item['lat'],
                            'lon': item['lon'],
                            'country': item['countryCode']
                        }
            else:
                print(f"Unexpected response from ip-api: {data}")
            time.sleep(1) # Rate limiting
        except Exception as e:
            print(f"Batch failed: {e}")
            
    return results

def generate_map_data():
    iocs = fetch_threatfox_data()
    
    # Extract Botnet C2s (Type: botnet_cc or payload_delivery)
    c2_candidates = []
    unique_ips = set()
    
    for item in iocs:
        threat_type = item.get("threat_type", "")
        if threat_type not in ['botnet_cc', 'payload_delivery']:
            continue

        ioc_val = (item.get("ioc") or "").strip().strip('"')
        ioc_type = (item.get("ioc_type") or "").strip().strip('"')
        malware = (
            item.get("malware_printable")
            or item.get("malware")
            or "Unknown"
        ).strip().strip('"')

        # Extract IP/Host
        target = None
        if ioc_type == 'ip:port':
            target = ioc_val.split(':')[0]
        elif ioc_type in ('ip', 'ipv4'):
            target = ioc_val
        elif ioc_type == 'domain':
            if len(unique_ips) < 50:
                try:
                    target = socket.gethostbyname(ioc_val)
                except Exception:
                    continue
        elif ioc_type == 'url':
            try:
                host = urlparse(ioc_val).hostname
                if host and host.replace('.', '').isdigit():
                    target = host
                elif host and len(unique_ips) < 50:
                    target = socket.gethostbyname(host)
            except Exception:
                continue
        
        # Simple IPv4 check
        if target:
            parts = target.split('.')
            if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
                c2_candidates.append({
                    'ip': target,
                    'malware': malware,
                    'type': 'C2'
                })
                unique_ips.add(target)

    print(f"Identified {len(c2_candidates)} candidates across {len(unique_ips)} unique IPs.")

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
    if not client:
        print("Skipping R2 upload: Missing credentials.")
        return

    json_data = json.dumps(data)
    
    try:
        # Note: Cloudflare R2 does not support S3 ACLs (e.g. ACL='public-read').
        # Access is managed via Cloudflare bucket settings.
        client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key='threat-map/data.json',
            Body=json_data,
            ContentType='application/json'
        )
        print("Upload complete! Successfully uploaded threat-map/data.json to R2.")
    except Exception as e:
        print(f"Failed to upload to R2: {e}")
        raise e

if __name__ == "__main__":
    data = generate_map_data()
    print(f"Generated {len(data)} map points.")
    upload_to_r2(data)
