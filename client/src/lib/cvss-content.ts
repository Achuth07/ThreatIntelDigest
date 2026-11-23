/**
 * Text of the CVSS calculator page (WHA-29): the answer-first intro and the FAQ. One source for the
 * page, the server-rendered copy (server/services/page-body.ts) and the FAQPage structured data.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export const CVSS_TOOL_PATH = '/tools/cvss-calculator';

export const CVSS_ANSWER =
  'CVSS, the Common Vulnerability Scoring System, rates how severe a security flaw is on a scale from 0.0 to 10.0. This calculator works out the CVSS v3.1 base score from eight metrics, shows the severity rating, and gives you the vector string to quote in a report or a ticket.';

export const CVSS_FAQ: { question: string; answer: string }[] = [
  {
    question: 'What is a CVSS base score?',
    answer:
      'The base score is the severity of a vulnerability on its own, from 0.0 to 10.0. It is worked out from eight metrics that describe how the flaw is reached and what an attacker gains. It does not consider your environment or whether the flaw is being exploited.',
  },
  {
    question: 'How is the CVSS v3.1 base score calculated?',
    answer:
      'Four exploitability metrics (attack vector, attack complexity, privileges required, user interaction) are multiplied into an exploitability sub-score, and three impact metrics (confidentiality, integrity, availability) give an impact sub-score. The scope metric decides how the two are combined. The result is rounded up to one decimal place.',
  },
  {
    question: 'What do the severity ratings mean?',
    answer:
      'A score of 0.1 to 3.9 is Low, 4.0 to 6.9 is Medium, 7.0 to 8.9 is High and 9.0 to 10.0 is Critical. A score of 0.0 is None, which happens when a flaw has no impact on confidentiality, integrity or availability.',
  },
  {
    question: 'Does a high CVSS score mean a flaw is being exploited?',
    answer:
      'No. CVSS measures how severe a flaw could be, not how likely it is to be attacked. For confirmed exploitation look at the CISA Known Exploited Vulnerabilities catalog, and for the probability of exploitation in the next 30 days look at the EPSS score.',
  },
  {
    question: 'Which CVSS versions does this calculator cover?',
    answer:
      'It covers CVSS v3.1 and v3.0, the versions stored for nearly every CVE on WhatCyber. A vector that starts with CVSS:3.0 is scored with the v3.0 rounding rule, and one that starts with CVSS:3.1 with the v3.1 rule. CVSS v4.0 uses a different scoring model and has its own calculator, the CVSS 4.0 calculator.',
  },
  {
    question: 'Can I check the score of a published CVE?',
    answer:
      'Yes. Enter a CVE ID and the calculator loads the CVSS vector that the National Vulnerability Database lists for it, then recomputes the score so you can compare it with the published one. You can also paste any vector string into the vector box.',
  },
];

// ---------------------------------------------------------------------------------------------
// CVSS 4.0 calculator

export const CVSS4_TOOL_PATH = '/tools/cvss-4-calculator';

export const CVSS4_ANSWER =
  'CVSS v4.0 is the current version of the Common Vulnerability Scoring System, published by FIRST in November 2023. This calculator scores a CVSS v4.0 vector from 0.0 to 10.0 using the base metrics, and optionally the threat and environmental metrics, then shows the severity rating and the vector string.';

export const CVSS4_FAQ: { question: string; answer: string }[] = [
  {
    question: 'How is a CVSS v4.0 score calculated?',
    answer:
      'Unlike CVSS v3.x, v4.0 has no single formula. The metrics put a vector into one of 270 groups of similar vectors, called macrovectors. FIRST has set a score for each group, and the distance between your vector and the most severe vector in its group lowers the score within that group.',
  },
  {
    question: 'What do CVSS-B, CVSS-BT, CVSS-BE and CVSS-BTE mean?',
    answer:
      'The label says which metric groups went into the score: B is the base metrics only, BT adds the threat metric (Exploit Maturity), BE adds the environmental metrics, and BTE uses all three. A score quoted without a label is normally the base score.',
  },
  {
    question: 'What changed from CVSS v3.1 to v4.0?',
    answer:
      'v4.0 adds an Attack Requirements metric, splits User Interaction into Passive and Active, replaces Scope with separate impact metrics for the vulnerable system and for subsequent systems, reduces the threat metrics to Exploit Maturity, and adds supplemental metrics such as Safety and Automatable that describe a flaw without changing its score.',
  },
  {
    question: 'Does a v4.0 score replace the v3.1 score of a CVE?',
    answer:
      'Not yet. Most CVEs still carry a v3.x score, and the v4.0 score of the same flaw can differ because the two versions measure it differently. Always quote the version together with the score.',
  },
  {
    question: 'What do the severity ratings mean?',
    answer:
      'A score of 0.1 to 3.9 is Low, 4.0 to 6.9 is Medium, 7.0 to 8.9 is High and 9.0 to 10.0 is Critical. A score of 0.0 is None, which is what a vector with no impact on any system gets.',
  },
  {
    question: 'Is the score the same as in the FIRST calculator?',
    answer:
      'The scoring follows the FIRST reference calculator, and it is tested against the v4.0 scores that CVE numbering authorities publish in CVE records. Published CVE scores almost never include environmental metrics, so the environmental scores could not be checked against real data; they follow the same method as the FIRST calculator.',
  },
];
