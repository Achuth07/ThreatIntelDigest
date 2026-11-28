// Cleans third-party feed text for the API. Feeds put HTML, entities and sometimes whole posts in
// their summaries; the API returns plain text cut to SUMMARY_MAX characters, never full articles
// (WHA-63).

export const SUMMARY_MAX = 300;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

// Some feeds encode entities several times (&amp;amp;#39;), so decode until nothing changes.
function decodeFully(text: string): string {
  for (let i = 0; i < 4; i++) {
    const next = decodeEntities(text);
    if (next === text) break;
    text = next;
  }
  return text;
}

// Feeds sometimes encode UTF-8 bytes as separate entities (&#xe2;&#x80;&#x99; for ’), which
// decode to Latin-1 characters. Runs that form valid UTF-8 are turned back into the character.
function repairUtf8(text: string): string {
  return text.replace(/[\u00c2-\u00f4][\u0080-\u00bf]+/g, run => {
    const decoded = Buffer.from(run, 'latin1').toString('utf8');
    return decoded.includes('\ufffd') ? run : decoded;
  });
}

export function plainText(html: string | null | undefined): string {
  if (!html) return '';
  const withoutBlocks = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // Decode first, so encoded tags (&lt;p&gt;) are removed too.
  const stripped = decodeFully(withoutBlocks).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ');
  return repairUtf8(decodeFully(stripped))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    // Removing inline tags (<b>word</b>.) can leave a space before punctuation.
    .replace(/\s+([.,;:!?)])/g, '$1')
    .trim();
}

// Plain text cut at a word boundary, with an ellipsis when shortened.
export function shortSummary(html: string | null | undefined, max = SUMMARY_MAX): string | null {
  const text = plainText(html);
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}…`;
}
