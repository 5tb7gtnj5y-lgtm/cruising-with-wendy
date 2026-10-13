import { adminPage } from "@/lib/auth";import { Dashboard } from "@/components/dashboard";

export const dynamic="force-dynamic";export const metadata={title:"Administrator",robots:{index:false,follow:false}};
export default async function Admin(){await adminPage();return <main className="page-container" id="main"><div className="admin-top"><div className="page-heading"><p className="eyebrow">YOUR EDITORIAL DESK</p><h1>A little behind the scenes.</h1><p>Review the next story, keep things fresh and make the site your own.</p></div><form action="/api/admin/session" method="post"><input type="hidden" name="action" value="logout"/><button className="button ghost" type="submit">Sign out</button></form></div><Dashboard/></main>;}

