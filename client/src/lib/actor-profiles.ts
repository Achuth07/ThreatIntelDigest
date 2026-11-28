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
      'Salt Typhoon is the name given to a Chinese state-backed espionage operation that has broken into the networks of telecommunications and internet service providers, mainly in the United States. MITRE ATT&CK says it has been active since at least 2019 and that it targets and uses internet-facing network edge devices to get into victim networks. CISA and partner agencies published a joint advisory on the campaign in August 2025. Other security vendors track overlapping activity under names such as OPERATOR PANDA, RedMike, GhostEmperor and UNC5807, and MITRE notes that these resemble Salt Typhoon rather than being proven to be the same group.',
    origin: 'People\'s Republic of China, state-backed (per MITRE ATT&CK)',
    motivation: 'Espionage',
    targets: 'Telecommunications and internet service providers, mainly in the United States',
    sources: [mitre('G1045', 'Salt Typhoon'), cisa('aa25-239a', 'Countering Chinese State-Sponsored Actors Compromise of Networks Worldwide to Feed Global Espionage System')],
  },
  'scattered-spider': {
    summary:
      'Scattered Spider is a financially motivated cybercriminal group of native English speakers, active since at least 2022. It is known for social engineering rather than technical exploits: its members pose as IT and help-desk staff, get past multi-factor authentication, and then take over administrator accounts in identity and cloud services such as Okta, AWS and Microsoft 365. It began with customer-support outsourcers, telecoms and technology firms and widened in 2023 to gaming, hospitality, retail, managed service providers, manufacturing and finance. MITRE ATT&CK says the group has also deployed ransomware for profit, and CISA has published an advisory on its methods.',
    origin: 'Cybercriminal group of native English speakers (not a state actor)',
    motivation: 'Financial gain',
    targets: 'Customer-support outsourcers, telecoms and technology firms at first; later gaming, hospitality, retail, managed service providers, manufacturing and finance',
    sources: [mitre('G1015', 'Scattered Spider'), cisa('aa23-320a', 'Scattered Spider')],
  },
  apt29: {
    summary:
      'APT29 is a Russian espionage group that the US and UK governments attribute to the Foreign Intelligence Service (SVR). MITRE ATT&CK says it has operated since at least 2008, mostly against government networks in Europe and NATO member countries, research institutes and think tanks, and that it compromised the US Democratic National Committee from the summer of 2015. In April 2021 the two governments attributed the SolarWinds supply chain compromise to the SVR, and public statements named APT29, Cozy Bear and The Dukes. Security vendors track the same or overlapping activity under many other names, including NOBELIUM, Midnight Blizzard and UNC2452.',
    origin: 'Russia, attributed to the Foreign Intelligence Service (SVR) by the US and UK governments',
    motivation: 'Espionage',
    targets: 'Government networks in Europe and NATO countries, research institutes and think tanks',
    sources: [mitre('G0016', 'APT29'), cisa('aa21-116a', 'Russian Foreign Intelligence Service (SVR) Cyber Operations: Trends and Best Practices for Network Defenders')],
  },
  'lazarus-group': {
    summary:
      'Lazarus Group is the best known name for North Korean state-sponsored hacking. MITRE ATT&CK attributes it to the Reconnaissance General Bureau and says it has been active since at least 2009, including the destructive 2014 attack on Sony Pictures. Public reporting uses the name as an umbrella for several North Korean units that share people, infrastructure and malware, so it is hard to pin a given operation on one team with confidence. The activity covers espionage, destructive attacks and theft for money, and CISA has described North Korean campaigns against blockchain companies.',
    origin: 'North Korea, attributed to the Reconnaissance General Bureau (RGB)',
    motivation: 'Espionage, destruction and financial gain',
    targets: 'Entertainment (Sony Pictures, 2014) and blockchain and cryptocurrency companies, among others',
    sources: [mitre('G0032', 'Lazarus Group'), cisa('aa22-108a', 'TraderTraitor: North Korean State-Sponsored APT Targets Blockchain Companies')],
  },
  akira: {
    summary:
      'Akira is a ransomware operation that has been active since at least March 2023. MITRE ATT&CK says its operators usually get in with stolen credentials on remote access services such as VPNs that rely on a single password, then move through the network with widely available tools. It practises double extortion: it copies data out before encrypting, and threatens to publish it if the ransom is not paid. Its encryptor has versions for Windows and for VMware ESXi hypervisors, and analysts have found overlaps with the Conti ransomware. CISA and partners have published a #StopRansomware advisory on it.',
    origin: 'Ransomware operation; no country attribution in MITRE ATT&CK',
    motivation: 'Financial gain (extortion)',
    targets: 'Windows systems and VMware ESXi hypervisors, reached through remote access services',
    sources: [mitre('G1024', 'Akira'), cisa('aa24-109a', '#StopRansomware: Akira Ransomware')],
  },
  fin7: {
    summary:
      'FIN7 is a financially motivated criminal group active since 2013. For years it went after US retail, restaurant and hospitality businesses, often with point-of-sale malware, and MITRE ATT&CK notes that part of the group ran out of a front company called Combi Security. Since 2020 it has moved to "big game hunting" of larger victims, using the REvil ransomware and its own ransomware-as-a-service, Darkside. MITRE says FIN7 may be linked to the Carbanak group but that several groups use Carbanak, so they are tracked separately.',
    origin: 'Financially motivated criminal group; part of it operated through the front company Combi Security',
    motivation: 'Financial gain',
    targets: 'Retail, restaurants, hospitality, software, consulting, financial services, medical equipment, cloud services, media, food and drink, transport, pharmaceuticals and utilities, mainly in the United States',
    sources: [mitre('G0046', 'FIN7')],
  },
};
