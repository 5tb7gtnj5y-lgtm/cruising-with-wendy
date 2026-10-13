declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ASSETS?: Fetcher;
    BUCKET?: R2Bucket;
    ADMIN_PASSWORD_HASH?: string;
    ACCESS_MODE?: string;
    UPDATE_TOKEN?: string;
    SITE_ORIGIN?: string;
    SITE_PUBLIC?: string;
  }
}
