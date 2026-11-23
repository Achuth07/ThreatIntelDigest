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
      'It covers CVSS v3.1 and v3.0, the versions stored for nearly every CVE on WhatCyber. A vector that starts with CVSS:3.0 is scored with the v3.0 rounding rule, and one that starts with CVSS:3.1 with the v3.1 rule. CVSS v4.0 uses a different scoring model and is not covered here.',
  },
  {
    question: 'Can I check the score of a published CVE?',
    answer:
      'Yes. Enter a CVE ID and the calculator loads the CVSS vector that the National Vulnerability Database lists for it, then recomputes the score so you can compare it with the published one. You can also paste any vector string into the vector box.',
  },
];
