import { absolute, isPublic } from "@/lib/site";export const dynamic="force-dynamic";export function GET(){return new Response(isPublic()?"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /*?\nSitemap: "+absolute("/sitemap.xml")+"\n":"User-agent: *\nDisallow: /\n",{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=300"}});}

