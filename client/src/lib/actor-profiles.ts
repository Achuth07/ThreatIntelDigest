/**
 * Written profiles for the threat actors people search for most (WHA-20). Each summary is our own text,
 * based on the MITRE ATT&CK entry and the government advisories listed as sources. Keep to what those
 * sources say, and say who attributes what ("MITRE ATT&CK says", "CISA and partners"), since attribution
 * is a judgement made by others.
 *
 * Every profile here is a draft until `reviewedOn` is set by a person who has checked it against its sources
 * (WHA-20 asks for human review of AI-assisted drafts). Profiles without `reviewedOn` are not shown on the
 * site, see `publishedProfile` in actor-profile.ts.
 *
 * Keyed by the actor's slug. Keep this file free of React and browser APIs, the server uses it too.
 */

export interface ActorProfileSource {
  label: string;
  url: string;
}

export interface ActorProfile {
  /** One paragraph, our own words. */
  summary: string;
  /** Who is behind it, as the sources put it. */
  origin: string;
  motivation: string;
  targets: string;
  sources: ActorProfileSource[];
  /** yyyy-mm-dd when a person checked the profile against its sources. Unset = draft, not published. */
  reviewedOn?: string;
}

const mitre = (id: string, name: string): ActorProfileSource => ({ label: `MITRE ATT&CK: ${name} (${id})`, url: `https://attack.mitre.org/groups/${id}/` });
const cisa = (id: string, title: string): ActorProfileSource => ({ label: `CISA: ${title}`, url: `https://www.cisa.gov/news-events/cybersecurity-advisories/${id}` });

