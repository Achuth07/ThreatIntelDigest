/**
 * Text of the CVSS calculator pages (WHA-29): the answer-first intros and the FAQs. One source for the
 * page, the server-rendered copy (server/services/page-body.ts) and the FAQPage structured data.
 * There is one calculator with a switch between CVSS v4.0 and v3.1, and each version has its own
 * address so it can be found, shared and indexed on its own:
 *   /tools/cvss-calculator       overview of both
 *   /tools/cvss-calculator/4-0   CVSS 4.0
 *   /tools/cvss-calculator/3-1   CVSS 3.1
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export type CvssView = 'overview' | '4-0' | '3-1';
export const CVSS_TOOL_PATH = '/tools/cvss-calculator';
export const CVSS_VERSION_SLUGS = ['4-0', '3-1'] as const;
export type CvssVersionSlug = (typeof CVSS_VERSION_SLUGS)[number];

export function cvssPath(view: CvssView): string {
  return view === 'overview' ? CVSS_TOOL_PATH : `${CVSS_TOOL_PATH}/${view}`;
}

export function isCvssVersionSlug(value: string | undefined): value is CvssVersionSlug {
  return value === '4-0' || value === '3-1';
}

/** The separate CVSS 4.0 page that existed briefly; it now redirects to /4-0. */
export const CVSS4_LEGACY_PATH = '/tools/cvss-4-calculator';

export const CVSS_ANSWER =
  'CVSS, the Common Vulnerability Scoring System, rates how severe a security flaw is on a scale from 0.0 to 10.0. This calculator scores CVSS v4.0 and v3.1 vectors: choose the version with the tabs, pick a value for each metric, and get the score, the severity rating and the vector string to quote in a report or a ticket.';

export const CVSS_VIEW_TEXT: Record<CvssView, { h1: string; answer: string }> = {
  overview: { h1: 'CVSS calculator', answer: CVSS_ANSWER },
  '4-0': {
    h1: 'CVSS 4.0 calculator',
    answer:
      'CVSS 4.0 is the current version of the Common Vulnerability Scoring System, published by FIRST in November 2023. It rates how severe a security flaw is from 0.0 to 10.0. Pick a value for each of the eleven base metrics, add the optional threat, environmental and supplemental metrics, and get the score, the severity rating and the vector string.',
  },
  '3-1': {
    h1: 'CVSS 3.1 calculator',
    answer:
      'CVSS 3.1 is the version of the Common Vulnerability Scoring System that the National Vulnerability Database still uses for nearly every CVE. It rates how severe a security flaw is from 0.0 to 10.0. Pick a value for each of the eight base metrics and get the score, the severity rating and the vector string, or load the vector of any published CVE to check its score.',
  },
};

interface FaqItem {
  question: string;
  /** Answer per view; a view without an entry does not show the question. */
  answers: Partial<Record<CvssView, string>>;
}

