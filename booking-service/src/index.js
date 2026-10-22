import catalog from './catalog.json' with {type:'json'};
import {HttpError,assert,identity,requireUser,readBody,sameOrigin,isAdmin,createBooking,updateBooking,customerRecord} from './core.js';
import {page} from './ui.js';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const json=(body,status=200)=>Response.json(body,{status,headers});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,user=identity(request);
 try{
  if(path==='/health')return json({service:'Booking Central',ready:Boolean(env.DB)});
  assert(env.DB,503,'The booking service is temporarily unavailable. Please try again later.');
  const admin=await isAdmin(env.DB,user,env.ADMIN_EMAIL);
  if(path==='/api/catalog'&&request.method==='GET')return json(catalog);
  if(path==='/api/me'&&request.method==='GET')return json({user:user?{email:user.email}:null,admin});
  if(path==='/api/bookings'&&request.method==='GET'){
   const u=requireUser(request);const r=await env.DB.prepare('SELECT * FROM bookings WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(u.id).all();return json(r.results.map(customerRecord));
  }
  if(path==='/api/admin/bookings'&&request.method==='GET'){
   requireUser(request);assert(admin,403,'Administrator access is required.');
   const status=url.searchParams.get('status')||'pending';assert(['pending','confirmed','declined','cancelled','all'].includes(status),400,'Invalid status.');
   const query=status==='all'?env.DB.prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 250'):env.DB.prepare('SELECT * FROM bookings WHERE status=? ORDER BY created_at DESC LIMIT 250').bind(status);
   const r=await query.all();return json(r.results.map(customerRecord));
  }
  if(path==='/api/bookings'&&request.method==='POST'){
   const u=requireUser(request);sameOrigin(request);const record=await createBooking(env.DB,u,await readBody(request),catalog);return json(customerRecord(record),201);
  }
  const update=path.match(/^\/api\/bookings\/([a-f0-9-]{36})$/i);
  if(update&&request.method==='PATCH'){
   const u=requireUser(request);sameOrigin(request);const record=await updateBooking(env.DB,u,update[1],await readBody(request),admin);return json(customerRecord(record));
  }
  if(path.startsWith('/api/'))throw new HttpError(404,'Not found.');
  if(!['/','/book','/bookings','/admin','/privacy'].includes(path))return new Response('Page not found',{status:404,headers});
  if(path!=='/privacy'&&!user){const target=path==='/'?'/bookings':path+url.search;return Response.redirect(url.origin+'/signin-with-chatgpt?return_to='+encodeURIComponent(target),302);}
  if(path==='/admin')assert(admin,403,'This account does not have administrator access.');
  const nonce=crypto.randomUUID().replaceAll('-','');
  return new Response(page({path:path==='/'?'/bookings':path,user:user?{email:user.email}:null,admin,catalog,query:Object.fromEntries(url.searchParams),nonce}),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src https://lgdjoe.github.io data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`}});
 }catch(error){const status=error instanceof HttpError?error.status:500; if(status===500)console.error('Booking request failed',String(error)); const message=status===500?'Something went wrong. Please try again.':error.message;
  if(path.startsWith('/api/'))return json({error:message},status);
  return new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>Booking Central</title><h1>Booking Central</h1><p>'+message.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;')+'</p><a href="/bookings">My bookings</a> · <a href="https://lgdjoe.github.io/booking-central/">Browse venues</a>',{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 }
}};
