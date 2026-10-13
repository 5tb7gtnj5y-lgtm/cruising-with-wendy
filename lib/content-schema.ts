// Idempotent creation only: existing news, settings, sessions and indexes are preserved.
export const contentSchemaStatements=[
 "CREATE TABLE IF NOT EXISTS `audit` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`action` text NOT NULL,\n\t`content_id` text,\n\t`created_at` text NOT NULL\n)",
 "CREATE TABLE IF NOT EXISTS `content` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`slug` text NOT NULL,\n\t`kind` text NOT NULL,\n\t`status` text DEFAULT 'draft' NOT NULL,\n\t`title` text NOT NULL,\n\t`excerpt` text DEFAULT '' NOT NULL,\n\t`body` text DEFAULT '' NOT NULL,\n\t`line` text DEFAULT 'general' NOT NULL,\n\t`ship` text DEFAULT '' NOT NULL,\n\t`destination` text DEFAULT '' NOT NULL,\n\t`source_url` text DEFAULT '' NOT NULL,\n\t`source_name` text DEFAULT '' NOT NULL,\n\t`sources` text DEFAULT '[]' NOT NULL,\n\t`seo_title` text DEFAULT '' NOT NULL,\n\t`seo_description` text DEFAULT '' NOT NULL,\n\t`ai` integer DEFAULT 0 NOT NULL,\n\t`featured` integer DEFAULT 0 NOT NULL,\n\t`published_at` text,\n\t`created_at` text NOT NULL,\n\t`updated_at` text NOT NULL,\n\t`revision` integer DEFAULT 1 NOT NULL,\n\t`group_key` text DEFAULT '' NOT NULL,\n\t`hidden` integer DEFAULT 0 NOT NULL\n)",
 "CREATE UNIQUE INDEX IF NOT EXISTS `content_slug_unique` ON `content` (`slug`)",
 "CREATE INDEX IF NOT EXISTS `content_public_idx` ON `content` (`status`,`hidden`,`published_at`)",
 "CREATE INDEX IF NOT EXISTS `content_line_idx` ON `content` (`line`,`kind`)",
 "CREATE INDEX IF NOT EXISTS `content_source_idx` ON `content` (`source_url`)",
 "CREATE INDEX IF NOT EXISTS `content_group_idx` ON `content` (`group_key`)",
 "CREATE TABLE IF NOT EXISTS `revisions` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`content_id` text NOT NULL,\n\t`snapshot` text NOT NULL,\n\t`created_at` text NOT NULL\n)",
 "CREATE INDEX IF NOT EXISTS `revision_content_idx` ON `revisions` (`content_id`)",
 "CREATE TABLE IF NOT EXISTS `settings` (\n\t`key` text PRIMARY KEY NOT NULL,\n\t`value` text NOT NULL\n)",
 "CREATE TABLE IF NOT EXISTS `views` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`day` text NOT NULL,\n\t`path` text NOT NULL,\n\t`count` integer DEFAULT 0 NOT NULL\n)",
 "CREATE INDEX IF NOT EXISTS `view_day_idx` ON `views` (`day`)"
];
