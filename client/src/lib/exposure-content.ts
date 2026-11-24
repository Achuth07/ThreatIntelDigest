/**
 * Text of the KEV exposure checker page (WHA-29): intro, FAQ and page meta. One source for the page,
 * the server-rendered copy (server/services/page-body.ts) and the FAQPage structured data.
 * Keep this file free of React and browser APIs, the server uses it too.
 */

export const EXPOSURE_TOOL_PATH = '/tools/kev-exposure-checker';

export const EXPOSURE_META = {
  title: 'KEV Exposure Checker: Which Exploited CVEs Hit Your Stack | WhatCyber',
  description:
    'Pick the vendors and products you run and see every CISA Known Exploited Vulnerability that affects them, with CISA due dates, ransomware use and scores. Shareable and exportable.',
  keywords: 'KEV exposure checker, CISA KEV by vendor, known exploited vulnerabilities by product, KEV due date, patch priority',
};

export const EXPOSURE_ANSWER =
  'The CISA Known Exploited Vulnerabilities (KEV) catalog lists the flaws that attackers are already using. Add the vendors and products you run, and this checker shows every KEV entry that affects them, sorted by the CISA due date, so you can see what to patch first.';

export const EXPOSURE_FAQ: { question: string; answer: string }[] = [
  {
    question: 'What does the exposure checker show?',
    answer:
      'For each vendor or product you add, it lists the CVEs in the CISA KEV catalog: the date CISA added each one, the due date CISA gave US federal agencies to fix it, whether it is known to be used in ransomware campaigns, and its CVSS v3 and EPSS scores. A summary at the top counts the entries that are past due, due soon, new or tied to ransomware.',
  },
  {
    question: 'Does it tell me which flaws are still open on my systems?',
    answer:
      'No. It knows what you run only by the names you pick, not which versions or patches you have installed. It shows every exploited flaw ever listed for that vendor or product, including old ones that your patch level may already cover. Check each entry against your own versions. CISA never removes an entry once it is added, so the list only grows.',
  },
  {
    question: 'What does the due date mean?',
    answer:
      'It is the deadline CISA set for US federal civilian agencies to apply the required action under Binding Operational Directive 22-01. Other organizations are not bound by it, but it is a useful sign of how urgent CISA considers the fix. A due date that has passed means the deadline is over, not that the flaw has been fixed.',
  },
  {
    question: 'How do vendors and products map to the KEV catalog?',
    answer:
      'The names are the ones CISA uses in the catalog, for example Microsoft and Windows, or Cisco and IOS XE. A vendor on its own includes all of its products. A flaw that CISA lists under a broader product name, such as Multiple Products, appears under that name, so add it as well if you run a product from the vendor.',
  },
  {
    question: 'Can I share or export the result?',
    answer:
      'Yes. The address of the page holds the vendors and products you picked, so you can send it to a colleague or save it, and the Export button downloads the table as a CSV file. Nothing you pick is stored on WhatCyber.',
  },
  {
    question: 'How is KEV different from CVSS and EPSS?',
    answer:
      'CVSS rates how severe a flaw could be, EPSS estimates the probability that it will be exploited in the next 30 days, and KEV confirms that exploitation has already been seen. A KEV entry is the strongest signal, which is why many teams patch KEV entries first and use CVSS and EPSS to order the rest.',
  },
  {
    question: 'How often is the data updated?',
    answer: 'WhatCyber syncs the CISA catalog daily and takes the CVSS and EPSS scores from the National Vulnerability Database and FIRST.',
  },
];
