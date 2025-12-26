import os
import spacy
import psycopg2
import json
from psycopg2.extras import Json
from collections import Counter
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# VERIS Taxonomy - Industry Verticals
# Simplified mapping for keyword matching
INDUSTRY_KEYWORDS = {
    "Finance": ["bank", "financial", "crypto", "currency", "swift", "atm", "wealth", "investment", "insurance", "defi", "blockchain", "wallet", "credit union", "fintech"],
    "Healthcare": ["hospital", "medical", "patient", "clinic", "health", "pharmaceutical", "doctor", "nurse", "surgery", "hipaa", "ehr", "telehealth"],
    "Technology": ["software", "hardware", "saas", "tech", "cloud", "platform", "app", "application", "developer", "google", "microsoft", "apple", "amazon", "meta", "oracle", "cisco", "ibm", "intel"],
    "Energy": ["oil", "gas", "pipeline", "electric", "power", "grid", "energy", "solar", "nuclear", "utility", "petroleum", "refinery"],
    "Education": ["university", "school", "college", "student", "faculty", "campus", "education", "research", "academic", "k-12"],
    "Government": ["government", "federal", "state", "agency", "ministry", "department", "public sector", "defense", "military", "municipality"],
    "Retail": ["retail", "store", "commerce", "e-commerce", "shop", "merchant", "customer", "pos", "point of sale"],
    "Manufacturing": ["factory", "manufacturing", "industrial", "plant", "production", "supply chain", "ics", "scada", "ot"],
    "Teleam": ["telecom", "isp", "network provider", "5g", "mobile carrier", "broadband", "satellite"],
    "Transport": ["airline", "aviation", "airport", "shipping", "logistics", "transport", "rail", "maritime", "cargo", "train"]
}

# Industry Giants (Boost score if found)
INDUSTRY_GIANTS = {
    "Technology": ["Microsoft", "Google", "Apple", "Amazon", "Meta", "IBM", "Oracle", "Cisco", "Nvidia", "Intel", "Adobe", "Salesforce"],
    "Finance": ["JPMorgan", "Chase", "Bank of America", "Citi", "Wells Fargo", "Goldman Sachs", "Morgan Stanley", "Visa", "Mastercard", "PayPal", "Block", "Stripe"],
    "Healthcare": ["UnitedHealth", "Pfizer", "Johnson & Johnson", "Merck", "AbbVie", "Eli Lilly", "Bristol Myers Squibb", "Thermo Fisher", "Abbott"],
    "Government": ["FBI", "CISA", "NSA", "CIA", "DOD", "NHS", "HHS"],
    "Energy": ["ExxonMobil", "Chevron", "Shell", "BP", "TotalEnergies", "Saudi Aramco"],
}

def load_nlp_model():
    try:
        print("Loading spaCy model 'en_core_web_sm'...")
        return spacy.load("en_core_web_sm")
    except OSError:
        print("Model not found. Downloading 'en_core_web_sm'...")
        from spacy.cli import download
        download("en_core_web_sm")
        return spacy.load("en_core_web_sm")

def score_text(text, nlp):
    if not text:
        return []
    
    doc = nlp(text)
    scores = Counter()
    
    # 1. Keyword Matching (Process lemmatized/lowercased tokens)
    text_lower = text.lower()
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                scores[industry] += 1
    
    # 2. Named Entity Recognition (ORG)
    for ent in doc.ents:
        if ent.label_ == "ORG":
            # Check if ORG is a known giant
            for industry, giants in INDUSTRY_GIANTS.items():
                if any(giant.lower() in ent.text.lower() for giant in giants):
                    scores[industry] += 5  # Strong boost for specific entities
                    print(f"  Found Giant: {ent.text} -> {industry}")
    
    # Filter Score
    # Must have at least a score of 2 to be considered (e.g. 2 keywords or 1 giant)
    final_industries = [ind for ind, score in scores.items() if score >= 2]
    
    # Sort by score desc
    return sorted(final_industries, key=lambda x: scores[x], reverse=True)[:3] # Return top 3

def main():
    if not os.getenv("DATABASE_URL"):
        print("DATABASE_URL is not set.")
        return

    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()
        
        # Select articles where targeted_industries is empty/null specifically. 
        # Checking for empty array '[]' or NULL.
        print("Fetching unanalyzed articles...")
        cur.execute("""
            SELECT id, title, summary FROM articles 
            WHERE targeted_industries IS NULL OR jsonb_array_length(targeted_industries) = 0
            ORDER BY published_at DESC
            LIMIT 200;
        """)
        
        rows = cur.fetchall()
        print(f"Found {len(rows)} articles to analyze.")
        
        if not rows:
            return

        nlp = load_nlp_model()
        
        updated_count = 0
        
        for row in rows:
            article_id, title, summary = row
            
            # Combine text for analysis
            full_text = f"{title}. {summary or ''}"
            
            industries = score_text(full_text, nlp)
            
            if industries:
                # Update DB
                cur.execute(
                    "UPDATE articles SET targeted_industries = %s WHERE id = %s",
                    (Json(industries), article_id)
                )
                updated_count += 1
                print(f"[{article_id}] Tagged: {industries}")
            
        conn.commit()
        print(f"Analysis Complete. Updated {updated_count} articles.")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
