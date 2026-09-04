// Run a .sql file against DATABASE_URL, reading the credential from .env.local.
// The connection string is never printed. Usage:
//   node scripts/run-sql.mjs scripts/sql/<file>.sql [--dry]
import fs from "node:fs";
import { connect } from "./db-connect.mjs";

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) { console.error("usage: node scripts/run-sql.mjs <file.sql> [--dry]"); process.exit(2); }

let sql, label, scrub;
try {
  ({ sql, label, scrub } = connect());
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}

const body = fs.readFileSync(file, "utf8");
console.log(`file: ${file} (${body.length} bytes)`);
console.log(`host: ${label}`);

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
