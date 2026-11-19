// Finds threat actor names and aliases in news text (WHA-55).
//
// The previous matcher used lowercase substring checks, so "Play" matched "display" and
// "APT2" matched "APT28". Here a name must appear as a whole word, with the same capitalisation.
// Names that are also everyday English words ("Play", "Tick", "Mirage") must be followed
// within a few words by a word like "ransomware", "group" or "APT" to count.

// ATT&CK v20.1 group names and aliases that are English dictionary words in title case, plus
// short ones that collide with common abbreviations. ALL-CAPS names (ZINC, NICKEL) are not
// listed: case-sensitive matching already keeps them apart from the ordinary word.
const NEEDS_CONTEXT = new Set([
  'Armageddon', 'Axiom', 'Buckeye', 'Chafer', 'Chimera', 'Cicada', 'Cleaver', 'Crambus', 'Dragonfly',
  'Elderwood', 'Elfin', 'Equation', 'Gadolinium', 'Inception', 'Karma', 'Krypton', 'Leviathan', 'Lyceum',
  'Machete', 'Mantis', 'Mirage', 'Newscaster', 'Patchwork', 'Phosphorus', 'Play', 'Rancor', 'Raspite',
  'Rattlesnake', 'Reaper', 'Sidewinder', 'Silence', 'Snake', 'Springtail', 'Strider', 'Swallowtail',
  'Thrip', 'Tick', 'Voltzite', 'Windigo', 'RTM',
]);

const CONTEXT_WORDS = new Set([
  'ransomware', 'group', 'groups', 'gang', 'apt', 'actor', 'actors', 'hacker', 'hackers', 'threat', 'operator', 'operators',
  'campaign', 'campaigns', 'crew', 'espionage', 'cyberespionage', 'affiliate', 'affiliates', 'malware', 'backdoor',
  'intrusion', 'attack', 'attacks', 'state-sponsored', 'nation-state',
]);

// How many words after the name may separate it from a context word.
const CONTEXT_WINDOW = 4;

export interface ActorForMatching {
  id: string;
  name: string;
  aliases: string[] | null;
}

interface CompiledName { pattern: RegExp; needsContext: boolean }
interface CompiledActor { id: string; names: CompiledName[] }

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileName(name: string): CompiledName | null {
  const trimmed = name.trim();
  // Two characters or fewer would match too much even as a whole word.
  if (trimmed.length < 3) return null;
  const word = escapeRegExp(trimmed).replace(/\s+/g, '\\s+');
  return { pattern: new RegExp(`(?<![A-Za-z0-9])${word}(?![A-Za-z0-9])`, 'g'), needsContext: NEEDS_CONTEXT.has(trimmed) };
}

function followedByContext(text: string, end: number): boolean {
  const next = text.slice(end, end + 120).toLowerCase().match(/[a-z0-9-]+/g) ?? [];
  return next.slice(0, CONTEXT_WINDOW).some(word => CONTEXT_WORDS.has(word));
}

function nameAppears(name: CompiledName, text: string): boolean {
  name.pattern.lastIndex = 0;
  for (let match = name.pattern.exec(text); match; match = name.pattern.exec(text)) {
    if (!name.needsContext || followedByContext(text, match.index + match[0].length)) return true;
  }
  return false;
}

export function compileActors(actors: ActorForMatching[]): CompiledActor[] {
  return actors.map(actor => ({
    id: actor.id,
    names: [actor.name, ...(actor.aliases ?? [])].map(compileName).filter((name): name is CompiledName => name !== null),
  }));
}

// IDs of the actors named in text, each once.
export function findActors(compiled: CompiledActor[], text: string): string[] {
  if (!text) return [];
  return compiled.filter(actor => actor.names.some(name => nameAppears(name, text))).map(actor => actor.id);
}
