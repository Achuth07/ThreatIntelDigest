/**
 * Explanatory text for the CISA KEV hub (WHA-19). One source for the page the visitor sees, the
 * server-rendered copy (server/services/page-body.ts) and the FAQPage structured data, so all three
 * say the same thing. Keep this file free of React and browser APIs, the server uses it too.
 */

/** The answer-first paragraph under the page heading. */
export const KEV_ANSWER =
  'The CISA Known Exploited Vulnerabilities (KEV) catalog is the list of security flaws that the US Cybersecurity and Infrastructure Security Agency (CISA) has confirmed are being exploited by attackers in the wild. Each entry is a CVE with a due date by which US federal agencies must fix it, which also makes the catalog a practical patch-first list for any organization.';

export const KEV_FAQ: { question: string; answer: string }[] = [
  {
    question: 'What is the CISA KEV catalog?',
    answer: KEV_ANSWER,
  },
  {
    question: 'How does a vulnerability get added to the KEV catalog?',
    answer:
      "Under CISA's Binding Operational Directive 22-01, a CVE is added when it has a CVE ID, there is reliable evidence that it is being exploited in the wild, and there is clear guidance to remediate it, such as a vendor patch or a mitigation.",
  },
  {
    question: 'Who has to patch KEV vulnerabilities?',
    answer:
      'US federal civilian agencies must remediate KEV entries by the due date set for each one. Other organizations are not bound by the directive, but CISA urges all of them to use the catalog to decide what to patch first.',
  },
  {
    question: 'What does the due date on a KEV entry mean?',
    answer:
      'It is the deadline CISA sets for federal agencies to apply the required action for that vulnerability. For everyone else it is a useful guide to how urgent the fix is.',
  },
  {
    question: 'What does known ransomware campaign use mean?',
    answer:
      'Known means CISA is aware that the vulnerability has been used in ransomware campaigns. Unknown means CISA has no such information, which does not mean the flaw is safe to leave unpatched.',
  },
  {
    question: 'How is KEV different from CVSS and EPSS?',
    answer:
      'CVSS rates how severe a flaw could be, EPSS estimates the probability that it will be exploited in the next 30 days, and KEV confirms that exploitation has already been observed. Many teams patch KEV entries first and use CVSS and EPSS to order the rest.',
  },
  {
    question: 'How often does WhatCyber update the KEV catalog?',
    answer:
      "WhatCyber syncs the CISA catalog daily. Each entry links to its CVE page with CVSS and EPSS scores, affected products and related news.",
  },
];
