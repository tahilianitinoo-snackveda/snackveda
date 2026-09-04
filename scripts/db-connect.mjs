// Shared Supabase connection for the CLI scripts. Reads the credential from
// .env.local (gitignored) and never prints it.
import fs from "node:fs";
import postgres from "postgres";

export function readDatabaseUrl() {
  const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  // Take the LAST non-empty DATABASE_URL line, so an appended real value wins
  // over a blank one left behind by `vercel env pull`.
  const hits = [...env.matchAll(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?/gm)]
    .map((h) => h[1]).filter((v) => v && v.trim());
  const raw = hits.length ? hits[hits.length - 1] : (process.env.DATABASE_URL || "");
  if (!raw.trim()) {
    throw new Error("DATABASE_URL is empty. Put the Supabase connection string in .env.local (it is gitignored).");
  }
  return raw;
}

// Returns { sql, label, scrub }. `scrub` removes the password from any string —
// driver errors carry the connection string, so run every message through it.
export function connect(raw = readDatabaseUrl()) {
  // Supabase's transaction pooler (6543) does not support the multi-statement
  // transactions the migrations use; the session pooler on 5432 does.
  const swapped = raw.replace(":6543/", ":5432/");

  // Database passwords routinely contain characters that are structural in a URL —
  // `?` starts a query string, `#` a fragment, `/` a path. Pass the parts to the
  // driver separately rather than asking it to parse a string that cannot be valid.
  const parsed = swapped.match(/^(\w+):\/\/([^:]+):(.*)@([^@/]+)\/(.+)$/);
  if (!parsed) throw new Error("Could not parse DATABASE_URL. Expected postgresql://user:password@host:port/database");
  let [, , username, password, hostport, database] = parsed;
  let [host, port = "5432"] = hostport.split(":");
  database = database.split("?")[0];

  // The direct host (db.<ref>.supabase.co) is IPv6-only on newer projects and is
  // unreachable from IPv4-only networks. The pooler is IPv4; route through it.
  // Verified for this project: aws-1-ap-south-1, session port 5432.
  const ref = (host.match(/^db\.([a-z0-9]+)\.supabase\.co$/) || [])[1];
  if (ref) {
    host = process.env.SUPABASE_POOLER_HOST || "aws-1-ap-south-1.pooler.supabase.com";
    port = "5432";
    username = `postgres.${ref}`;
  }

  const sql = postgres({
    host, port: Number(port), database, username, password,
    ssl: { rejectUnauthorized: false }, max: 1, idle_timeout: 20,
    connect_timeout: 30, prepare: false, onnotice: () => {},
  });

  return {
    sql,
    label: `${host}:${port}/${database} as ${username}`,
    scrub: (e) => String((e && e.message) || e).split(password).join("****"),
  };
}
