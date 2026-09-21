import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), role: text("role").notNull(), payload: text("payload").notNull(), createdAt: text("created_at").notNull(),
}, t => [index("idx_chat_user_time").on(t.userId, t.createdAt)]);
export const dashboardEvents = sqliteTable("dashboard_events", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), event: text("event").notNull(), details: text("details").notNull(), createdAt: text("created_at").notNull(),
}, t => [index("idx_event_user_time").on(t.userId, t.createdAt)]);
export const actionRequests = sqliteTable("action_requests", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), kind: text("kind").notNull(), state: text("state").notNull(), payload: text("payload").notNull(), createdAt: text("created_at").notNull(),
});
export const requestLocks = sqliteTable("request_locks", { id: text("id").primaryKey(), expiresAt: integer("expires_at").notNull() });
export const sourceCache = sqliteTable("source_cache", { id: text("id").primaryKey(), payload: text("payload").notNull(), updatedAt: integer("updated_at").notNull() });
