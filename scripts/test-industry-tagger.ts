
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Copying the function from api/index.ts for testing purposes since it's not exported
function extractTargetedIndustries(title: string, content: string): string[] {
    const text = (title + " " + content).toLowerCase();
    const scores: Record<string, number> = {};

    // 1. Industry Keywords (1 point each)
    const INDUSTRY_KEYWORDS: Record<string, string[]> = {
        "Finance": [
            "bank", "financial", "crypto", "currency", "swift", "atm", "wealth", "investment",
            "insurance", "defi", "blockchain", "wallet", "credit union", "fintech", "trading",
            "stock market", "capital", "loan", "mortgage", "audit", "tax", "payment gateway"
        ],
        "Healthcare": [
            "hospital", "medical", "patient", "clinic", "health", "pharmaceutical", "doctor",
            "nurse", "surgery", "hipaa", "ehr", "telehealth", "biotech", "vaccine", "research lab",
            "healthcare provider", "insurance claim", "radiology", "emr"
        ],
        "Technology": [
            "software", "hardware", "saas", "tech", "cloud", "platform", "app", "application",
            "developer", "semiconductor", "firmware", "ai", "artificial intelligence", "machine learning",
            "iot", "internet of things", "cybersecurity", "data center", "server", "microchip"
        ],
        "Energy": [
            "oil", "gas", "pipeline", "electric", "power", "grid", "energy", "solar", "nuclear",
            "utility", "petroleum", "refinery", "renewable", "wind farm", "power plant", "mining",
            "offshore", "drilling"
        ],
        "Education": [
            "university", "school", "college", "student", "faculty", "campus", "education",
            "research", "academic", "k-12", "learning management system", "lms", "tuition",
            "scholarship", "professor"
        ],
        "Government": [
            "government", "federal", "state", "agency", "ministry", "department", "public sector",
            "defense", "military", "municipality", "election", "voter", "legislation", "parliament",
            "congress", "senate", "law enforcement", "police"
        ],
        "Retail": [
            "retail", "store", "commerce", "e-commerce", "shop", "merchant", "customer", "pos",
            "point of sale", "supermarket", "mall", "shopping", "inventory", "supply chain",
            "black friday", "consumer"
        ],
        "Manufacturing": [
            "factory", "manufacturing", "industrial", "plant", "production", "supply chain",
            "ics", "scada", "ot", "assembly line", "machinery", "automation", "robotics",
            "warehouse", "distribution"
        ],
        "Telecom": [
            "telecom", "isp", "network provider", "5g", "mobile carrier", "broadband", "satellite",
            "internet service provider", "fiber optic", "cellular", "voip", "telco"
        ],
        "Transport": [
            "airline", "aviation", "airport", "shipping", "logistics", "transport", "rail",
            "maritime", "cargo", "train", "freight", "trucking", "fleet", "vessel", "port"
        ]
    };

    // 2. Industry Giants (5 points boost)
    const INDUSTRY_GIANTS: Record<string, string[]> = {
        "Technology": [
            "microsoft", "google", "apple", "amazon", "meta", "ibm", "oracle", "cisco", "nvidia",
            "intel", "adobe", "salesforce", "sap", "vmware", "dell", "hp", "lenovo", "amd",
            "qualcomm", "broadcom", "uber", "airbnb", "netflix", "spotify"
        ],
        "Finance": [
            "jpmorgan", "chase", "bank of america", "citi", "wells fargo", "goldman sachs",
            "morgan stanley", "visa", "mastercard", "paypal", "block", "stripe", "american express",
            "hsbc", "barclays", "coinbase", "binance", "blackrock", "fidelity"
        ],
        "Healthcare": [
            "unitedhealth", "pfizer", "johnson & johnson", "merck", "abbvie", "eli lilly",
            "bristol myers squibb", "thermo fisher", "abbott", "moderna", "astrazeneca",
            "cvs health", "cigna", "humana", "medtronic"
        ],
        "Government": [
            "fbi", "cisa", "nsa", "cia", "dod", "nhs", "hhs", "dhs", "white house", "pentagon",
            "european union", "nato", "united nations"
        ],
        "Energy": [
            "exxonmobil", "chevron", "shell", "bp", "totalenergies", "saudi aramco", "gazprom",
            "schlumberger", "baker hughes", "halliburton"
        ],
        "Telecom": [
            "at&t", "verizon", "t-mobile", "vodafone", "orange", "telefonica", "china mobile",
            "deutsche telekom", "comcast", "charter"
        ],
        "Transport": [
            "fedex", "ups", "dhl", "maersk", "boeing", "airbus", "delta", "american airlines",
            "united airlines", "tesla", "toyota", "volkswagen", "ford", "gm"
        ],
        "Retail": [
            "walmart", "target", "costco", "home depot", "lowe's", "best buy", "alibaba",
            "jd.com", "ebay", "shopify"
        ]
    };

    // Calculate scores
    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        scores[industry] = 0;

        // Check keywords
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                scores[industry] += 1;
            }
        }

        // Check giants (if defined for this industry)
        if (INDUSTRY_GIANTS[industry]) {
            for (const giant of INDUSTRY_GIANTS[industry]) {
                if (text.includes(giant)) {
                    scores[industry] += 5; // Significant boost
                }
            }
        }
    }

    // Filter and sort: Return top 3 industries with score >= 2
    return Object.entries(scores)
        .filter(([_, score]) => score >= 2)
        .sort(([_, scoreA], [__, scoreB]) => scoreB - scoreA)
        .slice(0, 3)
        .map(([industry]) => industry);
}

// Test Cases
console.log("Running Industry Tagger Tests...");

const tests = [
    {
        title: "JPMorgan Chase suffers major data breach",
        content: "The financial giant reported a compromise of customer accounts.",
        expected: ["Finance"]
    },
    {
        title: "New Ransomware Targets Hospitals",
        content: "The attack disrupted surgeries and patient records using encryption.",
        expected: ["Healthcare"]
    },
    {
        title: "Oil pipeline shut down after cyber attack",
        content: "The energy sector is facing renewed threats from state-sponsored actors.",
        expected: ["Energy"]
    },
    {
        title: "Microsoft patches critical Windows vulnerability",
        content: "The tech giant released an out-of-band update for servers.",
        expected: ["Technology"]
    },
    {
        title: "Generic news about weather",
        content: "It is going to be sunny tomorrow with no cyber threats.",
        expected: []
    }
];

let passed = 0;
for (const t of tests) {
    const result = extractTargetedIndustries(t.title, t.content);
    const isMatch = t.expected.every(e => result.includes(e)) && (t.expected.length === 0 ? result.length === 0 : true);

    if (isMatch) {
        console.log(`✅ PASS: "${t.title}" -> ${JSON.stringify(result)}`);
        passed++;
    } else {
        console.error(`❌ FAIL: "${t.title}"`);
        console.error(`   Expected: ${JSON.stringify(t.expected)}`);
        console.error(`   Got:      ${JSON.stringify(result)}`);
    }
}

console.log(`\n${passed}/${tests.length} passed.`);
if (passed === tests.length) {
    process.exit(0);
} else {
    process.exit(1);
}
