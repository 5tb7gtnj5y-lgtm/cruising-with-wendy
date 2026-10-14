const aliases=new Set(["www.cruisingwithwendy.co.uk","cruising-with-wendy.kmvbcbwmw2.workers.dev"]);
// Move public reading URLs permanently, without forwarding service credentials,
// administrator requests or writes to another host.
export function publicDomainRedirect(request:Request,env:{SITE_ORIGIN?:string;SITE_PUBLIC?:string;ACCESS_MODE?:string}){
 if(env.SITE_PUBLIC!=="true"||env.ACCESS_MODE!=="public"||!env.SITE_ORIGIN||!["GET","HEAD"].includes(request.method))return null;
 const url=new URL(request.url);
 if(!aliases.has(url.hostname)||/^\/(?:admin|api)(?:\/|$)/.test(url.pathname)||request.headers.has("X-Update-Token")||request.headers.has("Authorization")||request.headers.has("OAI-Sites-Authorization"))return null;
 const target=new URL(env.SITE_ORIGIN);if(target.protocol!=="https:"||target.hostname===url.hostname)return null;
 target.pathname=url.pathname;target.search=url.search;
 return Response.redirect(target.href,308);
}
