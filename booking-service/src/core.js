export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const assert=(condition,status,message)=>{if(!condition)throw new HttpError(status,message);};
const trim=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function identity(request){const id=request.headers.get('oai-authenticated-user-id');return id?{id,email:request.headers.get('oai-authenticated-user-email')||''}:null;}
export function requireUser(request){const user=identity(request);assert(user,401,'Sign in to continue.');return user;}
export async function readBody(request){
 assert((request.headers.get('content-type')||'').startsWith('application/json'),415,'Use JSON for this request.');
 const reader=request.body?.getReader();assert(reader,400,'Request body is missing.');let size=0,parts=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();throw new HttpError(413,'Request is too large.');}parts.push(value);}
 const merged=new Uint8Array(size);let offset=0;for(const p of parts){merged.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder().decode(merged));}catch{throw new HttpError(400,'Invalid request.');}
}
export function sameOrigin(request){assert(request.headers.get('origin')===new URL(request.url).origin,403,'Reload the page and try again.');}
export function today(zone,now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validateBooking(body,catalog,now=new Date()){
 const venue=catalog.find(v=>v.id===Number(body.venueId));assert(venue,400,'Choose a valid venue.');
 const facility=venue.facilities.find(f=>f.id===Number(body.facilityId));assert(facility,400,'Choose a valid facility.');
 const name=trim(body.name,100),email=trim(body.email,254).toLowerCase(),phone=trim(body.phone,30),date=trim(body.date,10),time=trim(body.time,5),notes=trim(body.notes,1000),requestKey=trim(body.requestKey,80);
 assert(name.length>=2,400,'Enter your full name.');assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),400,'Enter a valid email address.');assert(/^[+\d ()-]{7,30}$/.test(phone)&&phone.replace(/\D/g,'').length>=7,400,'Enter a valid phone number.');
 assert(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date,400,'Choose a valid date.');
 assert(date>=today(venue.timezone,now),400,'Choose today or a future date.');assert(date<=today(venue.timezone,new Date(now.getTime()+365*86400000)),400,'Choose a date within the next year.');
 assert(/^([01]\d|2[0-3]):[03]0$/.test(time),400,'Choose a time in 30-minute steps.');
 const duration=Number(body.duration),start=Number(time.slice(0,2))*60+Number(time.slice(3));
 assert(Number.isInteger(duration)&&duration>=30&&duration<=360&&duration%30===0,400,'Choose a duration from 30 minutes to 6 hours.');
 assert(start+duration<=1440,400,'The session must finish before midnight.');
 if(date===today(venue.timezone,now)){const local=new Intl.DateTimeFormat('en-GB',{timeZone:venue.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);assert(time>local,400,'Choose a future start time.');}
 assert(/^[a-f\d-]{36}$/i.test(requestKey),400,'Refresh the form and try again.');
 return {venue,facility,name,email,phone,date,start,end:start+duration,notes,requestKey};
}
const stamp=()=>new Date().toISOString();
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function isAdmin(db,user,bootstrapEmail){
 if(!user)return false;
 let admin=await db.prepare('SELECT user_id FROM administrators WHERE id = 1').first();
 if(!admin&&bootstrapEmail&&user.email.toLowerCase()===bootstrapEmail.toLowerCase()){
  await db.prepare('INSERT OR IGNORE INTO administrators(id,user_id,email,created_at) VALUES(1,?,?,?)').bind(user.id,user.email,stamp()).run();
  admin=await db.prepare('SELECT user_id FROM administrators WHERE id = 1').first();
 }
 return admin?.user_id===user.id;
}
export async function createBooking(db,user,body,catalog,now){
 const b=validateBooking(body,catalog,now);
 const fingerprint=await hash(JSON.stringify([b.venue.id,b.facility.id,b.name,b.email,b.phone,b.date,b.start,b.end,b.notes]));
 let previous=await db.prepare('SELECT * FROM bookings WHERE user_id=? AND request_key=?').bind(user.id,b.requestKey).first();
 if(previous){assert(previous.fingerprint===fingerprint,409,'This request was already used. Start a new booking.');return previous;}
 const count=await db.prepare("SELECT count(*) AS count FROM bookings WHERE user_id=? AND created_at > ?").bind(user.id,new Date(Date.now()-3600000).toISOString()).first();
 assert(count.count<10,429,'You have submitted several requests. Please try again later.');
 const id=crypto.randomUUID(),reference='BC-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),at=stamp();
 try{await db.batch([
  db.prepare('INSERT INTO bookings(id,reference,user_id,request_key,fingerprint,venue_id,venue_name,facility_id,facility_name,customer_name,email,phone,booking_date,start_minute,end_minute,timezone,notes,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'pending\',1,?,?)').bind(id,reference,user.id,b.requestKey,fingerprint,b.venue.id,b.venue.name,b.facility.id,b.facility.name,b.name,b.email,b.phone,b.date,b.start,b.end,b.venue.timezone,b.notes,at,at),
  db.prepare('INSERT INTO booking_events(id,booking_id,actor_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,user.id,'requested',at)
 ]);}catch(error){previous=await db.prepare('SELECT * FROM bookings WHERE user_id=? AND request_key=?').bind(user.id,b.requestKey).first();if(previous&&previous.fingerprint===fingerprint)return previous;throw error;}
 return db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
}
export async function updateBooking(db,user,id,body,admin){
 const booking=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();assert(booking&&(admin||booking.user_id===user.id),404,'Booking not found.');
 assert(Number(body.version)===booking.version,409,'This booking changed. Refresh and try again.');
 const action=body.action;assert(['confirm','decline','cancel'].includes(action),400,'Choose a valid action.');
 assert(action==='cancel'||admin,403,'Only an administrator can approve or decline a booking.');
 assert(['pending','confirmed'].includes(booking.status),409,'This booking is already closed.');
 assert(action==='cancel'||booking.status==='pending',409,'Only pending requests can be approved or declined.');
 const court=trim(body.court,100),courtKey=court.normalize('NFKC').toLowerCase().replace(/\s+/g,' '),note=trim(body.note,1000),at=stamp();
 if(action==='confirm'){assert(body.availabilityConfirmed===true&&court.length>=1,400,'Confirm availability with the venue and enter the assigned court.');assert(booking.booking_date>=today(booking.timezone),400,'A past booking cannot be confirmed.');}
 const status={confirm:'confirmed',decline:'declined',cancel:'cancelled'}[action];
 let result;
 try{result=await db.prepare('UPDATE bookings SET status=?,court_name=?,court_key=?,admin_note=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(status,action==='confirm'?court:booking.court_name,action==='confirm'?courtKey:booking.court_key,admin?note:booking.admin_note,at,id,booking.version).run();}
 catch(error){if(String(error).includes('BOOKING_CONFLICT'))throw new HttpError(409,'That court already has a confirmed booking at this time. Choose another court or decline this request.');throw error;}
 assert(result.meta.changes===1,409,'This booking changed. Refresh and try again.');
 await db.prepare('INSERT INTO booking_events(id,booking_id,actor_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,user.id,status,at).run();
 return db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
}
export function customerRecord(row){const {user_id,request_key,fingerprint,...visible}=row;return visible;}
