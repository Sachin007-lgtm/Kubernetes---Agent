import { createClient } from '@insforge/sdk';

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_URL ||
  'https://qc692nzg.us-east.insforge.app';

const anonKey =
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
  'anon_01bb0892e68a0e84fd3a1ccd0c2165f354f7af0e1a363b88f354b75c32c466de';

/**
 * InsForge BaaS client instance for frontend operations (database, auth, realtime).
 */
export const insforge = createClient({
  baseUrl,
  anonKey,
});
