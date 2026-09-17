export function resolveSupabaseConnectionString() {
  const explicitPooler = process.env.SUPABASE_POOLER_DATABASE_URL?.trim();
  if (explicitPooler) return explicitPooler;

  const direct = process.env.SUPABASE_DATABASE_URL?.trim();
  if (!direct) return process.env.DATABASE_URL;

  try {
    const source = new URL(direct);
    if (!source.hostname.startsWith("db.") || !source.hostname.endsWith(".supabase.co")) return direct;
    const projectRef = source.hostname.slice(3, -".supabase.co".length);
    const region = process.env.SUPABASE_POOLER_REGION?.trim() || "us-west-2";
    const poolerHost = process.env.SUPABASE_POOLER_HOST?.trim() || `aws-0-${region}.pooler.supabase.com`;
    source.hostname = poolerHost;
    source.port = process.env.SUPABASE_POOLER_PORT?.trim() || "6543";
    source.username = `postgres.${projectRef}`;
    return source.toString();
  } catch {
    return direct;
  }
}