const SAME = (text: string): Partial<Record<CvssView, string>> => ({ overview: text, '4-0': text, '3-1': text });

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is a CVSS base score?',
    answers: SAME(
      'The base score is the severity of a vulnerability on its own, from 0.0 to 10.0. It is worked out from metrics that describe how the flaw is reached and what an attacker gains. It does not consider your environment or whether the flaw is being exploited.',
    ),
  },
  {
    question: 'Which CVSS version should I use?',
    answers: SAME(
      'Use the version of the score you are working from. The National Vulnerability Database still scores nearly every CVE with v3.x, while v4.0, published by FIRST in November 2023, is the current version and more suppliers are adopting it. The two versions measure a flaw differently, so a v4.0 score can differ from the v3.1 score of the same flaw. Always quote the version together with the score.',
    ),
  },
  {
    question: 'What changed from CVSS v3.1 to v4.0?',
    answers: SAME(
      'v4.0 adds an Attack Requirements metric, splits User Interaction into Passive and Active, replaces Scope with separate impact metrics for the vulnerable system and for subsequent systems, reduces the threat metrics to Exploit Maturity, and adds supplemental metrics such as Safety and Automatable that describe a flaw without changing its score.',
    ),
  },
  {
    question: 'How is a CVSS v3.1 base score calculated?',
    answers: {
      overview:
        'Four exploitability metrics and three impact metrics are turned into sub-scores by fixed formulas, the scope metric decides how they are combined, and the result is rounded up to one decimal place. The CVSS 3.1 calculator page shows the details.',
      '3-1':
        'Four exploitability metrics (attack vector, attack complexity, privileges required, user interaction) are multiplied into an exploitability sub-score, and three impact metrics (confidentiality, integrity, availability) give an impact sub-score. The scope metric decides how the two are combined. The result is rounded up to one decimal place. A vector that starts with CVSS:3.0 is scored with the v3.0 rounding rule, and one that starts with CVSS:3.1 with the v3.1 rule.',
    },
  },
  {
    question: 'What is the difference between CVSS 3.0 and 3.1?',
    answers: {
      '3-1':
        'The base metrics and the base formulas are the same. CVSS 3.1 clarified the wording of the metric definitions and changed the rounding rule: v3.0 rounds up with a simple ceiling, which can be off by a tenth because of floating point error, while v3.1 uses a Roundup function that avoids it. This calculator applies the rule of the version in the vector.',
    },
  },
  {
    question: 'How is a CVSS v4.0 score calculated?',
    answers: {
      overview:
        'Unlike CVSS v3.x, v4.0 has no single formula. The metrics put a vector into one of 270 groups of similar vectors, and a score set by FIRST for each group is lowered by the distance to the most severe vector in the group. The CVSS 4.0 calculator page shows the details.',
      '4-0':
        'Unlike CVSS v3.x, v4.0 has no single formula. The metrics put a vector into one of 270 groups of similar vectors, called macrovectors. FIRST has set a score for each group, and the distance between your vector and the most severe vector in its group lowers the score within that group.',
    },
  },
  {
    question: 'What do CVSS-B, CVSS-BT, CVSS-BE and CVSS-BTE mean?',
    answers: {
      overview:
        'This is the v4.0 naming. The label says which metric groups went into the score: B is the base metrics only, BT adds the threat metric, BE adds the environmental metrics, and BTE uses all three.',
      '4-0':
        'This is the v4.0 naming. The label says which metric groups went into the score: B is the base metrics only, BT adds the threat metric (Exploit Maturity), BE adds the environmental metrics, and BTE uses all three. A score quoted without a label is normally the base score.',
    },
  },
  {
    question: 'What do the severity ratings mean?',
    answers: SAME(
      'For both versions, a score of 0.1 to 3.9 is Low, 4.0 to 6.9 is Medium, 7.0 to 8.9 is High and 9.0 to 10.0 is Critical. A score of 0.0 is None, which is what a vector with no impact gets.',
    ),
  },
  {
    question: 'Does a high CVSS score mean a flaw is being exploited?',
    answers: SAME(
      'No. CVSS measures how severe a flaw could be, not how likely it is to be attacked. For confirmed exploitation look at the CISA Known Exploited Vulnerabilities catalog, and for the probability of exploitation in the next 30 days look at the EPSS score.',
    ),
  },
  {
    question: 'Can I check the score of a published CVE?',
    answers: {
      overview:
        'Yes, for CVSS v3. On the CVSS 3.1 calculator, enter a CVE ID and it loads the vector that the National Vulnerability Database lists for it, then recomputes the score so you can compare it. The lookup does not cover v4.0, because WhatCyber stores the v3 vector of each CVE.',
      '4-0':
        'Not by CVE ID: WhatCyber stores the v3 vector of each CVE, so the lookup that loads a published vector is on the CVSS 3.1 calculator. Here you can paste any CVSS 4.0 vector into the vector box, for example the one a supplier lists in its advisory, and a v3 vector switches you to the 3.1 calculator.',
      '3-1':
        'Yes. Enter a CVE ID and the calculator loads the vector that the National Vulnerability Database lists for it, then recomputes the score so you can compare it with the published one. You can also paste a vector into the vector box, and a CVSS 4.0 vector switches you to the 4.0 calculator.',
    },
  },
  {
    question: 'Is the score the same as in the official calculators?',
    answers: {
      overview:
        'Yes. The v3.x scoring follows the formulas of the FIRST specification and is tested against the scores NVD publishes for tens of thousands of CVEs. The v4.0 scoring follows the FIRST reference calculator and is tested against v4.0 scores published in CVE records.',
      '4-0':
        'The v4.0 scoring follows the FIRST reference calculator and is tested against the v4.0 scores that CVE numbering authorities publish in CVE records. Published CVE scores almost never include v4.0 environmental metrics, so those could not be checked against real data; they follow the same method as the FIRST calculator.',
      '3-1':
        'The v3.x scoring uses the formulas of the FIRST specification and is tested against the scores that NVD publishes for tens of thousands of CVEs, so the base score matches the published one.',
    },
  },
];

/** The questions and answers shown (and marked up as FAQPage) on one address. */
export function faqFor(view: CvssView): { question: string; answer: string }[] {
  return FAQ_ITEMS.flatMap(({ question, answers }) => (answers[view] ? [{ question, answer: answers[view]! }] : []));
}

/** The FAQ of the overview, for callers that only need one list. */
export const CVSS_FAQ = faqFor('overview');
