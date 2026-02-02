
export const watchlistItems = pgTable("watchlist_items", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    keyword: text("keyword").notNull(),
    createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems, {
    userId: z.number().int().positive(),
    keyword: z.string().min(1),
}).omit({
    id: true,
    createdAt: true,
});

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
