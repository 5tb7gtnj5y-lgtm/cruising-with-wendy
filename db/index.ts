import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Run npm run setup to create and bind your Cloudflare database."
    );
  }

  return drizzle(env.DB, { schema });
}
