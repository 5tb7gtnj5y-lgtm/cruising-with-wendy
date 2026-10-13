import fs from "node:fs";
import {spawnSync} from "node:child_process";
const config=JSON.parse(fs.readFileSync("wrangler.jsonc","utf8"));
if(!/^[a-f0-9-]{36}$/.test(config.d1_databases?.[0]?.database_id||"")||config.d1_databases[0].database_id.startsWith("00000000")||!config.account_id||config.vars.SITE_ORIGIN==="https://example.invalid")throw Error("Run npm run setup before deploying. A real account, database and site URL are required.");
for(const args of [["node_modules/vite/bin/vite.js","build"],["node_modules/wrangler/bin/wrangler.js","deploy","--config","dist/server/wrangler.json"]]){const r=spawnSync(process.execPath,args,{stdio:"inherit"});if(r.status!==0)process.exit(r.status||1);}
