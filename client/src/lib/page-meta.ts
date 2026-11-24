/**
 * Title, description and keywords of the fixed public pages.
 *
 * One source for both the pages (client/src/pages/*) and the server, which writes these into the
 * HTML so link previews and crawlers that do not run JavaScript see the right values.
 * Keep this file free of React and browser APIs.
 */

export interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
}

export const STATIC_PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Threat Intelligence: CVEs, CISA KEV & Threat Actors | WhatCyber',
    description:
      'Threat intelligence in one dashboard: CISA KEV tracking, 215,000+ CVEs, 175+ threat actor profiles and cybersecurity news from trusted sources.',
    keywords: 'cybersecurity, threat intelligence, CVE, vulnerabilities, security news, cyber threats',
  },
  '/threatfeed': {
    title: 'Live Cybersecurity News Feed | WhatCyber',
    description:
      'Your live, aggregated feed of the latest cybersecurity news. Stay updated on vulnerabilities, threat intel, and breaking stories from around the web.',
    keywords:
      'cybersecurity news, threat intelligence, vulnerability feed, security alerts, cyber threats, security updates',
  },
  '/cisa-kev': {
    title: 'CISA KEV Tracker: Known Exploited Vulnerabilities | WhatCyber',
    description:
      "Track CISA's Known Exploited Vulnerabilities (KEV) catalog: newly added CVEs, ransomware use, affected vendors and remediation due dates, updated daily.",
    keywords: 'CISA KEV, exploited vulnerabilities, active exploitation, ransomware, cve, security dashboard',
  },
  '/cve': {
    title: 'Latest CVEs Today: New Vulnerabilities by Severity | WhatCyber',
    description:
      'Browse newly published CVEs, filter by severity and vendor, and see CVSS scores. Data from the National Vulnerability Database.',
    keywords: 'CVE, vulnerabilities, security flaws, exploit, cvss, nvd',
  },
  '/tools/cvss-calculator': {
    title: 'CVSS Calculator for CVSS 4.0 and 3.1 Scores | WhatCyber',
    description:
      'Score a CVSS v4.0 or v3.1 vector from its metrics, see the severity rating and copy the vector string. Load any published CVE to check its v3 score.',
    keywords: 'CVSS calculator, CVSS score, CVSS vector, vulnerability severity, CVSS 4.0, CVSS 3.1',
  },
  '/tools/cvss-calculator/4-0': {
    title: 'CVSS 4.0 Calculator: Score a CVSS v4.0 Vector | WhatCyber',
    description:
      'Free CVSS 4.0 calculator. Choose the base, threat, environmental and supplemental metrics to get the CVSS-B, BT, BE or BTE score, the severity and the vector string.',
    keywords: 'CVSS 4.0 calculator, CVSS v4 calculator, CVSS 4.0 score, CVSS 4.0 vector, CVSS-BT, macrovector',
  },
  '/tools/cvss-calculator/3-1': {
    title: 'CVSS 3.1 Calculator: Score a CVSS v3.1 Vector | WhatCyber',
    description:
      'Free CVSS 3.1 calculator. Choose the eight base metrics to get the base score, the severity and the vector string, or load any published CVE to check its NVD score.',
    keywords: 'CVSS 3.1 calculator, CVSS v3.1 calculator, CVSS 3.1 score, CVSS 3.1 vector, CVSS 3.0 calculator, NVD score',
  },
  '/tools/kev-exposure-checker': {
    title: 'KEV Exposure Checker: Which Exploited CVEs Hit Your Stack | WhatCyber',
    description:
      'Pick the vendors and products you run and see every CISA Known Exploited Vulnerability that affects them, with CISA due dates, ransomware use and scores. Shareable and exportable.',
    keywords: 'KEV exposure checker, CISA KEV by vendor, known exploited vulnerabilities by product, KEV due date, patch priority',
  },
  '/vendors': {
    title: 'Vulnerabilities by Vendor: Microsoft, Linux, Google and More | WhatCyber',
    description:
      'Browse CVEs by vendor. The 100 vendors with the most vulnerabilities, with CVE counts and the number of entries in the CISA Known Exploited Vulnerabilities catalog.',
    keywords: 'vulnerabilities by vendor, vendor CVEs, security advisories, exploited vulnerabilities by vendor',
  },
  '/cwe': {
    title: 'Common Weakness Enumeration (CWE): Top Software Weaknesses | WhatCyber',
    description:
      'The 50 most common software weaknesses (CWE) behind CVEs, with how many vulnerabilities each one causes and how many are known to be exploited.',
    keywords: 'CWE, common weakness enumeration, software weaknesses, vulnerability types, cross-site scripting, SQL injection',
  },
  '/threat-actors': {
    title: 'Threat Actors Directory: APT Groups and Intrusion Sets | WhatCyber',
    description:
      'Profiles of known APT groups, intrusion sets and other threat actors, with aliases, descriptions and related news. Based on MITRE ATT&CK.',
  },
  '/blog': {
    title: 'WhatCyber Blog - Cybersecurity Insights & Industry Updates',
    description:
      'Read the latest articles on cybersecurity trends, threat intelligence analysis, and updates from the WhatCyber team.',
  },
  '/about': {
    title: 'About WhatCyber - Our Mission & Team | Cybersecurity News Aggregator',
    description:
      "Learn about WhatCyber's mission to make cybersecurity accessible and effective for everyone. Discover our story, values, and team behind the cybersecurity news aggregator platform.",
    keywords: 'cybersecurity, about us, company story, cybersecurity team, threat intelligence platform, security mission',
  },
  '/sources': {
    title: 'Our Cybersecurity Sources | WhatCyber',
    description:
      "Explore the 25+ trusted cybersecurity sources that feed into WhatCyber's threat intelligence aggregator. We curate content from leading vendors, government agencies, and research teams.",
    keywords: 'cybersecurity sources, threat intelligence feeds, security research, cyber news sources, vulnerability feeds',
  },
  '/contact': {
    title: 'Contact WhatCyber - Get in Touch | Cybersecurity News Aggregator',
    description:
      'Get in touch with WhatCyber. Have questions about our cybersecurity news aggregator or threat intelligence platform? Contact our team for support, partnerships, or feedback.',
    keywords: 'contact us, cybersecurity support, threat intelligence contact, security platform feedback, get in touch',
  },
  '/privacy': {
    title: 'Privacy Policy - WhatCyber | Cybersecurity News Aggregator',
    description:
      "Learn about WhatCyber's privacy practices. We are committed to protecting your personal information and ensuring your privacy while using our cybersecurity news aggregator platform.",
    keywords: 'privacy policy, data protection, cybersecurity privacy, personal information, user privacy, privacy practices',
  },
  '/terms': {
    title: 'Terms of Service - WhatCyber | Cybersecurity News Aggregator',
    description:
      "Review WhatCyber's Terms of Service to understand the rules and regulations for using our cybersecurity news aggregator platform and services.",
    keywords:
      'terms of service, terms and conditions, user agreement, cybersecurity platform terms, whatcyber terms, service agreement',
  },
};

/** Shown for URLs that match no page, and used by the build for 404.html. */
export const NOT_FOUND_META: PageMeta = {
  title: 'Page Not Found - WhatCyber ThreatFeed',
  description: "The page you're looking for doesn't exist on WhatCyber ThreatFeed.",
};
