import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {join} from "node:path";

const root=process.cwd(),migrationDir=join(root,"supabase","migrations");
const files=readdirSync(migrationDir).filter(name=>/^202608(?:3|4|50)\d+.*\.sql$/.test(name)).sort();
assert(files.some(name=>name.startsWith("20260850000000")),"Evidence security-hardening migration is missing.");
const sql=files.map(name=>readFileSync(join(migrationDir,name),"utf8")).join("\n").toLowerCase();
const tables=[...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/g)].map(match=>match[1]);
for(const table of new Set(tables)){
  assert(sql.includes(`alter table public.${table} enable row level security`),`${table} does not enable RLS.`);
  assert(sql.includes(`revoke all on public.${table} from anon,authenticated`),`${table} does not revoke anon/authenticated access.`);
}
for(const match of sql.matchAll(/create or replace function\s+public\.([a-z0-9_]+)\([^)]*\)[\s\S]*?as\s+\$\$/g)){
  const declaration=match[0];if(declaration.includes("security definer"))assert(declaration.includes("set search_path=public"),`${match[1]} is SECURITY DEFINER without a fixed search_path.`);
}
assert(/values\s*\(\s*'merchant-evidence'[\s\S]*?false\s*,/.test(sql),"Merchant evidence storage is not explicitly private.");
for(const relative of ["src/routes/api/evidence/reviews.ts","src/routes/api/evidence/sources.ts"]){
  const source=readFileSync(join(root,relative),"utf8");assert(!/searchParams\.get\(["']access_code["']\)/.test(source),`${relative} accepts access codes in URL query parameters.`);
}
const sourceHook=readFileSync(join(root,"src/routes/api/public/hooks/evidence-source-sync.ts"),"utf8");
assert(sourceHook.includes("timingSafeEqual"),"Evidence source hook does not use timing-safe secret comparison.");
console.log(`Evidence release-readiness verification passed (${new Set(tables).size} protected tables across ${files.length} migrations).`);
