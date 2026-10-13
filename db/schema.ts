import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const content = sqliteTable("content", {
  id: text("id").primaryKey(), slug: text("slug").notNull().unique(), kind: text("kind").notNull(),
  status: text("status").notNull().default("draft"), title: text("title").notNull(), excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""), line: text("line").notNull().default("general"), ship: text("ship").notNull().default(""),
  destination: text("destination").notNull().default(""), sourceUrl: text("source_url").notNull().default(""), sourceName: text("source_name").notNull().default(""),
  sources: text("sources").notNull().default("[]"), seoTitle: text("seo_title").notNull().default(""), seoDescription: text("seo_description").notNull().default(""),
  ai: integer("ai").notNull().default(0), featured: integer("featured").notNull().default(0), publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), revision: integer("revision").notNull().default(1),
  groupKey: text("group_key").notNull().default(""), hidden: integer("hidden").notNull().default(0),
}, t => [index("content_public_idx").on(t.status,t.hidden,t.publishedAt), index("content_line_idx").on(t.line,t.kind), index("content_source_idx").on(t.sourceUrl), index("content_group_idx").on(t.groupKey)]);
export const revisions = sqliteTable("revisions", {id:text("id").primaryKey(),contentId:text("content_id").notNull(),snapshot:text("snapshot").notNull(),createdAt:text("created_at").notNull()},t=>[index("revision_content_idx").on(t.contentId)]);
export const settings = sqliteTable("settings", {key:text("key").primaryKey(),value:text("value").notNull()});
export const views = sqliteTable("views", {id:text("id").primaryKey(),day:text("day").notNull(),path:text("path").notNull(),count:integer("count").notNull().default(0)},t=>[index("view_day_idx").on(t.day)]);
export const audit = sqliteTable("audit", {id:text("id").primaryKey(),action:text("action").notNull(),contentId:text("content_id"),createdAt:text("created_at").notNull()});
