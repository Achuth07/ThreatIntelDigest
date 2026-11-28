// A small, hand-written data set covering the cases the routes must get right. Scores are text,
// as in production, so '10.0' must still sort above '9.9'.

export const ADMIN = { id: 1, email: 'admin@test.local' };
export const OTHER_USER = { id: 2, email: 'member@test.local' };
export const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
export const ARTICLE_ID = '22222222-2222-4222-8222-222222222222';

export const SEED_SQL = `
INSERT INTO users (id, name, email) VALUES
  (1, 'Admin', '${ADMIN.email}'),
  (2, 'Member', '${OTHER_USER.email}');

INSERT INTO vulnerabilities (id, published_date, last_modified_date, vuln_status, cvss_v3_score, cvss_v3_severity,
  cvss_v2_score, cvss_v2_severity, cvss_vector, weaknesses, vendors, search_vector, epss_score, epss_percentile) VALUES
  -- NVD 3.1 score of 10, in KEV, with the same CWE listed twice (NVD and the CNA).
  ('CVE-2024-0001', '2024-03-01T10:00:00Z', '2024-06-01T10:00:00Z', 'Analyzed', '10.0', 'CRITICAL', NULL, NULL,
   'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', ARRAY['CWE-287','CWE-287'], '["fortinet"]',
   'CVE-2024-0001 An authentication bypass in FortiOS lets remote attackers gain admin access. fortinet fortios', 0.94000, 0.99900),
  -- 9.9 as text sorts above '10.0'; numeric sorting must not.
  ('CVE-2024-0002', '2024-04-01T10:00:00Z', '2024-04-02T10:00:00Z', 'Analyzed', '9.9', 'CRITICAL', NULL, NULL,
   'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H', ARRAY['CWE-78'], '["apache"]',
   'CVE-2024-0002 Command injection in Apache HTTP Server mod_example. apache http_server', 0.50000, 0.97000),
  -- No NVD score yet: CISA's 3.1 score (source adp) is used.
  ('CVE-2024-0003', '2024-05-01T10:00:00Z', '2024-05-03T10:00:00Z', 'Awaiting Analysis', NULL, NULL, NULL, NULL,
   NULL, ARRAY['CWE-89'], '["apache"]',
   'CVE-2024-0003 SQL injection in the Apache HTTP Server admin page. apache http_server', 0.01000, 0.40000),
  -- Only a CNA CVSS 4.0 score.
  ('CVE-2024-0004', '2024-06-01T10:00:00Z', '2024-06-05T10:00:00Z', 'Received', NULL, NULL, NULL, NULL,
   NULL, '{}', '[]', 'CVE-2024-0004 Cross-site scripting in a widget.', NULL, NULL),
  -- Old CVE with only CVSS 2.0.
  ('CVE-2023-0005', '2023-01-01T10:00:00Z', '2023-01-02T10:00:00Z', 'Analyzed', NULL, NULL, '5.0', 'MEDIUM',
   NULL, ARRAY['CWE-79'], '["nagios"]', 'CVE-2023-0005 Runs commands as the nagios user. nagios nagios_xi', 0.00100, 0.10000),
  -- No score of any kind.
  ('CVE-2024-0006', '2024-07-01T10:00:00Z', '2024-07-01T10:00:00Z', 'Awaiting Analysis', NULL, NULL, NULL, NULL,
   NULL, '{}', '[]', 'CVE-2024-0006 Details withheld.', NULL, NULL);

INSERT INTO cve_scores (cve_id, cvss3_score, cvss3_severity, cvss3_vector, cvss3_source, cvss4_score, cvss4_severity, cvss4_vector, cvss4_source,
  ssvc_exploitation, ssvc_automatable, ssvc_technical_impact, ssvc_timestamp) VALUES
  ('CVE-2024-0001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 'yes', 'total', '2024-03-02T00:00:00Z'),
  ('CVE-2024-0003', 7.5, 'HIGH', 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', 'adp', NULL, NULL, NULL, NULL, 'none', 'no', 'partial', '2024-05-02T00:00:00Z'),
  ('CVE-2024-0004', NULL, NULL, NULL, NULL, 6.1, 'MEDIUM', 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N', 'cna', NULL, NULL, NULL, NULL);

INSERT INTO known_exploited_vulnerabilities (cve_id, vendor_project, product, vulnerability_name, date_added, short_description,
  required_action, due_date, known_ransomware_campaign_use, notes) VALUES
  ('CVE-2024-0001', 'Fortinet', 'FortiOS', 'Fortinet FortiOS Authentication Bypass Vulnerability', '2024-03-05', 'FortiOS has an authentication bypass.',
   'Apply mitigations per vendor instructions.', '2024-03-26', 'Known', '');

INSERT INTO vendors (id, slug, display_name) VALUES (1, 'fortinet', 'Fortinet'), (2, 'apache', 'Apache'), (3, 'nagios', 'Nagios');
INSERT INTO products (id, vendor_id, slug, display_name) VALUES (1, 1, 'fortios', 'FortiOS'), (2, 2, 'http_server', 'HTTP Server'), (3, 3, 'nagios_xi', 'Nagios XI');
INSERT INTO cve_products (cve_id, product_ids) VALUES ('CVE-2024-0001', '{1}'), ('CVE-2024-0002', '{2}'), ('CVE-2024-0003', '{2}'), ('CVE-2023-0005', '{3}');

INSERT INTO article_cves (cve_id, article_url, article_id, title, source, published_at, found_in) VALUES
  ('CVE-2024-0001', 'https://news.example/fortios-exploited', '${ARTICLE_ID}', 'FortiOS bug exploited', 'Example News', '2024-03-04T08:00:00', 'title'),
  ('CVE-2024-0001', 'https://news.example/gone', NULL, 'Older coverage', 'Example News', '2024-03-02T08:00:00', 'summary');

INSERT INTO threat_groups (id, stix_id, name, slug, attack_id) VALUES ('${ACTOR_ID}', 'intrusion-set--test', 'Test Panda', 'test-panda', 'G9999');
INSERT INTO actor_cves (threat_group_id, cve_id, source, confidence, evidence, evidence_url) VALUES
  ('${ACTOR_ID}', 'CVE-2024-0001', 'news', 'low', 'Named in a news report', 'https://news.example/fortios-exploited'),
  ('${ACTOR_ID}', 'CVE-2024-0001', 'attack', 'high', 'Test Panda exploited [CVE-2024-0001](https://nvd.example)', NULL);
`;

export const SEEDED_CVE_COUNT = 6;
