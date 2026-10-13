export async function readAdminResponse(response:Response){
 if(response.redirected&&new URL(response.url).pathname==="/admin/login")throw Error("Your administrator session has ended. Please sign in again.");
 const text=await response.text();let data:unknown;
 try{if(!text.trim())throw Error();data=JSON.parse(text);}catch{throw Error(response.ok?"The dashboard received an incomplete response. Please try again.":"The news service could not complete this request. Please try again.");}
 if(!response.ok){const error=data&&typeof data==="object"&&"error" in data&&typeof data.error==="string"?data.error:"The dashboard request could not be completed.";throw Error(error);}
 return data;
}
