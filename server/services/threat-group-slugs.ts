import { eq, isNull } from 'drizzle-orm';
import { threatGroups } from '../../shared/schema';
import { slugify } from '../../client/src/lib/urls';

/**
 * Gives every threat group without a slug its readable address ("Salt Typhoon" -> "salt-typhoon").
 * A name that would collide with an existing slug gets "-2", "-3", ... appended. Slugs that are
 * already set are never changed, so public URLs stay stable. Returns how many were assigned.
 */
export async function assignMissingSlugs(db: any): Promise<number> {
  const rows: { id: string; name: string; slug: string | null }[] = await db
    .select({ id: threatGroups.id, name: threatGroups.name, slug: threatGroups.slug })
    .from(threatGroups);

  const taken = new Set(rows.map((r) => r.slug).filter((s): s is string => !!s));
  const missing = rows.filter((r) => !r.slug).sort((a, b) => a.name.localeCompare(b.name));

  let assigned = 0;
  for (const row of missing) {
    const base = slugify(row.name) || 'actor';
    let candidate = base;
    for (let n = 2; taken.has(candidate); n++) candidate = `${base}-${n}`;
    taken.add(candidate);
    await db.update(threatGroups).set({ slug: candidate }).where(eq(threatGroups.id, row.id));
    assigned++;
  }
  return assigned;
}
