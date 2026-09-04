// Run a read-only query against the database and print the rows as JSON.
//   node scripts/query-db.mjs "select name, slug from products order by name"
//   node scripts/query-db.mjs --file scripts/sql/report.sql
// Refuses anything that is not a single SELECT — use run-sql.mjs to change data.
import fs from "node:fs";
import { connect } from "./db-connect.mjs";

const args = process.argv.slice(2);
const text = args[0] === "--file" ? fs.readFileSync(args[1], "utf8") : args.join(" ");
if (!text.trim()) { console.error('usage: node scripts/query-db.mjs "select ..." | --file <path>'); process.exit(2); }
if (!/^\s*(select|with)\b/i.test(text) || /;\s*\S/.test(text)) {
  console.error("query-db only runs a single SELECT. Use run-sql.mjs for writes.");
  process.exit(2);
}

const { sql, label, scrub } = connect();
console.error(`host: ${label}`);
try {
  const rows = await sql.unsafe(text);
  console.log(JSON.stringify(rows, null, 2));
} catch (e) {
  console.error("FAILED:", scrub(e));
  process.exitCode = 1;
} finally {
  await sql.end();
}
