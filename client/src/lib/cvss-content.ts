/**
 * Text of the CVSS calculator page (WHA-29): the answer-first intro and the FAQ. One source for the
 * page, the server-rendered copy (server/services/page-body.ts) and the FAQPage structured data.
 * The page has one calculator with a switch between CVSS v4.0 and v3.1, so the text covers both.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export const CVSS_TOOL_PATH = '/tools/cvss-calculator';
/** The separate CVSS 4.0 page that existed briefly; it now redirects here. */
export const CVSS4_LEGACY_PATH = '/tools/cvss-4-calculator';

export const CVSS_ANSWER =
  'CVSS, the Common Vulnerability Scoring System, rates how severe a security flaw is on a scale from 0.0 to 10.0. This calculator scores CVSS v4.0 and v3.1 vectors: choose the version with the tabs, pick a value for each metric, and get the score, the severity rating and the vector string to quote in a report or a ticket.';

export const CVSS_FAQ: { question: string; answer: string }[] = [
  {
    question: 'What is a CVSS base score?',
    answer:
      'The base score is the severity of a vulnerability on its own, from 0.0 to 10.0. It is worked out from metrics that describe how the flaw is reached and what an attacker gains. It does not consider your environment or whether the flaw is being exploited.',
  },
  {
    question: 'Which CVSS version should I use?',
    answer:
      'Use the version of the score you are working from. The National Vulnerability Database still scores nearly every CVE with v3.x, while v4.0, published by FIRST in November 2023, is the current version and more suppliers are adopting it. The two versions measure a flaw differently, so a v4.0 score can differ from the v3.1 score of the same flaw. Always quote the version together with the score.',
  },
  {
    question: 'What changed from CVSS v3.1 to v4.0?',
    answer:
      'v4.0 adds an Attack Requirements metric, splits User Interaction into Passive and Active, replaces Scope with separate impact metrics for the vulnerable system and for subsequent systems, reduces the threat metrics to Exploit Maturity, and adds supplemental metrics such as Safety and Automatable that describe a flaw without changing its score.',
  },
  {
    question: 'How is a CVSS v3.1 base score calculated?',
    answer:
      'Four exploitability metrics (attack vector, attack complexity, privileges required, user interaction) are multiplied into an exploitability sub-score, and three impact metrics (confidentiality, integrity, availability) give an impact sub-score. The scope metric decides how the two are combined. The result is rounded up to one decimal place. A vector that starts with CVSS:3.0 is scored with the v3.0 rounding rule, and one that starts with CVSS:3.1 with the v3.1 rule.',
  },
  {
    question: 'How is a CVSS v4.0 score calculated?',
    answer:
      'Unlike CVSS v3.x, v4.0 has no single formula. The metrics put a vector into one of 270 groups of similar vectors, called macrovectors. FIRST has set a score for each group, and the distance between your vector and the most severe vector in its group lowers the score within that group.',
  },
  {
    question: 'What do CVSS-B, CVSS-BT, CVSS-BE and CVSS-BTE mean?',
    answer:
      'This is the v4.0 naming. The label says which metric groups went into the score: B is the base metrics only, BT adds the threat metric (Exploit Maturity), BE adds the environmental metrics, and BTE uses all three. A score quoted without a label is normally the base score.',
  },
  {
    question: 'What do the severity ratings mean?',
    answer:
      'For both versions, a score of 0.1 to 3.9 is Low, 4.0 to 6.9 is Medium, 7.0 to 8.9 is High and 9.0 to 10.0 is Critical. A score of 0.0 is None, which is what a vector with no impact gets.',
  },
  {
    question: 'Does a high CVSS score mean a flaw is being exploited?',
    answer:
      'No. CVSS measures how severe a flaw could be, not how likely it is to be attacked. For confirmed exploitation look at the CISA Known Exploited Vulnerabilities catalog, and for the probability of exploitation in the next 30 days look at the EPSS score.',
  },
  {
    question: 'Can I check the score of a published CVE?',
    answer:
      'Yes, for CVSS v3. On the CVSS 3.1 tab, enter a CVE ID and the calculator loads the vector that the National Vulnerability Database lists for it, then recomputes the score so you can compare it with the published one. WhatCyber stores the v3 vector of each CVE, so the lookup does not cover v4.0. On either tab you can paste a vector into the vector box, and a vector of the other version switches the tab for you.',
  },
  {
    question: 'Is the score the same as in the official calculators?',
    answer:
      'The v3.x scoring uses the formulas of the FIRST specification and is tested against the scores that NVD publishes for tens of thousands of CVEs. The v4.0 scoring follows the FIRST reference calculator and is tested against the v4.0 scores that CVE numbering authorities publish in CVE records. Published CVE scores almost never include v4.0 environmental metrics, so those could not be checked against real data; they follow the same method as the FIRST calculator.',
  },
];
