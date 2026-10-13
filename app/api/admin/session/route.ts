import {env} from "cloudflare:workers";
import {sameOrigin} from "@/lib/auth";
import {verifyPassword,loginAllowed,createSession,sessionCookie,tokenFromCookie,digest} from "@/lib/session";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const fail=(message:string,status=400)=>Response.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
 if(!sameOrigin(request))return fail("Open the sign-in page on this site.",403);
 if(!env.DB||!env.ADMIN_PASSWORD_HASH)return fail("Administrator sign-in has not been configured.",503);
 if(!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))return fail("Invalid form.");
 const text=await request.text();if(text.length>2048)return fail("Form too large.",413);const form=new URLSearchParams(text);
 if(form.get("action")==="logout"){const token=tokenFromCookie(request.headers.get("cookie"));if(token)await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await digest(token)).run();return new Response(null,{status:303,headers:{Location:"/admin/login","Set-Cookie":sessionCookie("",true),"Cache-Control":"no-store"}});}
 const ip=request.headers.get("CF-Connecting-IP");if(!ip)return fail("Open the deployed Cloudflare site to sign in.",403);
 if(!await loginAllowed(env.DB,ip))return fail("Too many attempts. Try again in 15 minutes.",429);
 if(!await verifyPassword(form.get("password")||"",env.ADMIN_PASSWORD_HASH))return new Response(null,{status:303,headers:{Location:"/admin/login?error=1","Cache-Control":"no-store"}});
 const token=await createSession(env.DB);return new Response(null,{status:303,headers:{Location:"/admin","Set-Cookie":sessionCookie(token),"Cache-Control":"no-store"}});
}
