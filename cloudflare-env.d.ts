declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STUDENTSTAY_MAKE_URL?: string;
    STUDENTSTAY_MAKE_SECRET?: string;
  STUDENTSTAY_TEST_RECIPIENT?: string;
  }
}
