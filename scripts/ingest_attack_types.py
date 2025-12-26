import os
import sys
import xml.etree.ElementTree as ET
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import io
import zipfile

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL is not set.")
    sys.exit(1)

# View 1000 is the Research Concepts view (The "Master" Hierarchy)
CWE_URL = "https://cwe.mitre.org/data/xml/views/1000.xml.zip" 

def ingest_cwe_data():
    print("Downloading CWE View 1000 data...")
    try:
        r = requests.get(CWE_URL)
        r.raise_for_status()
    except Exception as e:
        print(f"Failed to download CWE data: {e}")
        sys.exit(1)

    print("Extracting XML...")
    cwe_data = {} # Map ID -> {name, desc, parents: []}
    
    try:
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            # Find the XML file
            xml_files = [f for f in z.namelist() if f.endswith('.xml')]
            if not xml_files:
                print("No XML file found in the zip.")
                sys.exit(1)
                
            xml_filename = xml_files[0]
            with z.open(xml_filename) as f:
                tree = ET.parse(f)
                root = tree.getroot()
                
                # Dynamic namespace handling
                ns = {}
                if '}' in root.tag:
                    ns_url = root.tag.split('}')[0].strip('{')
                    ns = {'cwe': ns_url}
                
                weakness_tag = f"{{{ns.get('cwe')}}}Weakness" if ns else "Weakness"
                category_tag = f"{{{ns.get('cwe')}}}Category" if ns else "Category"
                desc_tag = f"{{{ns.get('cwe')}}}Description" if ns else "Description"
                rel_tag = f"{{{ns.get('cwe')}}}Related_Weaknesses" if ns else "Related_Weaknesses"

                # 1. Parse Categories (View 1000 has fewer categories, mostly Pillars/Classes are Weaknesses)
                for cat in root.findall(f".//{category_tag}"):
                    cat_id = cat.get("ID")
                    cat_name = cat.get("Name")
                    cwe_data[cat_id] = {
                        "name": cat_name,
                        "description": "Category",
                        "parents": [],
                        "type": "Category", # Explicit Category
                        "is_root": False
                    }

                # 2. Parse Weaknesses (The meat of View 1000)
                for weakness in root.findall(f".//{weakness_tag}"):
                    cwe_id = weakness.get("ID")
                    name = weakness.get("Name")
                    w_type = weakness.get("Abstraction") # Pillar, Class, Base, Variant
                    
                    description_elem = weakness.find(desc_tag)
                    description = description_elem.text if description_elem is not None else "No description"
                    
                    parents = []
                    related = weakness.find(rel_tag)
                    if related is not None:
                        for rel in related:
                             if rel.get("Nature") == "ChildOf":
                                 # In View 1000, we follow ChildOf relations generally
                                 # We prefer parents that are also in View 1000 (usually denoted by View_ID="1000")
                                 # But if View_ID is "1000", we take it.
                                 if rel.get("View_ID") == "1000":
                                     parents.append(rel.get("CWE_ID"))

                    cwe_data[cwe_id] = {
                        "name": name,
                        "description": description,
                        "parents": parents,
                        "type": w_type,
                        "is_root": False
                    }

    except Exception as e:
        print(f"Error parsing XML: {e}")
        sys.exit(1)

    print(f"Parsed {len(cwe_data)} CWE entities.")

    # 3. Resolve Root Categories (Pillars)
    # in View 1000, high-level nodes are "Pillars" (e.g., "Seven Pernicious Kingdoms") or "Class".
    # We want to map common Base/Variant weakness (like SQLi) up to a Class or Pillar.
    # If we hit a node with type="Pillar", we stop.
    
    # Define known high-level categories if possible, or just dynamic resolution.
    # recursive resolution
    
    memo = {}

    def get_root_category(cwid, path=set()):
        if cwid in memo:
            return memo[cwid]
        
        if cwid not in cwe_data:
            return "Uncategorized", "Unknown"

        node = cwe_data[cwid]
        
        # STOP condition: It's a Pillar or has no VIEW-1000 parents
        if node["type"] == "Pillar":
             memo[cwid] = (node["name"], node["name"])
             return memo[cwid]
        
        if not node["parents"]:
             # Orphan node, treats as its own category if it's a Class or Category
             if node["type"] in ["Class", "Category"]:
                 memo[cwid] = (node["name"], node["name"])
                 return memo[cwid]
             else:
                 memo[cwid] = ("Generic Weakness", "Miscellaneous") # Fallback
                 return memo[cwid]

        # Prevent cycles
        if cwid in path:
             # Cycle detected, return current node as category to break
             return node["name"], node["name"]
        path.add(cwid)

        # Traverse up
        # We prefer a parent that is a Pillar or Class.
        # Simple DFS up.
        parent_id = node["parents"][0]
        cat_name, cat_desc = get_root_category(parent_id, path)
        
        path.remove(cwid)
        memo[cwid] = (cat_name, cat_desc)
        return cat_name, cat_desc

    final_data = []
    
    for cwid, data in cwe_data.items():
        # Only process items that are likely to be reported (Weaknesses)
        # We also ingest Categories for completeness if they appear in reports
        
        category_name, _ = get_root_category(cwid)
        
        # If resolving returns "Generic Weakness" or "Uncategorized", maybe try to go one level up only?
        # Ideally pillar resolution works.
        
        final_data.append({
            "id": "CWE-" + cwid,
            "name": data["name"],
            "category": category_name,
            "description": data["description"]
        })

    print(f"Resolved categories for {len(final_data)} entities.")

    # Connect to Database
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Create Table Safe Migration (Bypassing db:push risk)
        create_table_query = """
        CREATE TABLE IF NOT EXISTS cwe_categories (
            id VARCHAR PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            last_updated TIMESTAMP DEFAULT NOW()
        );
        """
        cur.execute(create_table_query)
        conn.commit()
        print("Ensured cwe_categories table exists.")

        # Batch Insert
        insert_query = """
            INSERT INTO cwe_categories (id, name, category, description)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                description = EXCLUDED.description,
                last_updated = NOW();
        """
        
        data_tuples = [(item["id"], item["name"], item["category"], item["description"]) for item in final_data]
        
        if data_tuples:
            execute_values(cur, insert_query, data_tuples)
            conn.commit()
            print(f"Successfully inserted/updated {len(data_tuples)} CWE categories.")
        else:
            print("No data to insert.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    ingest_cwe_data()
