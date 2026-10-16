import assert from "node:assert/strict";
import {pbkdf2Sync} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";import fs from "node:fs";import path from "node:path";
import ts from "typescript";
const root=process.cwd(),sqlite=new DatabaseSync(":memory:");
for(const file of fs.readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort())sqlite.exec(fs.readFileSync("drizzle/"+file,"utf8"));
let d1Queries=0;
class Statement{constructor(query,values=[]){this.query=query;this.values=values;}bind(...values){return new Statement(this.query,values);}async raw(){d1Queries++;const rows=sqlite.prepare(this.query).all(...this.values);return rows.map(r=>Object.values(r));}async all(){d1Queries++;const st=sqlite.prepare(this.query);const results=st.all(...this.values);return {results,success:true,meta:{changes:0}};}async run(){d1Queries++;const r=sqlite.prepare(this.query).run(...this.values);return {results:[],success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}async first(){d1Queries++;return sqlite.prepare(this.query).get(...this.values)||null;}}
const DB={prepare:query=>new Statement(query),batch:async statements=>{sqlite.exec("BEGIN");try{const out=[];for(const s of statements){d1Queries++;const st=sqlite.prepare(s.query);const result=st.all(...s.values);out.push({results:result,success:true,meta:{changes:0}});}sqlite.exec("COMMIT");return out;}catch(e){sqlite.exec("ROLLBACK");throw e;}}};
const env={DB,ADMIN_EMAIL:"owner@example.invalid",UPDATE_TOKEN:"test-service-key",SITE_ORIGIN:"https://example.invalid",SITE_PUBLIC:"false"};
let requestHeaders=new Headers();
let sourceFetches=0;
const sourceFetch=async url=>{sourceFetches++;if(String(url).includes('feeds.feedburner.com'))return new Response(`<rss><channel><item><title>A new cruise destination announcement</title><link>https://www.breakingtravelnews.com/news/article/feed-check-rss-cruise/</link><pubDate>${new Date().toUTCString()}</pubDate></item><item><title>Another new cruise itinerary announcement</title><link>https://www.breakingtravelnews.com/news/article/feed-check-rss-cruise-two/</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`,{headers:{'Content-Type':'application/rss+xml'}});if(/\/news\/fixture-announcement|\/20\d{2}\/\d{2}\/\d{2}\/fixture|\/press\/press-releases\/20\d{2}-\d{2}-\d{2}-fixture/.test(String(url)))return new Response(`<meta property="og:title" content="A new cruise itinerary announcement"><meta property="article:published_time" content="${new Date().toISOString()}">`);const date=new Date().toISOString().slice(0,10);if(String(url).includes('carnival-news.com'))return new Response(`<a href="/news/australia">Navigation</a><a href="/${date.replaceAll('-','/')}/fixture-announcement">Announcement</a><a href="/${date.replaceAll('-','/')}/fixture-announcement-two">Another announcement</a>`);if(String(url).includes('viking.com'))return new Response(`<a href="/press/press-releases/${date}-fixture-announcement.html">Announcement</a><a href="/press/press-releases/${date}-fixture-announcement-two.html">Another announcement</a>`);return new Response('<a href="/news/fixture-announcement">Announcement</a><a href="/news/fixture-announcement-two">Another announcement</a>');};
class FixtureRewriter{handlers=[];on(selector,handler){this.handlers.push([selector,handler]);return this;}transform(response){return new Response(new ReadableStream({start:async controller=>{const html=await response.text();for(const [selector,handler]of this.handlers){const tag=selector.startsWith("meta")?"meta":selector.startsWith("a")?"a":"link";const matches=html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`,'g'));for(const match of matches){const attrs=Object.fromEntries([...match[1].matchAll(/([a-z:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));handler.element({getAttribute:key=>attrs[key]||null});}}controller.enqueue(new TextEncoder().encode(html));controller.close();}}));}}
const context=vm.createContext({console,URL,URLSearchParams,Request,Response,Headers,crypto,TextEncoder,TextDecoder,Date,performance,setTimeout,clearTimeout,AbortSignal,ReadableStream,HTMLRewriter:FixtureRewriter,fetch:sourceFetch});
const cache=new Map();
function synthetic(name,namespace){const m=new vm.SyntheticModule(Object.keys(namespace),function(){for(const[k,v]of Object.entries(namespace))this.setExport(k,v);},{context,identifier:name});return m;}
async function moduleFor(id){
 if(cache.has(id))return cache.get(id);
 let m;
 if(id.endsWith(".css"))m=synthetic(id,{});
 else if(id==="cloudflare:workers")m=synthetic(id,{env});
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
const utilities=await get("lib/client-utils.ts");assert.equal(utilities.LINES.length,12);assert.equal(content.trustedSources.length,13);assert.deepEqual([...utilities.CRUISE_LINE_SLUGS].sort(),Array.from(content.trustedSources.filter(x=>x.line!=="general"),x=>x.line).sort());
const expandedSources=content.trustedSources.slice(4);const expandedNews=expandedSources.map(s=>content.inputSchema.parse({...news,line:s.line,title:`Verified ${s.name} news fixture`,sourceUrl:new URL("/feed-check-expanded-"+s.line,s.url).href,sourceName:s.name}));
for(const s of expandedSources){assert.equal(content.trusted(s.url),true);assert.equal(content.trusted(new URL(s.url).origin+".unapproved.invalid/story"),false);}assert.throws(()=>content.inputSchema.parse({...news,line:"unapproved-line"}));
assert.equal((await content.ingestNews(expandedNews)).added,expandedSources.length);assert.equal((await content.ingestNews(expandedNews)).duplicates,expandedSources.length);for(const s of expandedSources)assert.equal((await content.publicEntries({kind:"news",line:s.line,all:true})).items.length,1);
const savedInstructions=await (await sys.GET(new Request("https://example.invalid/api/system/instructions",{headers:{"X-Update-Token":env.UPDATE_TOKEN}}),{params:Promise.resolve({action:"instructions"})})).json();assert.equal(savedInstructions.sources.length,13);for(const s of expandedSources)assert.ok(savedInstructions.writer.body.news[0].line.includes(s.line));
const linePage=renderToStaticMarkup(await publicPage.default({params:Promise.resolve({path:["cruise-lines","cunard"]}),searchParams:Promise.resolve({})}));assert.ok(linePage.includes("Cunard"));assert.ok(linePage.includes("feed-check-expanded-cunard"));
console.log("PASS: twelve cruise lines and the selected news publisher have matching validation and sources; expanded feeds ingest and filter correctly, reject lookalike domains, suppress duplicates, and appear in saved refresh instructions and line pages.");
const collector=await get("lib/news-refresh.ts");
const carnivalSource=content.trustedSources.find(x=>x.line==='carnival'),vikingSource=content.trustedSources.find(x=>x.line==='viking');
assert.equal(collector.sourceAnnouncement('https://www.carnival-news.com/news/australia',carnivalSource),false);
assert.equal(collector.sourceAnnouncement('https://www.carnival-news.com/2026/10/08/a-new-sailing',carnivalSource),true);
assert.equal(collector.sourceAnnouncement('https://www.viking.com/press/press-releases/2026-10-07-a-new-ship.html',vikingSource),true);
const approved=content.trustedSources[0];assert.equal(collector.approvedForSource("https://www.tuigroup.com/news/story",approved),true);assert.equal(collector.approvedForSource("https://tuigroup.com.attacker.invalid/news/story",approved),false);assert.equal(collector.approvedForSource("https://user:password@www.tuigroup.com/news/story",approved),false);
assert.equal(collector.recentDate("not a date"),null);assert.equal(collector.recentDate("2000-01-01"),null);assert.equal(collector.recentDate("2999-01-01"),null);assert.equal(collector.recentDate(new Date(Date.now()+3600000).toISOString()),null);
sourceFetches=0;assert.equal((await collector.runNewsRefresh(env)).paused,true);assert.equal(sourceFetches,0);
await content.setSetting("paused","false");const savedBefore=await content.allContent();d1Queries=0;const collected=await collector.runNewsRefresh(env);assert.ok(d1Queries<50,`Collector used ${d1Queries} D1 queries`);assert.ok(collected.added>0);assert.equal(collected.failures.length,0);const queued=(await content.allContent()).filter(x=>x.groupKey.startsWith("collector:"));assert.equal(queued.length,collected.added);assert.ok(queued.every(x=>x.status==="published"&&x.kind==="news"));assert.equal((await collector.runNewsRefresh(env)).added,0);
const liveNews=await content.publicEntries({kind:'news',all:true});assert.ok(queued.every(x=>liveNews.items.some(n=>n.id===x.id)));
assert.deepEqual((await content.allContent()).filter(x=>x.kind!=='news').map(x=>JSON.stringify(x)).sort(),savedBefore.filter(x=>x.kind!=='news').map(x=>JSON.stringify(x)).sort());
sourceFetches=0;await collector.refreshNewsIfDue(env);assert.equal(sourceFetches,0);
sqlite.prepare("UPDATE content SET status='draft' WHERE id=?").run(queued[0].id);assert.equal((await collector.runNewsRefresh(env)).added,1);assert.equal((await content.allContent()).find(x=>x.id===queued[0].id).status,'published');
sqlite.prepare("UPDATE content SET status='draft',title='Administrator edited this news',revision=2 WHERE id=?").run(queued[1].id);assert.equal((await collector.runNewsRefresh(env)).added,0);const protectedDraft=(await content.allContent()).find(x=>x.id===queued[1].id);assert.equal(protectedDraft.status,'draft');assert.equal(protectedDraft.title,'Administrator edited this news');
context.fetch=async url=>{await content.setSetting('paused','true');return String(url).includes('/news/pause-test-story')?new Response(`<meta property="og:title" content="A new paused cruise announcement"><meta property="article:published_time" content="${new Date().toISOString()}">`):new Response('<a href="/news/pause-test-story">Announcement</a>');};const pauseSnapshot=(await content.allContent()).map(x=>JSON.stringify(x)).sort();assert.equal((await collector.runNewsRefresh(env)).added,0);assert.deepEqual((await content.allContent()).map(x=>JSON.stringify(x)).sort(),pauseSnapshot);assert.equal(await content.setting('paused'),'true');await content.setSetting('paused','false');context.fetch=sourceFetch;
assert.ok((await content.allContent()).length>=savedBefore.length);const q=queued[0];await content.remove(q.id);assert.equal((await collector.runNewsRefresh(env)).added,0);assert.equal((await content.allContent()).find(x=>x.id===q.id).status,"archived");
context.fetch=async()=>new Response("Blocked",{status:403});const beforeFailure=(await content.allContent()).map(x=>JSON.stringify(x)).sort();const failed=await collector.runNewsRefresh(env);assert.equal(failed.failures.length,13);assert.deepEqual((await content.allContent()).map(x=>JSON.stringify(x)).sort(),beforeFailure);assert.ok((await content.setting("last_error")).includes("source could not be read"));
await content.setSetting("collector_lock",String(Date.now()+60000));assert.equal((await collector.runNewsRefresh(env)).busy,true);
console.log("PASS: collector pause, date validation, approved hosts, automatic public news links, preserved original drafts/edited news, duplicate/archived suppression, concurrent-run lease and failure preservation.");

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

// Full restore flow from a valid session and an auth-only database.
const restore=await get('lib/backup-restore.ts');
const recoverySqlite=new DatabaseSync(':memory:');let recoveryQueries=0;
class RecoveryStatement{constructor(q,values=[]){this.q=q;this.values=values;}bind(...values){return new RecoveryStatement(this.q,values);}async first(){recoveryQueries++;return recoverySqlite.prepare(this.q).get(...this.values)||null;}async run(){recoveryQueries++;const result=recoverySqlite.prepare(this.q).run(...this.values);return {success:true,results:[],meta:{changes:Number(result.changes)}};}}
const recoveryDB={prepare:q=>new RecoveryStatement(q),async batch(statements){recoverySqlite.exec('BEGIN');try{const results=statements.map(s=>{recoveryQueries++;const rows=recoverySqlite.prepare(s.q).all(...s.values),changes=recoverySqlite.prepare('SELECT changes() AS n').get().n;return {success:true,results:rows,meta:{changes}};});recoverySqlite.exec('COMMIT');return results;}catch(e){recoverySqlite.exec('ROLLBACK');throw e;}}};
const recoveryCookie=session.sessionCookie(await session.createSession(recoveryDB));
const backupJSON=JSON.parse(fs.readFileSync('transfer-data/site-backup.json','utf8'));
const restoreRequest=(backup,headers={})=>{const form=new FormData();form.set('backup',new Blob([JSON.stringify(backup)],{type:'application/json'}),'site-backup.json');return new Request('https://example.invalid/admin/restore',{method:'POST',headers:{origin:'https://example.invalid',cookie:recoveryCookie,...headers},body:form});};
assert.equal((await restore.restoreBackup(new Request('https://example.invalid/admin/restore'),{DB:recoveryDB})).status,303);
assert.equal((await restore.restoreBackup(restoreRequest(backupJSON,{origin:'https://attacker.invalid'}),{DB:recoveryDB})).status,403);
assert.equal((await restore.restoreBackup(restoreRequest({content:[{title:'bad'}]}),{DB:recoveryDB})).status,400);
assert.equal(recoverySqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='content'").get().n,0);
recoveryQueries=0;let restoredResponse=await restore.restoreBackup(restoreRequest(backupJSON),{DB:recoveryDB});assert.equal(restoredResponse.status,200,await restoredResponse.clone().text());assert.ok((await restoredResponse.text()).includes('33 saved records added'));assert.ok(recoveryQueries<30);
let recovered=await (await nativeAdmin.adminData(nativeRequest('',recoveryCookie),{DB:recoveryDB})).json();assert.equal(recovered.items.length,33);assert.equal(recovered.items.filter(x=>x.kind==='news').length,30);assert.equal(recovered.items.filter(x=>x.status==='draft').length,backupJSON.content.filter(x=>x.status==='draft').length);
for(const row of backupJSON.content){const actual=recoverySqlite.prepare('SELECT * FROM content WHERE id=?').get(row.id);assert.equal(JSON.stringify(actual),JSON.stringify(row));}
recoverySqlite.prepare('UPDATE content SET title=?,hidden=1,status=? WHERE id=?').run('A newer protected edit','archived',backupJSON.content[0].id);recoverySqlite.prepare("INSERT INTO settings(key,value) VALUES('paused','true')").run();const preserved=recoverySqlite.prepare('SELECT * FROM content ORDER BY id').all();
const withSecret={...backupJSON,settings:[...backupJSON.settings,{key:'ADMIN_PASSWORD_HASH',value:'must-not-import'},{key:'paused',value:'false'}]};restoredResponse=await restore.restoreBackup(restoreRequest(withSecret),{DB:recoveryDB});assert.equal(restoredResponse.status,200);assert.ok((await restoredResponse.text()).includes('0 saved records added'));assert.deepEqual(recoverySqlite.prepare('SELECT * FROM content ORDER BY id').all(),preserved);assert.equal(recoverySqlite.prepare("SELECT value FROM settings WHERE key='paused'").get().value,'true');assert.equal(recoverySqlite.prepare("SELECT count(*) AS n FROM settings WHERE key='ADMIN_PASSWORD_HASH'").get().n,0);assert.equal(await session.validSession(recoveryDB,recoveryCookie),true);
const camelBackup=await (await nativeAdmin.adminData(nativeRequest('?export=1',recoveryCookie),{DB:recoveryDB})).json();assert.equal((await restore.restoreBackup(restoreRequest(camelBackup),{DB:recoveryDB})).status,200);
recoverySqlite.exec("CREATE TRIGGER fail_restore BEFORE INSERT ON content WHEN NEW.id='restore-fail' BEGIN SELECT RAISE(ABORT,'fixture restore failure'); END;");const countBefore=recoverySqlite.prepare('SELECT count(*) AS n FROM audit').get().n;assert.equal((await restore.restoreBackup(restoreRequest({...backupJSON,content:[{...backupJSON.content[0],id:'restore-first',slug:'restore-first',source_url:''},{...backupJSON.content[0],id:'restore-fail',slug:'restore-fail',source_url:''}]}),{DB:recoveryDB})).status,503);assert.deepEqual(recoverySqlite.prepare('SELECT * FROM content ORDER BY id').all(),preserved);assert.equal(recoverySqlite.prepare('SELECT count(*) AS n FROM audit').get().n,countBefore);
console.log('PASS: authenticated backup upload repairs an auth-only database, restores all 33 records exactly, stays under 30 D1 queries, rejects anonymous/cross-site/invalid uploads, preserves newer edits/archived suppression/pause/sessions, ignores secret settings, accepts dashboard exports and rolls back failed content writes.');

const rss=await get('lib/rss.ts');
const parsed=rss.parseRss(fs.readFileSync('scripts/fixtures/breaking-cruise-rss.xml','utf8'));assert.ok(parsed.length>=5);assert.ok(parsed.every(item=>item.url.startsWith('https://www.breakingtravelnews.com/news/article/')));assert.equal(rss.rssText('Sea &amp; sunshine &#8217; <![CDATA[cruise]]>'),'Sea & sunshine ’ cruise');assert.equal(rss.parseRss('<!DOCTYPE rss><rss><item><title>Unsafe</title></item></rss>').length,0);

assert.ok(!homeHtml.includes('news-ticker'));assert.ok(!feedHtml.includes('news-ticker'));
console.log('PASS: RSS news cards remain enabled and the scrolling breaking-news strip is absent from home and news pages.');

const photos=await get('lib/news-photos.ts');
const samplePhoto=(title,line='general')=>photos.newsPhoto({sourceUrl:'https://www.breakingtravelnews.com/news/article/'+title.toLowerCase().replaceAll(' ','-'),line,title});
assert.equal(samplePhoto('Atlas Antarctica season').src,'/photos/antarctic-iceberg.webp');
assert.equal(samplePhoto('Virgin Voyages Caribbean sale').src,'/photos/virgin-resilient-lady.webp');
assert.equal(samplePhoto('Holland America Alaska sailings').src,'/photos/alaska-fjord.webp');
assert.equal(samplePhoto('New Egypt riverboat').src,'/photos/river-nile.webp');
assert.equal(samplePhoto('Carnival Freedom dry dock').src,'/photos/carnival-freedom.webp');
const lineImages=Array.from(utilities.CRUISE_LINE_SLUGS,line=>samplePhoto('Latest fleet announcement',line));assert.equal(new Set(lineImages.map(x=>x.src)).size,12);
for(const photo of lineImages){assert.ok(photo.src.startsWith('/photos/'));assert.ok(fs.existsSync('public'+photo.src));assert.ok(photo.credit&&photo.license&&photo.creditUrl);}
const fallbackItems=Array.from({length:20},(_,i)=>samplePhoto('Cruise travel news '+i));assert.ok(new Set(fallbackItems.map(x=>x.src)).size>=3);assert.deepEqual(samplePhoto('Cruise travel news 1'),samplePhoto('Cruise travel news 1'));
console.log('PASS: photos match ship, brand and destination; all twelve lines have locally served photos with credits, and unmatched stories get varied stable cruise photos.');

const seo=await get('lib/seo.ts'),domainRedirect=await get('lib/public-domain.ts');
const seoOrigin=env.SITE_ORIGIN;env.SITE_ORIGIN='https://cruisingwithwendy.co.uk';
const homeSEO=await home.generateMetadata();assert.equal(homeSEO.title.absolute,seo.HOME_TITLE);assert.equal(homeSEO.alternates.canonical,'https://cruisingwithwendy.co.uk/');assert.equal(homeSEO.openGraph.url,homeSEO.alternates.canonical);assert.equal(homeSEO.twitter.title,seo.HOME_TITLE);
const liveNewsSEO=await publicPage.generateMetadata({params:Promise.resolve({path:['news']}),searchParams:Promise.resolve({})});assert.equal(liveNewsSEO.robots.index,true);assert.equal(liveNewsSEO.openGraph.url,'https://cruisingwithwendy.co.uk/news');assert.ok(liveNewsSEO.description.includes('twelve cruise lines'));
const filteredSEO=await publicPage.generateMetadata({params:Promise.resolve({path:['news']}),searchParams:Promise.resolve({q:['Marella','Viking']})});assert.equal(filteredSEO.robots.index,false);assert.equal(filteredSEO.robots.follow,true);assert.equal(filteredSEO.alternates.canonical,'https://cruisingwithwendy.co.uk/news');assert.ok(!(await robots.GET().text()).includes('Disallow: /*?'));
const brokenSEO=await publicPage.generateMetadata({params:Promise.resolve({path:['news','missing']}),searchParams:Promise.resolve({})});assert.equal(brokenSEO.robots.index,false);
for(const line of utilities.LINES){const meta=await publicPage.generateMetadata({params:Promise.resolve({path:['cruise-lines',line.slug]}),searchParams:Promise.resolve({})});assert.ok(meta.title.includes(line.name));assert.equal(meta.openGraph.url,'https://cruisingwithwendy.co.uk/cruise-lines/'+line.slug);}
const domainEnv={SITE_ORIGIN:env.SITE_ORIGIN,SITE_PUBLIC:'true',ACCESS_MODE:'public'};
for(const host of ['www.cruisingwithwendy.co.uk','cruising-with-wendy.kmvbcbwmw2.workers.dev'])for(const protocol of ['https:','http:']){const r=domainRedirect.publicDomainRedirect(new Request(protocol+'//'+host+'/news?q=ship&line=viking'),domainEnv);assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://cruisingwithwendy.co.uk/news?q=ship&line=viking');}
for(const url of ['https://cruisingwithwendy.co.uk/news','https://unapproved.invalid/news','https://www.cruisingwithwendy.co.uk/admin','https://www.cruisingwithwendy.co.uk/api/system/state'])assert.equal(domainRedirect.publicDomainRedirect(new Request(url),domainEnv),null);
assert.equal(domainRedirect.publicDomainRedirect(new Request('https://www.cruisingwithwendy.co.uk/news',{method:'POST'}),domainEnv),null);assert.equal(domainRedirect.publicDomainRedirect(new Request('https://www.cruisingwithwendy.co.uk/news',{headers:{'X-Update-Token':'test-only'}}),domainEnv),null);assert.equal(domainRedirect.publicDomainRedirect(new Request('https://www.cruisingwithwendy.co.uk/news'),{...domainEnv,ACCESS_MODE:'private'}),null);
const sitemapGuideId=await content.addDraft({...input,title:'An older published cruise guide sitemap fixture',publishedAt:'2025-01-01T00:00:00Z'});await content.publish(sitemapGuideId);const guideForSitemap=(await content.publicEntries({kind:'guide',all:true})).items[0];assert.ok(guideForSitemap);
const insertSEO=sqlite.prepare("INSERT INTO content(id,slug,kind,status,title,excerpt,body,line,source_url,source_name,sources,published_at,created_at,updated_at) VALUES(?,?,'news','published','Sitemap overflow cruise news fixture','A synthetic cruise-news fixture.','','general',?,'Fixture','[]','2026-10-14T00:00:00Z','2026-10-14T00:00:00Z','2026-10-14T00:00:00Z')");
for(let i=0;i<1005;i++)insertSEO.run('seo-fixture-'+i,'seo-fixture-'+i,'https://www.breakingtravelnews.com/news/article/seo-fixture-'+i);
const seoMap=await (await sitemap.GET()).text();assert.ok(seoMap.includes('https://cruisingwithwendy.co.uk/read/'+guideForSitemap.slug));assert.ok(!seoMap.includes('/read/seo-fixture-'));assert.ok(!seoMap.includes('/admin'));assert.ok(!seoMap.includes('workers.dev'));assert.ok(seoMap.includes('<lastmod>'));
const layout=await get('app/layout.tsx'),{createElement}=await import('react');const layoutHtml=renderToStaticMarkup(createElement(layout.default,{children:createElement('main',null,'SEO fixture')}));const graph=JSON.parse(layoutHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);assert.ok(graph['@graph'].some(x=>x['@type']==='Organization'&&x.logo.url==='https://cruisingwithwendy.co.uk/brand/wendy-logo.webp'));assert.ok(graph['@graph'].some(x=>x['@type']==='WebSite'&&x.url==='https://cruisingwithwendy.co.uk/'));
env.SITE_ORIGIN=seoOrigin;
console.log('PASS: canonical-domain SEO, unique social metadata, twelve line pages, crawlable noindex filters, safe permanent redirects, structured website/organisation data, and original-guide sitemap coverage after 1,000+ news items.');

const contactHtml=renderToStaticMarkup(await publicPage.default({params:Promise.resolve({path:['about']}),searchParams:Promise.resolve({})}));
assert.ok(contactHtml.includes('id="contact"'));
assert.ok(contactHtml.includes('href="mailto:enquirer@cruisingwithwendy.co.uk"'));
assert.ok(layoutHtml.includes('href="/about#contact">Contact us</a>'));
assert.ok(graph['@graph'].some(x=>x['@type']==='Organization'&&x.email==='enquirer@cruisingwithwendy.co.uk'));
assert.ok(!contactHtml.includes('intro42@aol.com')&&!layoutHtml.includes('intro42@aol.com'));
console.log('PASS: public contact email, site-wide contact link, organisation email schema and private forwarding destination.');

const cruiseDeals=await get('lib/cruise-deals.ts');
for(let previous=0;previous<3;previous++)for(const random of [0,0.49,0.99]){
 const next=cruiseDeals.nextDealOrder(previous,()=>random);
 const before=cruiseDeals.orderedCruiseDeals(previous),after=cruiseDeals.orderedCruiseDeals(next);
 assert.deepEqual(after.map(x=>x.id).sort(),before.map(x=>x.id).sort());
 assert.ok(after.every((item,index)=>item.id!==before[index].id));
}
const dealsHtml=renderToStaticMarkup(await publicPage.default({params:Promise.resolve({path:['hot-cruise-deals']}),searchParams:Promise.resolve({})}));
assert.equal((dealsHtml.match(/data-deal-id=/g)||[]).length,3);
for(const mid of ['68716','5919','60697'])assert.ok(dealsHtml.includes('https://www.awin1.com/cread.php?awinmid='+mid+'&amp;awinaffid=3125110'));
assert.equal((dealsHtml.match(/rel="sponsored noopener noreferrer"/g)||[]).length,3);
assert.ok(dealsHtml.includes('Advertisement')&&dealsHtml.includes('may earn a commission'));
assert.ok(!dealsHtml.includes('£')&&!dealsHtml.includes('limited time'));
assert.ok(layoutHtml.includes('href="/hot-cruise-deals">Hot Cruise deals</a>'));
assert.ok(!layoutHtml.includes('href="/guides"'));
await assert.rejects(()=>publicPage.default({params:Promise.resolve({path:['guides']}),searchParams:Promise.resolve({})}),/Redirect \/hot-cruise-deals/);
const dealsMeta=await publicPage.generateMetadata({params:Promise.resolve({path:['hot-cruise-deals']}),searchParams:Promise.resolve({})});
assert.ok(dealsMeta.alternates.canonical.endsWith('/hot-cruise-deals'));
assert.ok(seoMap.includes('/hot-cruise-deals')&&!seoMap.includes('<loc>https://cruisingwithwendy.co.uk/guides</loc>'));
console.log('PASS: three correctly tracked cruise partners, sponsored links and disclosure, every card changes position between visits, guides redirect, replacement navigation and deals SEO.');
