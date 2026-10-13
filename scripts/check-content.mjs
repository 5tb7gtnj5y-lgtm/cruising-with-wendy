import assert from "node:assert/strict";
import {pbkdf2Sync} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";import fs from "node:fs";import path from "node:path";
import ts from "typescript";
const root=process.cwd(),sqlite=new DatabaseSync(":memory:");
for(const file of fs.readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort())sqlite.exec(fs.readFileSync("drizzle/"+file,"utf8"));
class Statement{constructor(query,values=[]){this.query=query;this.values=values;}bind(...values){return new Statement(this.query,values);}async raw(){const rows=sqlite.prepare(this.query).all(...this.values);return rows.map(r=>Object.values(r));}async all(){const st=sqlite.prepare(this.query);const results=st.all(...this.values);return {results,success:true,meta:{changes:0}};}async run(){const r=sqlite.prepare(this.query).run(...this.values);return {results:[],success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}async first(){return sqlite.prepare(this.query).get(...this.values)||null;}}
const DB={prepare:query=>new Statement(query),batch:async statements=>{sqlite.exec("BEGIN");try{const out=[];for(const s of statements){const st=sqlite.prepare(s.query);const result=st.all(...s.values);out.push({results:result,success:true,meta:{changes:0}});}sqlite.exec("COMMIT");return out;}catch(e){sqlite.exec("ROLLBACK");throw e;}}};
const env={DB,ADMIN_EMAIL:"owner@example.invalid",UPDATE_TOKEN:"test-service-key",SITE_ORIGIN:"https://example.invalid",SITE_PUBLIC:"false"};
let requestHeaders=new Headers();
let sourceFetches=0;
const sourceFetch=async url=>{sourceFetches++;if(String(url).includes("/news/fixture-announcement"))return new Response(`<meta property="og:title" content="A new cruise itinerary announcement"><meta property="article:published_time" content="${new Date().toISOString()}">`);return new Response('<a href="/news/fixture-announcement">Announcement</a>');};
class FixtureRewriter{handlers=[];on(selector,handler){this.handlers.push([selector,handler]);return this;}transform(response){return new Response(new ReadableStream({start:async controller=>{const html=await response.text();for(const [selector,handler]of this.handlers){const tag=selector.startsWith("meta")?"meta":selector.startsWith("a")?"a":"link";const matches=html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`,'g'));for(const match of matches){const attrs=Object.fromEntries([...match[1].matchAll(/([a-z:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));handler.element({getAttribute:key=>attrs[key]||null});}}controller.enqueue(new TextEncoder().encode(html));controller.close();}}));}}
const context=vm.createContext({console,URL,URLSearchParams,Request,Response,Headers,crypto,TextEncoder,TextDecoder,Date,performance,setTimeout,clearTimeout,AbortSignal,ReadableStream,HTMLRewriter:FixtureRewriter,fetch:sourceFetch});
const cache=new Map();
function synthetic(name,namespace){const m=new vm.SyntheticModule(Object.keys(namespace),function(){for(const[k,v]of Object.entries(namespace))this.setExport(k,v);},{context,identifier:name});return m;}
async function moduleFor(id){
 if(cache.has(id))return cache.get(id);
 let m;
 if(id==="cloudflare:workers")m=synthetic(id,{env});
 else if(id==="next/headers")m=synthetic(id,{headers:async()=>requestHeaders});
 else if(id==="next/navigation")m=synthetic(id,{notFound:()=>{throw Error("404");},redirect:p=>{throw Error("Redirect "+p);}});
 else if(!id.startsWith(root))m=synthetic(id,await import(id));
 else {const code=ts.transpileModule(fs.readFileSync(id,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;m=new vm.SourceTextModule(code,{context,identifier:id});}
 cache.set(id,m);return m;
}
async function linker(spec,ref){let id=spec;if(spec.startsWith("@/"))id=path.join(root,spec.slice(2));else if(spec.startsWith("."))id=path.resolve(path.dirname(ref.identifier),spec);if(id.startsWith(root)&&!path.extname(id)){if(fs.existsSync(id+".ts"))id+=".ts";else if(fs.existsSync(id+".tsx"))id+=".tsx";else id=path.join(id,"index.ts");}return moduleFor(id);}
async function get(file){const m=await moduleFor(path.join(root,file));if(m.status==="unlinked")await m.link(linker);if(m.status==="linked")await m.evaluate();return m.namespace;}
const content=await get("lib/content.ts"),auth=await get("lib/auth.ts"),site=await get("lib/site.ts");
assert.equal(await auth.adminApi(),false);
requestHeaders=new Headers({"oai-authenticated-user-id":"viewer","oai-authenticated-user-email":"viewer@example.invalid"});assert.equal(await auth.adminApi(),false);
requestHeaders=new Headers({"oai-authenticated-user-id":"owner","oai-authenticated-user-email":"owner@example.invalid"});assert.equal(await auth.adminApi(),false);
const session=await get("lib/session.ts");
const password="Test-only long password for verification",salt=Buffer.alloc(16,7);
env.ADMIN_PASSWORD_HASH=`pbkdf2-sha256$100000$${salt.toString("hex")}$${pbkdf2Sync(password,salt,100000,32,"sha256").toString("hex")}`;
assert.equal(await session.verifyPassword(password,env.ADMIN_PASSWORD_HASH),true);assert.equal(await session.verifyPassword("incorrect long password",env.ADMIN_PASSWORD_HASH),false);assert.equal(await session.verifyPassword(password,"bad hash"),false);
const login=await get("app/api/admin/session/route.ts");
const postLogin=(value,extra={})=>login.POST(new Request("https://example.invalid/api/admin/session",{method:"POST",headers:{Origin:"https://example.invalid","Content-Type":"application/x-www-form-urlencoded","CF-Connecting-IP":"192.0.2.10",...extra},body:new URLSearchParams({password:value})}));
assert.equal((await postLogin(password,{Origin:"https://attacker.invalid"})).status,403);
assert.equal((await postLogin(password,{"CF-Connecting-IP":""})).status,403);
let signed=await postLogin(password);assert.equal(signed.status,303);assert.equal(signed.headers.get("location"),"/admin");const cookie=signed.headers.get("set-cookie");assert.ok(cookie.includes("Secure; HttpOnly; SameSite=Strict"));requestHeaders=new Headers({cookie});assert.equal(await auth.adminApi(),true);
assert.equal(session.tokenFromCookie(cookie+"; "+cookie),null);
const token=session.tokenFromCookie(cookie),stored=sqlite.prepare("SELECT * FROM admin_sessions").get();assert.notEqual(stored.token_hash,token);
const logout=await login.POST(new Request("https://example.invalid/api/admin/session",{method:"POST",headers:{Origin:"https://example.invalid","Content-Type":"application/x-www-form-urlencoded",cookie},body:"action=logout"}));assert.equal(logout.status,303);assert.equal(await auth.adminApi(),false);assert.ok(logout.headers.get("set-cookie").includes("Max-Age=0"));
for(let i=0;i<4;i++)assert.equal((await postLogin("incorrect long password")).status,303);assert.equal((await postLogin(password)).status,429);
const token2=await session.createSession(DB);assert.equal(await session.validSession(DB,session.sessionCookie(token2)),true);sqlite.prepare("UPDATE admin_sessions SET expires_at=0").run();assert.equal(await session.validSession(DB,session.sessionCookie(token2)),false);
console.log("PASS: standalone password verification, spoofed-header rejection, session hashing/expiry, secure cookies, logout, CSRF and login rate limiting.");
assert.equal(auth.serviceAuth(new Request("https://example.invalid/api/system/state")),false);
assert.equal(auth.serviceAuth(new Request("https://example.invalid/api/system/state",{headers:{"X-Update-Token":"wrong"}})),false);
assert.equal(auth.serviceAuth(new Request("https://example.invalid/api/system/state",{headers:{"X-Update-Token":env.UPDATE_TOKEN}})),true);
assert.equal(auth.sameOrigin(new Request("https://example.invalid/api/admin",{headers:{Origin:"https://elsewhere.invalid"}})),false);
assert.equal(site.safeUrl("javascript:alert(1)"),"");assert.equal(site.safeUrl("https://name:password@example.invalid"),"");assert.equal(site.normalUrl("https://www.tuigroup.com/story/?utm_source=test#x"),"https://www.tuigroup.com/story");
const input=content.inputSchema.parse({title:"A useful original cruise planning guide",excerpt:"A practical checklist for planning a cruise and choosing a trip that suits you.",body:"A thoughtfully written introduction.\n\n## Start with your route\n"+("Check the official operator information for your chosen sailing. ".repeat(20)),kind:"guide",sources:[{name:"Official source",url:"https://www.tuigroup.com/en/newsroom/tui-uki"}]});
const id=await content.addDraft(input);let current=(await content.allContent()).find(x=>x.id===id);assert.equal((await content.publicEntries()).total,0);assert.equal(await content.bySlug(current.slug),null);
await assert.rejects(()=>content.publish(awaitableMissing()),/Article not found/);function awaitableMissing(){return "missing";}
await content.saveEdit(id,{...input,title:"A more useful original cruise planning guide"},1);await assert.rejects(()=>content.saveEdit(id,input,1),/changed/);
await content.publish(id);current=await content.bySlug(current.slug);assert.ok(current);assert.equal((await content.publicEntries({q:"planning"})).total,1);
const liveTitle=current.title;const revision=await content.saveEdit(id,{...input,title:"The revised guide awaiting editorial approval"},current.revision);assert.equal((await content.bySlug(current.slug)).title,liveTitle);assert.notEqual(revision.id,id);assert.equal((await content.allContent()).find(x=>x.id===revision.id).status,"draft");
await content.publish(revision.id);assert.equal((await content.bySlug(current.slug)).title,"The revised guide awaiting editorial approval");assert.equal((await content.allContent()).find(x=>x.id===revision.id),undefined);
const news=content.inputSchema.parse({kind:"news",title:"A verified primary cruise announcement",excerpt:"A short factual description linking to the original cruise-line announcement.",line:"marella",sourceName:"TUI Group",sourceUrl:"https://www.tuigroup.com/en/newsroom/news/example?utm_source=feed",publishedAt:"2026-10-10T09:00:00Z"});
assert.equal((await content.ingestNews([news])).added,1);assert.equal((await content.ingestNews([{...news,sourceUrl:news.sourceUrl.replace("feed","other")}])).duplicates,1);
const imported=(await content.allContent()).find(x=>x.kind==="news");await content.remove(imported.id);assert.equal((await content.ingestNews([news])).duplicates,1);assert.equal((await content.publicEntries({kind:"news"})).total,0);
await assert.rejects(()=>content.ingestNews([{...news,sourceUrl:"https://unapproved.invalid/story"}]),/approved/);
await content.setStatus(id,"archived");assert.equal(await content.bySlug(current.slug),null);
const scheduled=await content.addDraft({...input,title:"Scheduled planning guide for a future cruise"});await content.publish(scheduled,new Date(Date.now()+86400000).toISOString());assert.equal((await content.publicEntries()).total,0);
const sitemap=await get("app/sitemap.xml/route.ts"),robots=await get("app/robots.txt/route.ts");assert.ok(!(await (await sitemap.GET()).text()).includes("awaiting-editorial"));assert.ok((await robots.GET().text()).includes("Disallow: /"));
env.SITE_PUBLIC="true";assert.ok(robots.GET().headers.get("content-type").includes("text/plain"));assert.ok((await robots.GET().text()).includes("Sitemap:"));
const sys=await get("app/api/system/[action]/route.ts");
const invoke=data=>sys.POST(new Request("https://example.invalid/api/system/sync",{method:"POST",headers:{"X-Update-Token":env.UPDATE_TOKEN},body:JSON.stringify(data)}),{params:Promise.resolve({action:"sync"})});
const daily={...input,kind:"article",title:"An original daily cruise draft for review",ai:true};let response=await invoke({news:[],draft:daily});assert.equal(response.status,200);let first=await response.json();assert.ok(first.draftId);response=await invoke({news:[],draft:daily});assert.equal((await response.json()).draftSkipped,true);assert.equal((await content.allContent()).find(x=>x.id===first.draftId).status,"draft");
await content.setSetting("paused","true");assert.equal((await (await invoke({news:[news]})).json()).paused,true);
console.log("PASS: administrator authorization, CSRF, safe URLs, draft isolation, stale edits, revision approval, publication, search, exact duplicates, news suppression, approved sources, scheduling, sitemap, robots, daily draft limits and pause.");


const { renderToStaticMarkup }=await import("react-dom/server");
const seed=await get("lib/seed.ts");await seed.initialise();
const archiveFixtures=Array.from({length:17},(_,i)=>content.inputSchema.parse({...news,title:`Archive fixture cruise announcement ${i+1}`,sourceUrl:`https://www.tuigroup.com/en/newsroom/news/feed-check-${i+1}`,publishedAt:"2026-10-11T00:00:00Z"}));
await content.ingestNews(archiveFixtures);
const fullNews=await content.publicEntries({kind:"news",all:true});assert.equal(fullNews.items.length,20);assert.equal(fullNews.total,20);assert.equal((await content.publicEntries({kind:"news"})).items.length,12);assert.equal((await content.publicEntries({kind:"news",q:"Archive fixture",all:true})).items.length,17);assert.ok(fullNews.items.every(x=>x.status==="published"&&x.hidden===0));
const home=await get("app/page.tsx");const homeHtml=renderToStaticMarkup(await home.default());assert.ok(homeHtml.includes("<h1>"));assert.ok(homeHtml.includes("Marella adds Patras"));assert.ok(homeHtml.includes("loading=\"lazy\""));assert.ok(homeHtml.includes("fetchPriority=\"high\""));assert.ok(!homeHtml.includes("five things to check"));
assert.equal((homeHtml.match(/class="story-card news-card /g)||[]).length,20);assert.ok(!homeHtml.includes("journal-section"));assert.equal((homeHtml.match(/class="news-shopping-row"/g)||[]).length,2);assert.equal((homeHtml.match(/class="news-shopping-row desktop-shopping-row"/g)||[]).length,6);assert.equal((homeHtml.match(/class="news-shopping-row mobile-shopping-row"/g)||[]).length,9);assert.ok(!homeHtml.includes('class="photo-credit"'));assert.ok(homeHtml.includes('aria-label="Photo details"'));assert.ok(homeHtml.includes('class="photo-info-copy"'));assert.ok(homeHtml.includes("Amazon search"));assert.ok(!homeHtml.includes("sponsored noopener"));
await content.setSetting("affiliate_links",JSON.stringify([{key:"packing",url:"https://www.amazon.co.uk/dp/TEST?tag=owner-test-21"}]));
const affiliateHtml=renderToStaticMarkup(await home.default());assert.ok(affiliateHtml.includes("tag=owner-test-21"));assert.ok(affiliateHtml.includes('rel="sponsored noopener noreferrer"'));assert.ok(affiliateHtml.includes("Affiliate links · We may earn a commission."));
await content.setSetting("affiliate_links","invalid-json");assert.equal((renderToStaticMarkup(await home.default()).match(/class="story-card news-card /g)||[]).length,20);await content.setSetting("affiliate_links","[]");
const publicPage=await get("app/[...path]/page.tsx");await content.publish(first.draftId);const publishedDaily=(await content.allContent()).find(x=>x.id===first.draftId);const props={params:Promise.resolve({path:["read",publishedDaily.slug]}),searchParams:Promise.resolve({})};const html=renderToStaticMarkup(await publicPage.default(props));assert.ok(html.includes("application/ld+json"));assert.ok(html.includes("BreadcrumbList"));assert.ok(html.includes("Start with your route"));assert.ok(html.includes("Editor approved"));const meta=await publicPage.generateMetadata(props);assert.equal(meta.alternates.canonical,"https://example.invalid/read/"+publishedDaily.slug);
const feedHtml=renderToStaticMarkup(await publicPage.default({params:Promise.resolve({path:["news"]}),searchParams:Promise.resolve({page:"2"})}));assert.equal((feedHtml.match(/class="story-card news-card /g)||[]).length,20);assert.ok(!feedHtml.includes('class="pagination"'));assert.ok(!feedHtml.includes(publishedDaily.title));
console.log("PASS: expanding news feed shows more than 12 stories, preserves filters and draft isolation, removes the home journal, inserts compact shopping links between rows, and preserves configured affiliate tags and disclosures.");
console.log("PASS: rendered HTML includes readable article content, valid article/breadcrumb data, canonical metadata and eager/lazy image priorities; draft content stays absent from home.");
const utilities=await get("lib/client-utils.ts");assert.equal(utilities.LINES.length,10);assert.equal(content.trustedSources.length,10);assert.deepEqual([...utilities.CRUISE_LINE_SLUGS].sort(),Array.from(content.trustedSources,x=>x.line).sort());
const expandedSources=content.trustedSources.slice(4);const expandedNews=expandedSources.map(s=>content.inputSchema.parse({...news,line:s.line,title:`Verified ${s.name} news fixture`,sourceUrl:new URL("/feed-check-expanded-"+s.line,s.url).href,sourceName:s.name}));
for(const s of expandedSources){assert.equal(content.trusted(s.url),true);assert.equal(content.trusted(new URL(s.url).origin+".unapproved.invalid/story"),false);}assert.throws(()=>content.inputSchema.parse({...news,line:"unapproved-line"}));
assert.equal((await content.ingestNews(expandedNews)).added,6);assert.equal((await content.ingestNews(expandedNews)).duplicates,6);for(const s of expandedSources)assert.equal((await content.publicEntries({kind:"news",line:s.line,all:true})).items.length,1);
const savedInstructions=await (await sys.GET(new Request("https://example.invalid/api/system/instructions",{headers:{"X-Update-Token":env.UPDATE_TOKEN}}),{params:Promise.resolve({action:"instructions"})})).json();assert.equal(savedInstructions.sources.length,10);for(const s of expandedSources)assert.ok(savedInstructions.writer.body.news[0].line.includes(s.line));
const linePage=renderToStaticMarkup(await publicPage.default({params:Promise.resolve({path:["cruise-lines","cunard"]}),searchParams:Promise.resolve({})}));assert.ok(linePage.includes("Cunard"));assert.ok(linePage.includes("feed-check-expanded-cunard"));
console.log("PASS: ten cruise lines have matching validation and primary sources; six new feeds ingest and filter correctly, reject lookalike domains, suppress duplicates, and appear in saved refresh instructions and line pages.");
const collector=await get("lib/news-refresh.ts");
const approved=content.trustedSources[0];assert.equal(collector.approvedForSource("https://www.tuigroup.com/news/story",approved),true);assert.equal(collector.approvedForSource("https://tuigroup.com.attacker.invalid/news/story",approved),false);assert.equal(collector.approvedForSource("https://user:password@www.tuigroup.com/news/story",approved),false);
assert.equal(collector.recentDate("not a date"),null);assert.equal(collector.recentDate("2000-01-01"),null);assert.equal(collector.recentDate("2999-01-01"),null);
sourceFetches=0;assert.equal((await collector.runNewsRefresh(env)).paused,true);assert.equal(sourceFetches,0);
await content.setSetting("paused","false");const savedBefore=await content.allContent(),collected=await collector.runNewsRefresh(env);assert.ok(collected.added>0);assert.equal(collected.failures.length,0);const queued=(await content.allContent()).filter(x=>x.groupKey.startsWith("collector:"));assert.equal(queued.length,collected.added);assert.ok(queued.every(x=>x.status==="draft"&&x.kind==="news"));assert.equal((await collector.runNewsRefresh(env)).added,0);
assert.ok((await content.allContent()).length>=savedBefore.length);const q=queued[0];await content.remove(q.id);assert.equal((await collector.runNewsRefresh(env)).added,0);assert.equal((await content.allContent()).find(x=>x.id===q.id).status,"archived");
context.fetch=async()=>new Response("Blocked",{status:403});const beforeFailure=(await content.allContent()).map(x=>JSON.stringify(x)).sort();const failed=await collector.runNewsRefresh(env);assert.equal(failed.failures.length,10);assert.deepEqual((await content.allContent()).map(x=>JSON.stringify(x)).sort(),beforeFailure);assert.ok((await content.setting("last_error")).includes("source could not be read"));
await content.setSetting("collector_lock",String(Date.now()+60000));assert.equal((await collector.runNewsRefresh(env)).busy,true);
console.log("PASS: collector pause, date validation, approved hosts, review-only imports, duplicate/archived suppression, concurrent-run lease and failure preservation.");

const nativeAdmin=await get('lib/admin-data.ts'),adminResponse=await get('lib/admin-response.ts');
const adminCookie=session.sessionCookie(await session.createSession(DB));
const nativeRequest=(query='',cookie=adminCookie)=>new Request('https://example.invalid/api/admin'+query,{headers:{cookie}});
assert.equal((await nativeAdmin.adminData(nativeRequest('', ''),env)).status,401);
assert.equal((await nativeAdmin.adminData(new Request('https://example.invalid/api/admin',{headers:{'oai-authenticated-user-id':'owner'}}),env)).status,401);
const snapshotBefore=(await content.allContent()).map(x=>JSON.stringify(x)).sort();
let nativeResponse=await nativeAdmin.adminData(nativeRequest(),env);assert.equal(nativeResponse.status,200);const nativeState=await nativeResponse.json(),expectedState=await content.state();
assert.deepEqual(nativeState.items,expectedState.items);assert.deepEqual(nativeState.analytics,expectedState.analytics);assert.deepEqual(nativeState.history,expectedState.history);assert.equal(nativeState.paused,expectedState.paused);assert.equal(nativeState.lastRefresh,expectedState.lastRefresh);assert.equal(nativeState.indexing,expectedState.indexing);
const exported=await (await nativeAdmin.adminData(nativeRequest('?export=1'),env)).json();assert.equal(exported.content.length,expectedState.items.length);assert.ok(Array.isArray(exported.settings)&&Array.isArray(exported.revisions));
const nativeRevisions=await (await nativeAdmin.adminData(nativeRequest('?revisions='+encodeURIComponent(id)),env)).json();assert.deepEqual(nativeRevisions,await content.revisionList(id));
await content.setSetting('affiliate_links','broken-json');nativeResponse=await nativeAdmin.adminData(nativeRequest(),env);assert.equal(nativeResponse.status,200);assert.deepEqual((await nativeResponse.json()).affiliateLinks,[]);assert.equal(await content.setting('affiliate_links'),'broken-json');await content.setSetting('affiliate_links','[]');
assert.deepEqual((await content.allContent()).map(x=>JSON.stringify(x)).sort(),snapshotBefore);
const missing=new DatabaseSync(':memory:');
class MissingStatement{constructor(q,values=[]){this.q=q;this.values=values;}bind(...values){return new MissingStatement(this.q,values);}async first(){return missing.prepare(this.q).get(...this.values)||null;}async run(){missing.prepare(this.q).run(...this.values);return {success:true};}}
const missingDb={prepare:q=>new MissingStatement(q),async batch(statements){return statements.map(s=>({success:true,results:missing.prepare(s.q).all(...s.values)}));}};
const missingCookie=session.sessionCookie(await session.createSession(missingDb));const missingResult=await nativeAdmin.adminData(nativeRequest('',missingCookie),{DB:missingDb});assert.equal(missingResult.status,503);assert.equal((await missingResult.json()).code,'database_setup');assert.equal(missing.prepare("SELECT count(*) AS n FROM admin_sessions").get().n,1);
assert.equal((await nativeAdmin.adminData(nativeRequest(),{})).status,503);
await assert.rejects(()=>adminResponse.readAdminResponse(new Response('',{status:500})),/news service/);
await assert.rejects(()=>adminResponse.readAdminResponse(new Response('')),/incomplete response/);
await assert.rejects(()=>adminResponse.readAdminResponse(new Response('<html>error</html>',{status:503})),/news service/);
await assert.rejects(()=>adminResponse.readAdminResponse(Response.json({error:'Database setup incomplete'},{status:503})),/Database setup incomplete/);
assert.equal(JSON.stringify(await adminResponse.readAdminResponse(Response.json({items:[]}))),JSON.stringify({items:[]}));
console.log('PASS: native dashboard state, export and revisions match saved data; anonymous/spoofed requests are rejected, malformed affiliate settings preserve news, missing database setup produces readable JSON, and empty/non-JSON replies produce a useful error.');
