import { Redis } from "@upstash/redis";

// Vercel's "Upstash for Redis" Marketplace integration auto-injects these
// two env vars once you connect a database to this project.
let client = null;

export function getRedis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "No Redis database connected. Add the Upstash for Redis integration to this Vercel project (Storage tab) to enable accounts."
    );
  }
  client = new Redis({ url, token });
  return client;
}
