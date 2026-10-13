import handler from "vinext/server/fetch-handler";
import {validSession} from "./lib/session";
import {runNewsRefresh} from "./lib/news-refresh";
import {handleSignIn,handleSignOut,loginPage} from "./lib/worker-login";
import {adminData} from "./lib/admin-data";
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const url=new URL(request.url);if(url.protocol!=="https:"){url.protocol="https:";return Response.redirect(url.href,308);}
  const path=url.pathname;
  if(path==="/admin/login"&&request.method==="GET")return loginPage(request);
  if(path==="/api/admin/sign-in")return handleSignIn(request,env);
  if(path==="/api/admin/session")return handleSignOut(request,env);
  if(path==="/api/admin"&&request.method==="GET")return adminData(request,env);
  const login=path==="/admin/login"||path==="/api/admin/session",asset=/^\/(assets\/|_next\/static\/|_vinext\/)/.test(path)||/\.(svg|png|jpe?g|webp|avif|ico)$/.test(path),system=path.startsWith("/api/system/");
  if(asset&&env.ASSETS){const response=await env.ASSETS.fetch(request);if(response.status!==404)return response;}
  if(env.ACCESS_MODE!=="public"&&!login&&!asset&&!system){
   let signedIn=false;try{signedIn=await validSession(env.DB,request.headers.get("cookie"));}catch{return new Response(null,{status:303,headers:{Location:"/admin/login?error=database","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});}
   if(!signedIn)return new Response(null,{status:303,headers:{Location:"/admin/login","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
  }
  const response=await handler.fetch(request,env,ctx),headers=new Headers(response.headers);
  headers.set("X-Content-Type-Options","nosniff");headers.set("Referrer-Policy","strict-origin-when-cross-origin");
  if(env.ACCESS_MODE!=="public"||path.startsWith("/admin")||path.startsWith("/api/")){headers.set("Cache-Control","private, no-store");headers.set("X-Robots-Tag","noindex, nofollow");}else if(env.SITE_PUBLIC!=="true")headers.set("X-Robots-Tag","noindex, nofollow");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 },
 scheduled(_event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(runNewsRefresh(env));}
};
