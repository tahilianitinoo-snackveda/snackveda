// Run a .sql file against DATABASE_URL, reading the credential from .env.local.
// The connection string is never printed. Usage:
//   node scripts/run-sql.mjs scripts/sql/<file>.sql [--dry]
import fs from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) { console.error("usage: node scripts/run-sql.mjs <file.sql> [--dry]"); process.exit(2); }

const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
// Take the LAST non-empty DATABASE_URL line, so an appended real value wins
// over a blank one left behind by `vercel env pull`.
const hits = [...env.matchAll(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?/gm)]
  .map(h => h[1]).filter(v => v && v.trim());
const raw = hits.length ? hits[hits.length - 1] : (process.env.DATABASE_URL || "");
if (!raw.trim()) {
  console.error("DATABASE_URL is empty. Put the Supabase connection string in .env.local (it is gitignored).");
  process.exit(1);
}

// Supabase's transaction pooler (6543) does not support the multi-statement
// transactions these migrations use; the session pooler on 5432 does.
const swapped = raw.replace(":6543/", ":5432/");

// Database passwords routinely contain characters that are structural in a URL —
// `?` starts a query string, `#` a fragment, `/` a path. Pass the parts to the
// driver separately rather than asking it to parse a string that cannot be valid.
const parsed = swapped.match(/^(\w+):\/\/([^:]+):(.*)@([^@/]+)\/(.+)$/);
if (!parsed) {
  console.error("Could not parse DATABASE_URL. Expected postgresql://user:password@host:port/database");
  process.exit(1);
}
let [, , user, password, hostport, database] = parsed;
let [host, port = "5432"] = hostport.split(":");

// The direct host (db.<ref>.supabase.co) is IPv6-only on newer projects and is
// unreachable from IPv4-only networks. The pooler is IPv4; route through it.
// Verified for this project: aws-1-ap-south-1, session port 5432.
const ref = (host.match(/^db\.([a-z0-9]+)\.supabase\.co$/) || [])[1];
if (ref) {
  host = process.env.SUPABASE_POOLER_HOST || "aws-1-ap-south-1.pooler.supabase.com";
  port = "5432";
  user = `postgres.${ref}`;
}

const sql = postgres({
  host, port: Number(port), database, username: user, password,
  ssl: { rejectUnauthorized: false }, max: 1, idle_timeout: 20, connect_timeout: 30, onnotice: () => {},
});

const body = fs.readFileSync(file, "utf8");
console.log(`file: ${file} (${body.length} bytes)`);
console.log(`host: ${host}:${port}/${database} as ${user}`);

// Driver errors can carry the connection string. Never let one reach stdout.
const scrub = (e) => String((e && e.message) || e).split(password).join("****");

try {
  const [{ now }] = await sql`select now()`;
  console.log("connected:", now.toISOString());
  if (dry) { console.log("--dry: connection verified, nothing executed."); await sql.end(); process.exit(0); }
  await sql.unsafe(body);
  console.log("executed OK.");
} catch (e) {
  console.error("FAILED:", scrub(e));
  process.exitCode = 1;
} finally {
  await sql.end();
}