export const ACTOR_PROFILES: Record<string, ActorProfile> = {
  'salt-typhoon': {
    summary:
      'Salt Typhoon is the name security vendors use for a Chinese state-backed espionage operation that has broken into telecommunications and internet service providers, with MITRE ATT&CK pointing to major US providers. MITRE says it has been active since at least 2019 and that it targets and uses internet-facing network edge devices to get into victim networks. In August 2025 CISA, the FBI, the NSA and partner agencies published a joint advisory on Chinese state-sponsored activity that they say partly overlaps with what industry calls Salt Typhoon, OPERATOR PANDA, RedMike, UNC5807 and GhostEmperor. The advisory does not adopt any of those names. It describes targets in telecommunications, government, transportation, lodging and military networks in the United States, Australia, Canada, New Zealand, the United Kingdom and elsewhere, and says the actors focus on backbone, provider edge and customer edge routers.',
    origin: 'People\'s Republic of China, state-backed (per MITRE ATT&CK and the joint advisory)',
    motivation: 'Espionage',
    targets: 'Telecommunications and internet service providers (MITRE highlights major US providers); the CISA advisory also lists government, transportation, lodging and military networks in many countries',
    sources: [mitre('G1045', 'Salt Typhoon'), cisa('aa25-239a', 'Countering Chinese State-Sponsored Actors Compromise of Networks Worldwide to Feed Global Espionage System')],
    reviewedOn: '2026-11-28',
  },
  'scattered-spider': {
    summary:
      'Scattered Spider is a financially motivated cybercriminal group of native English speakers, active since at least 2022. MITRE ATT&CK says it relies heavily on social engineering: its members pose as IT and help-desk staff, get past multi-factor authentication, and then take over administrator accounts in identity and cloud services such as Okta, AWS and Microsoft 365. It began with customer-support outsourcers, telecoms and technology firms and widened in 2023 to gaming, hospitality, retail, managed service providers, manufacturing and finance. MITRE ATT&CK says the group has also deployed ransomware for profit, and CISA has published an advisory on its methods.',
    origin: 'Cybercriminal group of native English speakers (not a state actor)',
    motivation: 'Financial gain',
    targets: 'Customer-support outsourcers, telecoms and technology firms at first; later gaming, hospitality, retail, managed service providers, manufacturing and finance',
    sources: [mitre('G1015', 'Scattered Spider'), cisa('aa23-320a', 'Scattered Spider')],
    reviewedOn: '2026-11-28',
  },
  apt29: {
    summary:
      'APT29 is a Russian espionage group that the US and UK governments attribute to the Foreign Intelligence Service (SVR). MITRE ATT&CK says it has operated since at least 2008, mostly against government networks in Europe and NATO member countries, research institutes and think tanks, and that it compromised the US Democratic National Committee from the summer of 2015. In April 2021 the two governments attributed the SolarWinds supply chain compromise to the SVR, and public statements named APT29, Cozy Bear and The Dukes. Security vendors track the same or overlapping activity under many other names, including NOBELIUM, Midnight Blizzard and UNC2452.',
    origin: 'Russia, attributed to the Foreign Intelligence Service (SVR) by the US and UK governments',
    motivation: 'Espionage',
    targets: 'Government networks in Europe and NATO countries, research institutes and think tanks (MITRE); CISA also lists policy analysis organisations and IT companies',
    sources: [mitre('G0016', 'APT29'), cisa('aa21-116a', 'Russian Foreign Intelligence Service (SVR) Cyber Operations: Trends and Best Practices for Network Defenders')],
    reviewedOn: '2026-11-28',
  },
  'lazarus-group': {
    summary:
      'Lazarus Group is the best known name for North Korean state-sponsored hacking. MITRE ATT&CK attributes it to the Reconnaissance General Bureau and says it has been active since at least 2009, including the destructive 2014 attack on Sony Pictures. Public reporting uses the name as an umbrella for several North Korean units that share people, infrastructure and malware, so it is hard to pin a given operation on one team with confidence. The activity covers espionage, destructive attacks and theft for money. In April 2022 CISA, the FBI and the US Treasury warned that a North Korean group commonly tracked as Lazarus Group, APT38, BlueNoroff and Stardust Chollima had been stealing cryptocurrency since at least 2020.',
    origin: 'North Korea, attributed to the Reconnaissance General Bureau (RGB)',
    motivation: 'Espionage, destruction and financial gain',
    targets: 'Entertainment (Sony Pictures, 2014) and cryptocurrency and blockchain companies, among others',
    sources: [mitre('G0032', 'Lazarus Group'), cisa('aa22-108a', 'TraderTraitor: North Korean State-Sponsored APT Targets Blockchain Companies')],
    reviewedOn: '2026-11-28',
  },
  akira: {
    summary:
      'Akira is a ransomware operation that has been active since at least March 2023. MITRE ATT&CK says its operators get in with stolen credentials on remote access services such as VPNs that rely on a single password, then move through the network with widely available tools. It practises double extortion: it copies data out before encrypting, and threatens to publish it if the ransom is not paid. Its encryptor has versions for Windows and for VMware ESXi hypervisors, and analysts have found overlaps with the Conti ransomware. CISA and partners have published a #StopRansomware advisory on it.',
    origin: 'Ransomware operation; no country attribution in MITRE ATT&CK',
    motivation: 'Financial gain (extortion)',
    targets: 'Windows systems and VMware ESXi hypervisors, reached through remote access services',
    sources: [mitre('G1024', 'Akira'), cisa('aa24-109a', '#StopRansomware: Akira Ransomware')],
    reviewedOn: '2026-11-28',
  },
  fin7: {
    summary:
      'FIN7 is a financially motivated criminal group active since 2013. For years it went after US retail, restaurant and hospitality businesses, often with point-of-sale malware, and MITRE ATT&CK notes that part of the group ran out of a front company called Combi Security. Since 2020 it has moved to "big game hunting" of larger victims, using the REvil ransomware and its own ransomware-as-a-service, Darkside. MITRE says FIN7 may be linked to the Carbanak group but that several groups use Carbanak, so they are tracked separately.',
    origin: 'Financially motivated criminal group; part of it operated through the front company Combi Security',
    motivation: 'Financial gain',
    targets: 'Retail, restaurants, hospitality, software, consulting, financial services, medical equipment, cloud services, media, food and drink, transport, pharmaceuticals and utilities, mainly in the United States',
    sources: [mitre('G0046', 'FIN7')],
    reviewedOn: '2026-11-28',
  },

  // ---- Top 30, batch 2 (WHA-20). Drafts: no reviewedOn yet, so they are not on production. ----

  apt28: {
    summary:
      "APT28 is a Russian military intelligence hacking group. MITRE ATT&CK attributes it to the GRU's 85th Main Special Service Center, military unit 26165, and says it has been active since at least 2004. MITRE reports that it compromised the Hillary Clinton campaign and Democratic party committees in 2016 in an attempt to interfere with the US presidential election, and that in 2018 the US indicted five unit 26165 officers over operations between 2014 and 2018 against bodies including the World Anti-Doping Agency, the US Anti-Doping Agency, a US nuclear facility and the OPCW. A CISA advisory says unit 26165 has targeted Western logistics and technology companies since 2022, including those involved in moving aid to Ukraine.",
    origin: 'Russia, attributed to GRU military unit 26165 (per MITRE ATT&CK and CISA)',
    motivation: 'Espionage and political interference',
    targets: 'Political organisations, anti-doping and chemical weapons bodies and a US nuclear facility (MITRE); Western logistics and technology companies (CISA)',
    sources: [mitre('G0007', 'APT28'), cisa('aa25-141a', 'Russian GRU Targeting Western Logistics Entities and Technology Companies')],
  },
  'sandworm-team': {
    summary:
      "Sandworm Team is a destructive hacking group that MITRE ATT&CK attributes to the GRU's Main Center for Special Technologies, military unit 74455, and says has been active since at least 2009. In October 2020 the US indicted six unit 74455 officers over the 2015 and 2016 attacks on Ukrainian electrical companies and government bodies, the 2017 worldwide NotPetya attack, the targeting of the 2017 French presidential campaign, the 2018 Olympic Destroyer attack on the Winter Olympics, a 2018 operation against the OPCW, and attacks on Georgia in 2018 and 2019. MITRE notes that some of these operations were carried out with help from unit 26165, which is also known as APT28.",
    origin: 'Russia, attributed to GRU military unit 74455 (per MITRE ATT&CK and the US indictment)',
    motivation: 'Destructive and disruptive attacks',
    targets: 'Ukrainian energy companies and government bodies, victims of NotPetya worldwide, a French presidential campaign, the 2018 Winter Olympics, the OPCW and Georgia',
    sources: [
      mitre('G0034', 'Sandworm Team'),
      { label: 'US Department of Justice: six Russian GRU officers charged over destructive malware and other attacks (October 2020)', url: 'https://www.justice.gov/opa/pr/six-russian-gru-officers-charged-connection-worldwide-deployment-destructive-malware-and' },
    ],
  },
  apt41: {
    summary:
      "APT41 is a threat group that researchers assess to be a Chinese state-sponsored espionage group that also runs financially motivated operations. MITRE ATT&CK says it has been active since at least 2012 and has targeted healthcare, telecoms, technology, finance, education, retail and video game companies in 14 countries, using a wide range of malware and tools. MITRE says it overlaps at least partly with public reporting on BARIUM and Winnti Group. Vendors differ on when the activity began and on how the names map to each other, so treat the start year and the aliases as approximate.",
    origin: 'China, assessed by researchers to be state-sponsored (per MITRE ATT&CK)',
    motivation: 'Espionage and financial gain',
    targets: 'Healthcare, telecoms, technology, finance, education, retail and video games, in 14 countries',
    sources: [
      mitre('G0096', 'APT41'),
      { label: 'Mandiant (Google Cloud): APT41, a dual espionage and cyber crime operation', url: 'https://cloud.google.com/blog/topics/threat-intelligence/apt41-dual-espionage-and-cyber-crime-operation' },
    ],
  },
  'volt-typhoon': {
    summary:
      "Volt Typhoon is a Chinese state-sponsored actor that MITRE ATT&CK says has been active since at least 2021, mainly against critical infrastructure organisations in the US and its territories, including Guam. In a February 2024 advisory, CISA, the NSA and the FBI assessed that it is seeking to pre-position itself on IT networks so it could carry out disruptive or destructive attacks against US critical infrastructure in a crisis. MITRE says the group puts stealth first, using web shells, built-in \"living off the land\" tools, hands-on-keyboard activity and stolen credentials, and that it has used compromised small-office routers to relay its traffic.",
    origin: 'People\'s Republic of China, state-sponsored (per MITRE ATT&CK, CISA, the NSA and the FBI)',
    motivation: 'Pre-positioning for possible disruptive or destructive attacks',
    targets: 'Critical infrastructure organisations in the United States and its territories, including Guam',
    sources: [mitre('G1017', 'Volt Typhoon'), cisa('aa24-038a', 'PRC State-Sponsored Actors Compromise and Maintain Persistent Access to U.S. Critical Infrastructure')],
  },
  kimsuky: {
    summary:
      "Kimsuky is a North Korea-based cyber espionage group that MITRE ATT&CK says has been active since at least 2012. It began with South Korean government agencies, think tanks and subject-matter experts, and widened to the United Nations and to government, education, business services and manufacturing organisations in the United States, Japan, Russia and Europe. Its collection focuses on foreign policy and national security issues tied to the Korean Peninsula, nuclear policy and sanctions. MITRE assesses that it was responsible for the 2014 Korea Hydro & Nuclear Power compromise, and notes that its operations have overlapped with those of other North Korean groups. CISA, the FBI and US Cyber Command published an advisory on Kimsuky in October 2020.",
    origin: 'North Korea (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'South Korean government agencies, think tanks and experts at first; later the UN and government, education, business services and manufacturing organisations in the US, Japan, Russia and Europe',
    sources: [mitre('G0094', 'Kimsuky'), cisa('aa20-301a', 'North Korean Advanced Persistent Threat Focus: Kimsuky')],
  },
  turla: {
    summary:
      "Turla is a Russian cyber espionage group that MITRE ATT&CK attributes to the Federal Security Service (FSB). MITRE says it has compromised victims in more than 50 countries since at least 2004, across government, embassies, the military, education, research and pharmaceuticals, and that it is known for watering-hole and spearphishing campaigns and for in-house tools such as Uroburos. In May 2023 CISA and international partners published an advisory on the \"Snake\" malware, attributing Snake operations to a known unit within FSB Center 16 that also runs the wider Turla toolset.",
    origin: 'Russia, attributed to the Federal Security Service (FSB) (per MITRE ATT&CK); CISA attributes Snake to a unit of FSB Center 16',
    motivation: 'Espionage',
    targets: 'Government, embassies, military, education, research and pharmaceutical organisations in more than 50 countries',
    sources: [mitre('G0010', 'Turla'), cisa('aa23-129a', 'Hunting Russian Intelligence "Snake" Malware')],
  },
  muddywater: {
    summary:
      "MuddyWater is a cyber espionage group that MITRE ATT&CK assesses to be a subordinate element of Iran's Ministry of Intelligence and Security (MOIS). MITRE says that since at least 2017 it has targeted government and private organisations in telecommunications, local government, finance, defence and oil and gas, in the Middle East, Asia, Africa, Europe and North America. In February 2022 CISA, the FBI, US Cyber Command, the NSA and the UK's NCSC published a joint advisory on its activity, which dates its campaigns for MOIS objectives to approximately 2018.",
    origin: "Iran, a subordinate element of the Ministry of Intelligence and Security (per MITRE ATT&CK and CISA)",
    motivation: 'Espionage',
    targets: 'Government and private organisations in telecommunications, local government, finance, defence and oil and gas, across the Middle East, Asia, Africa, Europe and North America',
    sources: [mitre('G0069', 'MuddyWater'), cisa('aa22-055a', 'Iranian Government-Sponsored Actors Conduct Cyber Operations Against Global Government and Commercial Networks')],
  },
  oilrig: {
    summary:
      "OilRig is a suspected Iranian threat group that MITRE ATT&CK says has targeted Middle Eastern and international victims since at least 2014, across the financial, government, energy, chemical and telecommunications sectors. MITRE says it appears to carry out supply chain attacks, using the trust between organisations to reach its main targets, and that it works for the Iranian government, judging by infrastructure that refers to Iran, its use of Iranian infrastructure and targeting that matches state interests. Security vendors also track the same activity as APT34 and Helix Kitten.",
    origin: 'Iran, suspected, working for the Iranian government (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Financial, government, energy, chemical and telecommunications organisations in the Middle East and elsewhere',
    sources: [mitre('G0049', 'OilRig')],
  },
  'wizard-spider': {
    summary:
      "Wizard Spider is a Russia-based, financially motivated group that MITRE ATT&CK says was originally known for creating and deploying the TrickBot malware, and has been active since at least 2016. MITRE says it has a diverse set of tools and has run ransomware campaigns against organisations ranging from major corporations to hospitals. The malware MITRE links to it includes the Conti and Diavol ransomware and the Bazar and Anchor malware. Other vendors also track it as UNC1878, FIN12 and GOLD BLACKBURN.",
    origin: 'Russia-based criminal group (per MITRE ATT&CK)',
    motivation: 'Financial gain',
    targets: 'Organisations ranging from major corporations to hospitals',
    sources: [mitre('G0102', 'Wizard Spider')],
  },
  apt33: {
    summary:
      "APT33 is a suspected Iranian threat group that MITRE ATT&CK says has carried out operations since at least 2013. It has targeted organisations across industries in the United States, Saudi Arabia and South Korea, with a particular interest in the aviation and energy sectors. Vendors use other names for the same or overlapping activity, including HOLMIUM, Elfin and Peach Sandstorm. Microsoft has reported password-spray campaigns that it attributes to Peach Sandstorm against organisations in many sectors since February 2023.",
    origin: 'Iran, suspected (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Organisations in the United States, Saudi Arabia and South Korea, especially aviation and energy',
    sources: [
      mitre('G0064', 'APT33'),
      { label: 'Microsoft: Peach Sandstorm password spray campaigns enable intelligence collection at high value targets', url: 'https://www.microsoft.com/en-us/security/blog/2023/09/14/peach-sandstorm-password-spray-campaigns-enable-intelligence-collection-at-high-value-targets/' },
    ],
  },
  apt32: {
    summary:
      "APT32 is a suspected Vietnam-based threat group that MITRE ATT&CK says has been active since at least 2014. It has targeted private-sector industries as well as foreign governments, dissidents and journalists, with a strong focus on Southeast Asian countries such as Vietnam, the Philippines, Laos and Cambodia, and has made extensive use of strategic web compromises to infect victims. It is also tracked as OceanLotus, SeaLotus, APT-C-00, Canvas Cyclone and BISMUTH. Some researchers date its activity earlier than 2014.",
    origin: 'Vietnam, suspected (per MITRE ATT&CK)',
    motivation: 'Espionage (suspected, judging by its targets)',
    targets: 'Private-sector industries, foreign governments, dissidents and journalists, mainly in Southeast Asia',
    sources: [mitre('G0050', 'APT32')],
  },
  apt37: {
    summary:
      "APT37 is a North Korean state-sponsored cyber espionage group that MITRE ATT&CK says has been active since at least 2012. It has targeted victims mainly in South Korea, and also in Japan, Vietnam, Russia, Nepal, China, India, Romania, Kuwait and elsewhere in the Middle East. MITRE notes that North Korean group definitions overlap significantly, and that some researchers report all North Korean state-sponsored cyber activity under the name Lazarus Group instead. Other names for it include ScarCruft, Reaper, InkySquid and Group123.",
    origin: 'North Korea, state-sponsored (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Mainly South Korea; also Japan, Vietnam, Russia, Nepal, China, India, Romania, Kuwait and the wider Middle East',
    sources: [mitre('G0067', 'APT37')],
  },
  apt38: {
    summary:
      "APT38 is a North Korean state-sponsored group that specialises in financial cyber operations. MITRE ATT&CK attributes it to the Reconnaissance General Bureau and says it has been active since at least 2014, targeting banks, financial institutions, casinos, cryptocurrency exchanges, SWIFT endpoints and ATMs in at least 38 countries. Its operations include the 2016 Bank of Bangladesh heist, along with software supply chain compromises and destructive attacks. In 2020 CISA, the US Treasury, the FBI and US Cyber Command published an advisory on an ATM cash-out scheme they call FASTCash 2.0, run by actors the US government calls BeagleBoyz, who overlap to varying degrees with groups tracked as Lazarus, APT38, Bluenoroff and Stardust Chollima. MITRE notes that some researchers track all North Korean activity as Lazarus Group.",
    origin: 'North Korea, attributed to the Reconnaissance General Bureau (per MITRE ATT&CK)',
    motivation: 'Financial gain',
    targets: 'Banks, financial institutions, casinos, cryptocurrency exchanges, SWIFT endpoints and ATMs in at least 38 countries',
    sources: [mitre('G0082', 'APT38'), cisa('aa20-239a', "FASTCash 2.0: North Korea's BeagleBoyz Robbing Banks")],
  },
  menupass: {
    summary:
      "menuPass is a threat group that MITRE ATT&CK says has been active since at least 2006. MITRE says individual members are known to have acted in association with the Chinese Ministry of State Security's Tianjin State Security Bureau and to have worked for the Huaying Haitai Science and Technology Development Company. It has targeted healthcare, defence, aerospace, finance, maritime, biotechnology, energy and government sectors worldwide, with an emphasis on Japanese organisations, and in 2016 and 2017 it targeted managed IT service providers, manufacturing and mining companies and a university. It is also tracked as APT10, Stone Panda, Cicada and POTASSIUM.",
    origin: "China; members linked to the Ministry of State Security's Tianjin State Security Bureau (per MITRE ATT&CK)",
    motivation: 'Espionage',
    targets: 'Healthcare, defence, aerospace, finance, maritime, biotechnology, energy and government worldwide, especially Japan; managed IT service providers',
    sources: [mitre('G0045', 'menuPass')],
  },
  'mustang-panda': {
    summary:
      "Mustang Panda is a China-based cyber espionage actor that MITRE ATT&CK says has been operating since at least 2012. MITRE says it uses tailored phishing lures and decoy documents to deliver malicious payloads, and that it has targeted government, diplomatic and non-governmental organisations, including think tanks, religious institutions and research entities, across the United States, Europe and Asia, with notable activity in Russia, Mongolia, Myanmar, Pakistan and Vietnam. Vendors also track it as TA416, RedDelta and Earth Preta, among other names. Sources differ on when the activity began.",
    origin: 'China-based (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Government, diplomatic and non-governmental organisations, think tanks, religious institutions and research bodies in the US, Europe and Asia',
    sources: [mitre('G0129', 'Mustang Panda')],
  },
  'magic-hound': {
    summary:
      "Magic Hound is an Iranian-sponsored threat group that MITRE ATT&CK says runs long-term, resource-intensive cyber espionage, likely on behalf of the Islamic Revolutionary Guard Corps, and has been active since at least 2014. It has used complex social engineering campaigns against European, US and Middle Eastern government and military personnel, academics, journalists and organisations such as the World Health Organization. It is also tracked as Charming Kitten, APT35, TA453 and Mint Sandstorm.",
    origin: 'Iran, sponsored, likely on behalf of the Islamic Revolutionary Guard Corps (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Government and military personnel, academics, journalists and organisations such as the WHO, in Europe, the US and the Middle East',
    sources: [mitre('G0059', 'Magic Hound')],
  },
  'star-blizzard': {
    summary:
      "Star Blizzard is a Russia-based cyber espionage and influence group that MITRE ATT&CK says has been active since at least 2019 and that aligns closely with Russian state interests. Its campaigns have involved persistent phishing and credential theft against academic, defence, government, NGO and think tank organisations in NATO countries, particularly the US and the UK. In December 2023 the UK's NCSC, CISA, the FBI and partner agencies published a joint advisory that assesses Star Blizzard to be almost certainly subordinate to the Russian Federal Security Service (FSB) Centre 18. It was formerly tracked as SEABORGIUM and is also known as COLDRIVER, Callisto Group and TA446.",
    origin: 'Russia, assessed to be subordinate to FSB Centre 18 (per the December 2023 joint advisory)',
    motivation: 'Espionage and influence',
    targets: 'Academia, defence, government, NGOs and think tanks in NATO countries, especially the US and the UK',
    sources: [mitre('G1033', 'Star Blizzard'), cisa('aa23-341a', 'Russian FSB Cyber Actor Star Blizzard Continues Worldwide Spearphishing Campaigns')],
  },
  'inc-ransom': {
    summary:
      "INC Ransom is a ransomware and data-extortion group associated with INC Ransomware, which MITRE ATT&CK says has been active since at least July 2023. It has targeted organisations worldwide, most often in the industrial, healthcare and education sectors in the US and Europe. Secureworks tracks it as GOLD IONIC. The tools MITRE links to its intrusions include AdFind, PsExec, Rclone and Tor.",
    origin: 'Ransomware and data-extortion group; no country attribution in MITRE ATT&CK',
    motivation: 'Financial gain (extortion)',
    targets: 'Industrial, healthcare and education organisations in the US and Europe, among others',
    sources: [mitre('G1032', 'INC Ransom')],
  },
  play: {
    summary:
      "Play, also called Playcrypt after its ransomware, is a ransomware group that MITRE ATT&CK says has been active since at least 2022, targeting business, government, critical infrastructure, healthcare and media organisations in North America, South America and Europe. It uses double extortion, encrypting systems after copying data out, and security researchers presume it operates as a closed group. CISA, the FBI and Australia's ACSC published a #StopRansomware advisory on Play in December 2023 and updated it in June 2025. The advisory describes initial access through valid accounts and through public-facing applications, including known FortiOS and Microsoft Exchange flaws.",
    origin: 'Ransomware group, presumed to operate as a closed group; no country attribution in MITRE ATT&CK',
    motivation: 'Financial gain (extortion)',
    targets: 'Business, government, critical infrastructure, healthcare and media organisations in North America, South America and Europe',
    sources: [mitre('G1040', 'Play'), cisa('aa23-352a', '#StopRansomware: Play Ransomware')],
  },
  shinyhunters: {
    summary:
      "ShinyHunters is a cybercriminal collective that MITRE ATT&CK says has been active since at least 2019 under the ShinyCorp persona. It has targeted many industries and regions, collecting legitimate credentials and personal data to resell or to extort victims. MITRE associates it with the wider online community known as The Com, whose members have also included Scattered Spider and LAPSUS$, and notes that public reporting uses names such as \"Scattered Lapsus Hunters\" for operations its members have reportedly run with other groups. It is also tracked as UNC6240 and Bling Libra.",
    origin: 'Cybercriminal collective linked to The Com (per MITRE ATT&CK)',
    motivation: 'Financial gain (resale and extortion)',
    targets: 'Many industries and regions; credentials and personal data',
    sources: [mitre('G1057', 'ShinyHunters')],
  },
  lapsus: {
    summary:
      "LAPSUS$ is a cybercriminal group that MITRE ATT&CK says has been active since at least mid-2021 and that specialises in large-scale social engineering and extortion, including destructive attacks without ransomware. It has targeted organisations globally in government, manufacturing, higher education, energy, healthcare, technology, telecommunications and media. Microsoft, which tracked it as DEV-0537 (now Strawberry Tempest), described a model of extortion and destruction without ransomware payloads, and reported help-desk impersonation used to get privileged account credentials reset.",
    origin: 'Cybercriminal group (per MITRE ATT&CK)',
    motivation: 'Financial gain (extortion) and destruction',
    targets: 'Government, manufacturing, higher education, energy, healthcare, technology, telecommunications and media organisations worldwide',
    sources: [
      mitre('G1004', 'LAPSUS$'),
      { label: 'Microsoft: DEV-0537 criminal actor targeting organizations for data exfiltration and destruction', url: 'https://www.microsoft.com/en-us/security/blog/2022/03/22/dev-0537-criminal-actor-targeting-organizations-for-data-exfiltration-and-destruction/' },
    ],
  },
  'gamaredon-group': {
    summary:
      "Gamaredon Group is a suspected Russian cyber espionage group that MITRE ATT&CK says has targeted military, law enforcement, judiciary, non-profit and non-governmental organisations in Ukraine since at least 2013. Its name comes from a misspelling of \"Armageddon\" found in early campaigns. In November 2021 the Ukrainian government publicly attributed it to Russia's FSB Center 18, an assessment that MITRE says multiple independent security researchers later supported.",
    origin: "Russia, attributed by the Ukrainian government to the FSB's Center 18 (per MITRE ATT&CK)",
    motivation: 'Espionage',
    targets: 'Military, law enforcement, judiciary, non-profit and non-governmental organisations in Ukraine',
    sources: [mitre('G0047', 'Gamaredon Group')],
  },
  'threat-group-3390': {
    summary:
      "Threat Group-3390 is a Chinese threat group that MITRE ATT&CK says has been active since at least 2010 and has made extensive use of strategic web compromises to infect victims. It has targeted aerospace, government, defence, technology, energy, manufacturing and gambling organisations. It is also known as APT27, Emissary Panda, LuckyMouse and BRONZE UNION. Some sources date the activity slightly earlier than 2010.",
    origin: 'China (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Aerospace, government, defence, technology, energy, manufacturing and gambling organisations',
    sources: [mitre('G0027', 'Threat Group-3390')],
  },
  dragonfly: {
    summary:
      "Dragonfly is a cyber espionage group that MITRE ATT&CK attributes to Russia's FSB Center 16 and says has been active since at least 2010. It has targeted defence and aviation companies, government entities, companies related to industrial control systems and critical infrastructure sectors worldwide, through supply chain, spearphishing and drive-by compromise attacks. It is also tracked as Energetic Bear, Berserk Bear and Crouching Yeti.",
    origin: 'Russia, attributed to FSB Center 16 (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Defence and aviation companies, government entities, industrial control system companies and critical infrastructure worldwide',
    sources: [mitre('G0035', 'Dragonfly')],
  },
};
