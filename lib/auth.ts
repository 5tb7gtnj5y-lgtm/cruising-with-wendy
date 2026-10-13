import {env} from "cloudflare:workers";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {equal,validSession} from "./session";
export async function adminApi(){return validSession(env.DB,(await headers()).get("cookie"));}
export async function adminPage(){if(!await adminApi())redirect("/admin/login");}
export function serviceAuth(request:Request){const value=request.headers.get("X-Update-Token");return !!env.UPDATE_TOKEN&&!!value&&equal(value,env.UPDATE_TOKEN);}
export function sameOrigin(request:Request){const u=new URL(request.url),o=request.headers.get("origin");return !!o&&o===u.origin&&request.headers.get("sec-fetch-site")!=="cross-site";}
