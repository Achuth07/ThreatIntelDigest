/**
 * Text of the CVE prioritiser page (WHA-29): intro, rules, FAQ and page meta. One source for the page,
 * the server-rendered copy (server/services/page-body.ts) and the FAQPage structured data.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export const PRIORITISE_TOOL_PATH = '/tools/cve-prioritiser';

export const PRIORITISE_META = {
  title: 'CVE Prioritiser: Rank CVEs by KEV, EPSS and CVSS | WhatCyber',
  description:
    'Paste a list of CVE IDs and rank them by what to patch first, using CISA KEV status, EPSS exploit probability and CVSS severity. Shareable and exportable.',
  keywords: 'CVE prioritiser, vulnerability prioritization, KEV EPSS CVSS, patch priority, which CVE to patch first, vulnerability triage',
};

export const PRIORITISE_ANSWER =
  'Scanners return long lists of CVEs, and not all of them need patching today. Paste your list and this tool ranks each CVE by three signals: whether CISA lists it as exploited in the wild (KEV), the EPSS chance of exploitation in the next 30 days, and the CVSS severity.';

/** The rules, in the order they are applied. The first one that matches decides the tier. */
export const PRIORITISE_RULES: { tier: string; label: string; rule: string }[] = [
  { tier: 'now', label: 'Patch now', rule: 'The CVE is in the CISA KEV catalog. Exploitation has been seen, so this goes first; ransomware use ranks highest.' },
  { tier: 'soon', label: 'Patch soon', rule: 'Not in KEV, but EPSS is 10% or higher, or the CVSS v3 score is 9.0 or higher.' },
  { tier: 'plan', label: 'Plan the fix', rule: 'Not in KEV, with a CVSS v3 score of 7.0 or higher, or EPSS of 1% or higher.' },
  { tier: 'routine', label: 'Routine', rule: 'Everything else: low EPSS, below high severity, or not scored yet. Fix it in your normal patch cycle.' },
];

export const PRIORITISE_FAQ: { question: string; answer: string }[] = [
  {
    question: 'How does the CVE prioritiser rank vulnerabilities?',
    answer:
      'It puts each CVE in one of four tiers. A CVE in the CISA KEV catalog is Patch now. Otherwise an EPSS of 10% or more, or a CVSS v3 score of 9.0 or more, makes it Patch soon. A CVSS score of 7.0 or more, or an EPSS of 1% or more, is Plan the fix. The rest is Routine. Inside a tier the list is ordered by ransomware use, CISA due date, EPSS and CVSS.',
  },
  {
    question: 'Why is KEV the first signal?',
    answer:
      'KEV is the only one of the three signals that confirms exploitation has already happened. CVSS describes how bad a flaw could be and EPSS estimates how likely exploitation is, but a KEV entry means attackers are using the flaw today. Most guidance, including CISA directive BOD 22-01, treats KEV entries as the first thing to fix.',
  },
  {
    question: 'What is EPSS and what does the percentage mean?',
    answer:
      'The Exploit Prediction Scoring System, run by FIRST, estimates the probability that a CVE will be exploited in the wild in the next 30 days. An EPSS of 10% means a one in ten chance. The percentile next to it shows how that score ranks among all scored CVEs. EPSS is updated daily and a new CVE can score low until exploit code appears.',
  },
  {
    question: 'Does a low priority mean I can ignore a CVE?',
    answer:
      'No. Routine means it can wait for your normal patch cycle, not that it is safe. The tiers use public signals only. They do not know whether the affected system is exposed to the internet, holds sensitive data or already has a compensating control. Raise the priority of any CVE on an exposed or critical system.',
  },
  {
    question: 'Why does a CVE say it was not found?',
    answer:
      'WhatCyber has no record of that ID. It may be mistyped, reserved but not yet published, rejected, or too new to have been synced. Check the ID against the NVD and try again later. A CVE that is in the KEV catalog is always shown, even if its NVD record is incomplete.',
  },
  {
    question: 'Why are some CVEs missing a CVSS or EPSS score?',
    answer:
      'New CVEs are often published before NVD adds a CVSS v3 score, and EPSS scores arrive a day or more after publication. The tool shows the signals it has and says so when one is missing. CVSS v4 scores are not included yet, only CVSS v3.',
  },
  {
    question: 'Can I share or export the ranked list?',
    answer:
      'Yes. The page address holds the CVE IDs you pasted, so you can send it to a colleague, and the Export button downloads the ranked table as a CSV file. Nothing you paste is stored on WhatCyber. You can list up to 200 CVE IDs at a time.',
  },
];
