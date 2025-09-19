// Vendor & Private Threat Research
export const VENDOR_THREAT_RESEARCH = [
  {
    name: "Google Mandiant Threat Intelligence",
    url: "https://cloud.google.com/blog/topics/threat-intelligence/rss",
    icon: "fas fa-shield-alt",
    color: "#4285f4",
  },
  {
    name: "Cisco Talos Intelligence",
    url: "https://feeds.feedburner.com/feedburner/Talos", // Updated URL
    icon: "fas fa-network-wired",
    color: "#1ba0d7",
  },
  {
    name: "CrowdStrike Blog",
    url: "https://www.crowdstrike.com/blog/feed/",
    icon: "fas fa-crow",
    color: "#dc2626",
  },
  {
    name: "Red Canary Blog",
    url: "https://redcanary.com/blog/feed/",
    icon: "fas fa-feather-alt",
    color: "#ef4444",
  },
  {
    name: "Securelist (Kaspersky)",
    url: "https://securelist.com/feed/",
    icon: "fas fa-lock",
    color: "#00a86b",
  },
  {
    name: "ESET WeLiveSecurity",
    url: "https://www.welivesecurity.com/feed/",
    icon: "fas fa-shield-virus",
    color: "#0066cc",
  },
  {
    name: "Trustwave SpiderLabs",
    url: "https://www.trustwave.com/en-us/resources/blogs/spiderlabs-blog/?rss=true",
    icon: "fas fa-spider",
    color: "#ff6b35",
  },
  {
    name: "Palo Alto Unit 42",
    url: "https://unit42.paloaltonetworks.com/feed/",
    icon: "fas fa-shield-virus",
    color: "#2563eb",
  },
  {
    name: "Microsoft Security Blog",
    url: "https://www.microsoft.com/en-us/security/blog/feed/",
    icon: "fas fa-microsoft",
    color: "#00bcf2",
  },
  {
    name: "FortiGuard Labs",
    url: "https://www.fortinet.com/rss/fortiguard-labs-threat-research.xml",
    icon: "fas fa-fortress",
    color: "#ee3124",
  },
  {
    name: "Cisco Threat Research Blog", // New source
    url: "https://blogs.cisco.com/feed",
    icon: "fas fa-network-wired",
    color: "#1ba0d7",
  },
  {
    name: "Check Point Research", // New source
    url: "https://research.checkpoint.com/category/threat-research/feed/",
    icon: "fas fa-shield-alt",
    color: "#4285f4",
  },
];

// Government & Agency Alerts
export const GOVERNMENT_ALERTS = [
  {
    name: "CISA Alerts (US)",
    url: "https://www.cisa.gov/news-events/alerts/rss",
    icon: "fas fa-flag-usa",
    color: "#1e40af",
  },
  {
    name: "NCSC Threat Reports (UK)",
    url: "https://www.ncsc.gov.uk/collection/threat-reports/rss",
    icon: "fas fa-crown",
    color: "#dc2626",
  },
  {
    name: "SANS Internet Storm Center",
    url: "https://isc.sans.edu/rssfeed.xml",
    icon: "fas fa-cloud-rain",
    color: "#f59e0b",
  },
  {
    name: "Juniper Networks Threat Research", // New source
    url: "https://blogs.juniper.net/threat-research/feed",
    icon: "fas fa-network-wired",
    color: "#1ba0d7",
  },
];

// Specialized & Malware Focus
export const MALWARE_RESEARCH = [
  {
    name: "MalwareTech",
    url: "https://www.malwaretech.com/feed",
    icon: "fas fa-bug",
    color: "#ef4444",
  },
  {
    name: "The DFIR Report",
    url: "https://thedfirreport.com/feed/",
    icon: "fas fa-search",
    color: "#16a34a",
  },
  {
    name: "vx-underground",
    url: "https://vx-underground.org/rss.xml",
    icon: "fas fa-code",
    color: "#6b7280",
  },
  {
    name: "Malware.News Analysis",
    url: "https://malware.news/c/malware-analysis/6.rss",
    icon: "fas fa-virus",
    color: "#dc2626",
  },
];

// General Security News
export const GENERAL_SECURITY_NEWS = [
  {
    name: "The Hacker News",
    url: "http://feeds.feedburner.com/TheHackersNews?format=xml",
    icon: "fas fa-user-secret",
    color: "#f97316",
  },
  {
    name: "Bleeping Computer",
    url: "https://www.bleepingcomputer.com/feed/",
    icon: "fas fa-exclamation",
    color: "#ef4444",
  },
  {
    name: "Krebs on Security",
    url: "https://krebsonsecurity.com/feed/",
    icon: "fas fa-user-tie",
    color: "#059669",
  },
  {
    name: "Dark Reading",
    url: "https://www.darkreading.com/rss.xml",
    icon: "fas fa-eye",
    color: "#8b5cf6",
  },
  {
    name: "SecurityWeek",
    url: "https://feeds.feedburner.com/securityweek",
    icon: "fas fa-calendar-week",
    color: "#0ea5e9",
  },
];

// Legacy sources (for backward compatibility)
export const LEGACY_SOURCES = [
  {
    name: "Flashpoint",
    url: "https://flashpoint.io/feed/",
    icon: "fas fa-flash",
    color: "#f59e0b",
  },
];

// Combined RSS sources for easy access
export const RSS_SOURCES = [
  ...VENDOR_THREAT_RESEARCH,
  ...GOVERNMENT_ALERTS,
  ...MALWARE_RESEARCH,
  ...GENERAL_SECURITY_NEWS,
  ...LEGACY_SOURCES,
];