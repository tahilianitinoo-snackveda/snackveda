// Find a Supabase connection that works from this network, reusing the password
// already in .env.local. The direct host (db.<ref>.supabase.co) is IPv6-only on
// newer projects; the poolers are IPv4. Prints no credential.
import fs from "node:fs";
import postgres from "postgres";

const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const hits = [...env.matchAll(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?/gm)]
  .map((h) => h[1]).filter((v) => v && v.trim());
if (!hits.length) { console.error("No DATABASE_URL in .env.local"); process.exit(1); }

const m = hits[hits.length - 1].match(/^(\w+):\/\/([^:]+):(.*)@([^@/]+)\/(.+)$/);
if (!m) { console.error("Could not parse DATABASE_URL"); process.exit(1); }
const [, , user, password, hostport, database] = m;
const ref = (hostport.match(/db\.([a-z0-9]+)\.supabase\.co/) || [])[1];

const scrub = (e) => String((e && e.message) || e).split(password).join("****");

const regions = ["ap-south-1", "ap-southeast-1", "us-east-1", "eu-central-1", "us-west-1"];
const candidates = [
  { label: "direct (as supplied)", host: hostport.split(":")[0], port: 5432, username: user },
];
if (ref) {
  for (const gen of ["aws-0", "aws-1"]) {
    for (const r of regions) {
      candidates.push({ label: `${gen} ${r} :5432`, host: `${gen}-${r}.pooler.supabase.com`, port: 5432, username: `postgres.${ref}` });
      candidates.push({ label: `${gen} ${r} :6543`, host: `${gen}-${r}.pooler.supabase.com`, port: 6543, username: `postgres.${ref}` });
    }
  }
}

for (const c of candidates) {
  const sql = postgres({
    host: c.host, port: c.port, database, username: c.username, password,
    ssl: { rejectUnauthorized: false }, max: 1, connect_timeout: 12, idle_timeout: 5, onnotice: () => {},
  });
  try {
    const [{ n }] = await sql`select count(*)::int as n from products`;
    console.log(`OK   ${c.label.padEnd(24)} -> connected, products=${n}`);
    console.log(`\nUse host=${c.host} port=${c.port} username=${c.username}`);
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.log(`--   ${c.label.padEnd(24)} ${scrub(e).slice(0, 70)}`);
  } finally {
    try { await sql.end({ timeout: 1 }); } catch {}
  }
}
console.error("\nNo candidate connected.");
process.exit(1);
