import {venueSports, filterVenues, makeSuggestions, closingTime, safeUrl} from './logic.js';
const basePath = document.querySelector('meta[name="site-base"]')?.content || '';
const sitePath = path => path.startsWith('/') && !path.startsWith('//') && !(basePath && (path === basePath || path.startsWith(basePath + '/'))) ? basePath + path : path;
const $ = (s, root = document) => root.querySelector(s);
const main = $('#main');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  sport:'<circle cx="9" cy="8" r="6"/><path d="m13.5 12.5 7 7m-6-8-7-7m3 10-7-7m10-2-7 7m4-9-7 7M20 17l-3 3"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  down:'<path d="m6 9 6 6 6-6"/>', right:'<path d="M5 12h14m-5-5 5 5-5 5"/>', back:'<path d="m15 5-7 7 7 7"/>',
  venue:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M8 10h2m4 0h2m-8 3h2m4 0h2"/>',
  share:'<path d="m9 15 6-6m-8 4-2 2a4 4 0 0 0 6 6l3-3m3-7 2-2a4 4 0 0 0-6-6l-3 3"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6m-6 4h4"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.sport}</svg>`;
const img = (src, alt, attributes = '') => `<img src="${escape(sitePath(safeUrl(src) || '/assets/placeholder.svg'))}" alt="${escape(alt)}" ${attributes}>`;
const bookUrl = venue => `${basePath}/complex/${encodeURIComponent(venue.slug)}#booking`;
let data, state = {sport:'', query:'', date:'', time:'', duration:'1', limit:8};
let bannerIndex = 0, bannerTimer, galleryImages = [], galleryIndex = 0, galleryTitle = '', searchDebounce;
const bannerData = [
  {title:'Your next game starts here.',label:'Booking Central',action:'Explore venues'},
  {title:'Find your court. Find your people.',label:'Make time for play',action:'Discover your next venue'},
  {title:'More sports. More possibilities.',label:'One place to find your game',action:'Find a sport you love'},
  {title:'Good games. Great company.',label:'Play together',action:'Plan your next session'}
];
function announce(message) { const toast=$('#toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(announce.timer);announce.timer=setTimeout(()=>toast.classList.remove('visible'),3500); }
function navigate(path) {path=sitePath(path);if(location.pathname+location.search!==path) history.pushState({},'',path);closePopovers();renderRoute();window.scrollTo({top:0,behavior:'instant'});}
function activeSearch(){return !!(state.sport || state.query.trim() || state.date || state.time);}
function sportsMarkup(venue, limit=2) {
  const sports=venueSports(venue);
  return sports.slice(0,limit).map(c=>`<span class="sport-tag">${c.images?.[0]?img(c.images[0],'','loading="lazy"'):icon('sport','small')}${escape(c.name)}</span>`).join('')+(sports.length>limit?'<span aria-label="More sports">…</span>':'');
}
function card(venue){
  return `<article class="venue-card"><a class="venue-image" href="${basePath}/complex/${encodeURIComponent(venue.slug)}" data-route aria-label="View ${escape(venue.name)}">${img(venue.images?.[0],venue.name,'loading="lazy" width="310" height="200"')}</a><div class="venue-content"><h4 class="venue-title"><a href="${basePath}/complex/${encodeURIComponent(venue.slug)}" data-route>${escape(venue.name)}</a></h4><div class="location">${icon('pin')}<span>${escape([venue.info?.city,venue.info?.state].filter(Boolean).join(', '))}</span></div><div class="venue-sports">${sportsMarkup(venue)}</div><div class="card-actions"><a class="button button-outline" href="${basePath}/complex/${encodeURIComponent(venue.slug)}" data-route>Venue Details</a><a class="button" href="${bookUrl(venue)}" data-booking="${venue.id}">Book Now ${icon('right')}</a></div></div></article>`;
}
function renderBanners(){
  const track=$('#banner-track');if(!track)return;
  track.innerHTML=[0,1,2].map(n=>bannerData[(bannerIndex+n)%bannerData.length]).map(b=>`<a class="banner-tile promo-tile" href="${basePath}/#booking-heading" data-explore><span class="promo-eyebrow">${escape(b.label)}</span><h2>${escape(b.title)}</h2><span class="promo-action">${escape(b.action)} ${icon('right')}</span><span class="court-art" aria-hidden="true"></span></a>`).join('');
  $('#banner-dots').innerHTML=bannerData.map((_,i)=>`<button class="dot ${i===bannerIndex?'active':''}" aria-label="Show promotion ${i+1}" aria-pressed="${i===bannerIndex}" data-banner="${i}"></button>`).join('');
}
function startBanners(){clearInterval(bannerTimer);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)bannerTimer=setInterval(()=>{if(!document.hidden&&!$('#banner-section')?.matches(':hover, :focus-within')&&!activeSearch()){bannerIndex=(bannerIndex+1)%bannerData.length;renderBanners();}},5000);}
function renderHome(){
  document.title='Booking Central – Find Your Next Court';
  main.innerHTML=`<section class="banner-section" id="banner-section" aria-label="Booking Central highlights"><div class="banner-track" id="banner-track"></div><div class="banner-dots" id="banner-dots"></div></section><section class="booking-section" aria-labelledby="booking-heading"><h1 class="booking-heading accent" id="booking-heading">Start Booking!</h1><p class="tagline">Explore court booking for top sports venues nationwide with Booking Central</p><div class="filter-wrap"><form class="filters" id="filters" role="search" aria-label="Find sports venues">
    <div class="filter-field sport-field" id="sport-field"><button class="field-toggle" id="sport-toggle" type="button" aria-expanded="false" aria-controls="sport-popover">${icon('sport')}<span class="field-content"><span class="field-label">Sport</span><span class="field-value" id="sport-value">Any sport</span></span>${icon('down','chevron')}</button><div class="popover" id="sport-popover" hidden><input class="popover-search" id="sport-search" placeholder="Search sports" aria-label="Search sports" autocomplete="off"><div class="search-options" id="sport-options"></div></div></div>
    <div class="filter-field where-field" id="where-field">${icon('pin')}<div class="field-content"><label class="field-label" for="where">Where</label><input type="search" id="where" placeholder="City or venue" value="${escape(state.query)}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="where-options" aria-autocomplete="list"></div><button class="field-clear" type="button" id="clear-where" aria-label="Clear location" ${!state.query?'hidden':''}>×</button><div class="popover" id="where-popover" hidden><div class="search-options" id="where-options" role="listbox"></div></div></div>
    <div class="filter-field when-field" id="when-field"><button class="field-toggle" id="when-toggle" type="button" aria-expanded="false" aria-controls="when-popover">${icon('calendar')}<span class="field-content"><span class="field-label">When</span><span class="field-value" id="when-value">Any date & time</span></span></button><div class="popover when-popover" id="when-popover" hidden><label for="date">Select Date</label><input id="date" type="date" min="${new Date().toLocaleDateString('en-CA')}" value="${state.date}"><div class="time-row"><div><label for="time">Time</label><input id="time" type="time" value="${state.time}"></div><div><label for="duration">Duration</label><select id="duration">${Array.from({length:12},(_,i)=>(i+1)/2).map(n=>`<option value="${n}" ${String(n)===state.duration?'selected':''}>${n===.5?'30 Min':n+' Hour'+(n>1?'s':'')}</option>`).join('')}</select></div></div><div class="popup-actions"><button type="button" class="link-button" id="clear-when">Clear all</button><button type="button" class="button" id="confirm-when">Confirm</button></div><p class="help">Confirm court availability directly with the venue.</p></div></div>
  </form></div><div id="filter-state" class="filter-state"></div><div id="venue-results"></div></section>`;
  renderBanners();startBanners();renderSportOptions('');updateHome();
  $('#filters').addEventListener('submit',e=>{e.preventDefault();closePopovers();updateHome();});
  $('#sport-toggle').onclick=()=>togglePopover('sport');
  $('#sport-search').oninput=e=>renderSportOptions(e.target.value);
  $('#where').onfocus=()=>{togglePopover('where',true);renderSuggestions();};
  $('#where').oninput=e=>{state.query=e.target.value;state.limit=8;togglePopover('where',true);renderSuggestions();clearTimeout(searchDebounce);searchDebounce=setTimeout(updateHome,180);};
  $('#where').onkeydown=e=>{const options=[...$('#where-options').querySelectorAll('button')];if(e.key==='ArrowDown'&&options.length){e.preventDefault();options[0].focus();}if(e.key==='Escape')closePopovers();};
  $('#clear-where').onclick=()=>{state.query='';$('#where').value='';state.limit=8;closePopovers();updateHome();};
  $('#when-toggle').onclick=()=>{if(!state.sport&&!state.query.trim()){announce('Choose a location or sport first');return;}togglePopover('when');};
  $('#confirm-when').onclick=()=>{const input=$('#date');if(input.value&&input.value<input.min){announce('Please select today or a future date.');return;}state.date=input.value;state.time=$('#time').value;state.duration=$('#duration').value;closePopovers();updateHome();};
  $('#clear-when').onclick=()=>{state.date='';state.time='';$('#date').value='';$('#time').value='';state.duration='1';$('#duration').value='1';closePopovers();updateHome();};
}
function renderSportOptions(query){$('#sport-options').innerHTML=`<button class="option ${!state.sport?'selected':''}" type="button" data-sport="">Any sport</button>`+data.categories.filter(c=>!c.parent_id&&c.name.toLowerCase().includes(query.toLowerCase())).map(c=>`<button type="button" class="option ${String(state.sport)===String(c.id)?'selected':''}" data-sport="${escape(c.id)}">${c.images?.[0]?img(c.images[0],''):icon('sport','small')}${escape(c.name)}</button>`).join('');}
function renderSuggestions(){
  const {locations,venues}=makeSuggestions(data.venues,state);
  $('#where-options').innerHTML=state.query.trim().length<2?'<p class="help">Type at least 2 characters to search</p>':(!locations.length&&!venues.length)?`<p class="help">No matches for “${escape(state.query)}”. Try a city or venue name.</p>`:
  (locations.length?'<div class="group-label">Locations</div>'+locations.map(l=>`<button type="button" role="option" class="option" data-location="${escape(l)}">${icon('pin','small')}<span>${escape(l)}</span></button>`).join(''):'')+
  (venues.length?'<div class="group-label">Venues</div>'+venues.map(v=>`<button type="button" role="option" class="option" data-venue="${escape(v.slug)}">${icon('venue','small')}<span><strong>${escape(v.name)}</strong><small>${escape([v.info?.city,v.info?.state].filter(Boolean).join(', '))}</small></span></button>`).join(''):'');
}
function closePopovers(){document.querySelectorAll('.popover').forEach(p=>p.hidden=true);document.querySelectorAll('[aria-controls$="popover"],#where').forEach(b=>b.setAttribute('aria-expanded','false'));document.querySelectorAll('.filter-field').forEach(f=>f.classList.remove('active'));}
function togglePopover(name,force){const p=$(`#${name}-popover`);const open=force??p.hidden;closePopovers();p.hidden=!open;$(`#${name}-field`).classList.toggle('active',open);$(`#${name==='where'?'where':name+'-toggle'}`).setAttribute('aria-expanded',String(open));if(name==='sport'&&open){$('#sport-search').value='';renderSportOptions('');$('#sport-search').focus();}}
function updateHome(){
  if(!$('#venue-results'))return;
  const filtered=filterVenues(data.venues,state),active=activeSearch();
  $('#banner-section').hidden=active;$('#booking-heading').textContent=active?'Search Results':'Start Booking!';
  $('#sport-value').textContent=data.categories.find(c=>String(c.id)===String(state.sport))?.name||'Any sport';
  $('#when-toggle').style.opacity=state.sport||state.query.trim()?'1':'.5';
  $('#when-value').textContent=[state.date?new Date(state.date+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'',state.time,state.time?(Number(state.duration)===.5?'30 min':state.duration+' hr'):''].filter(Boolean).join(' · ')||'Any date & time';
  $('#clear-where').hidden=!state.query;
  const chips=[];
  if(state.sport)chips.push(`<span class="chip">${escape($('#sport-value').textContent)}<button data-clear="sport" aria-label="Remove sport filter">×</button></span>`);
  if(state.query)chips.push(`<span class="chip">${escape(state.query)}<button data-clear="query" aria-label="Remove location filter">×</button></span>`);
  if(state.date||state.time)chips.push(`<span class="chip">${escape($('#when-value').textContent)}<button data-clear="when" aria-label="Remove date and time">×</button></span>`);
  $('#filter-state').innerHTML=chips.join('')+(active?'<button class="link-button" data-clear="all">Clear filters</button>':'');
  const featured=data.featuredIds.map(id=>data.venues.find(v=>String(v.id)===String(id))).filter(Boolean);
  $('#venue-results').innerHTML=(!active&&featured.length?`<section aria-labelledby="spotlight-heading"><div class="section-header"><h3 id="spotlight-heading">Spotlight Venues</h3></div><div class="venue-grid">${featured.map(card).join('')}</div></section>`:'')+
    `<section aria-labelledby="venues-heading"><div class="section-header"><h3 id="venues-heading">${matchMedia('(max-width:767px)').matches?'Venues On Demand':'Venues'}</h3>${active?`<span class="results-count" role="status">${filtered.length} venue${filtered.length===1?'':'s'} found</span>`:''}</div>${filtered.length?`<div class="venue-grid" id="venues-grid">${filtered.slice(0,state.limit).map(card).join('')}</div>`:`<div class="empty-state">${icon('search')}<h3>No Venues Here</h3><p>Try another sport, city, or venue name.</p><button class="button button-outline" data-clear="all">Clear filters</button></div>`}${filtered.length>state.limit?'<div class="load-more"><button class="button button-outline" id="load-more">Load More</button></div>':''}</section>`;
  const more=$('#load-more');if(more)more.onclick=()=>{state.limit+=8;const scroll=window.scrollY;updateHome();window.scrollTo(0,scroll);};
}
function safeRichText(raw){
  const documentFragment=new DOMParser().parseFromString(String(raw||''),'text/html');
  documentFragment.querySelectorAll('script,iframe,object,embed,style,link,meta,form,input,button').forEach(n=>n.remove());
  const allowed=new Set('P H1 H2 H3 H4 H5 H6 UL OL LI STRONG EM B I BR A BLOCKQUOTE DIV SPAN HR TABLE THEAD TBODY TR TD TH'.split(' '));
  documentFragment.body.querySelectorAll('*').forEach(n=>{if(!allowed.has(n.tagName)){n.replaceWith(...n.childNodes);return;}for(const attr of [...n.attributes]){if(attr.name!=='href')n.removeAttribute(attr.name);}if(n.hasAttribute('href')){const u=safeUrl(n.getAttribute('href'));if(u){n.setAttribute('href',u);n.setAttribute('target','_blank');n.setAttribute('rel','noopener noreferrer');}else n.removeAttribute('href');}});
  return documentFragment.body.innerHTML;
}
function renderDetail(slug){
  const venue=data.venues.find(v=>v.slug===slug);if(!venue){renderNotFound();return;}
  document.title=venue.name+' | Booking Central';
  const photos=(venue.images||[]).filter(Boolean);
  const categories=venueSports(venue), info=venue.info||{};
  const address=[info.address,info.city,info.state,info.country].filter(Boolean).join(', ');
  const mapUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([venue.name,address].filter(Boolean).join(', '));
  const amenities=(venue.amenities||[]).map(x=>x.amenity||x);
  const near=data.venues.filter(v=>v.id!==venue.id&&v.info?.state===info.state).slice(0,4);
  main.innerHTML=`<article class="detail-page"><div class="detail-heading"><div class="detail-title"><a class="back-button" href="${basePath}/" data-route aria-label="Back to venues">${icon('back')}</a><h1>${escape(venue.name)}</h1></div><div class="detail-actions"><button class="button button-outline" id="share" aria-label="Copy venue link">${icon('share')}</button><a class="button" href="${bookUrl(venue)}" data-booking="${venue.id}">Book Now</a></div></div>
    <div class="photo-grid">${(photos.length?photos:['/assets/placeholder.svg']).slice(0,3).map((p,i)=>`<button data-photo="${i}" aria-label="View photo ${i+1} of ${escape(venue.name)}">${img(p,venue.name+' — photo '+(i+1),'loading="eager"')}${i===Math.min(photos.length,3)-1&&photos.length>3?`<span class="photo-count">View all ${photos.length} photos</span>`:''}</button>`).join('')}</div>
    <div class="detail-columns"><section class="info-panel"><div class="panel-location"><h2>${icon('pin')}${escape([info.city,info.state].filter(Boolean).join(', '))}</h2><a class="button button-outline" href="${mapUrl}" target="_blank" rel="noopener noreferrer">${icon('pin','small')}Locate</a></div><p class="address">${escape(info.address||address)}</p><hr class="rule"><h2>${icon('clipboard')}Centre Policy</h2><div class="prose">${escape(info.center_policy||'Contact the venue for its booking and cancellation policy.')}</div><hr class="rule"><h2>${icon('clock')}Amenities & Facilities</h2><div class="amenity-columns"><div><h3>Amenities</h3>${amenities.length?amenities.map(a=>`<div class="amenity">${a.images?.[0]?img(a.images[0],'','loading="lazy"'):icon('grid','small')}<span>${escape(a.name)}</span></div>`).join(''):'<p class="help">Contact the venue for details.</p>'}</div><div><h3>Facilities</h3>${categories.map(c=>`<div class="amenity">${c.images?.[0]?img(c.images[0],'','loading="lazy"'):icon('sport','small')}<span>${escape(c.name)}</span></div>`).join('')}</div></div>
    <details class="detail-accordion"><summary>Centre Layout</summary><div class="accordion-body">${info.floor_plan?.length?info.floor_plan.map((p,i)=>`<button class="floor-plan" data-floor="${i}" aria-label="Enlarge centre layout ${i+1}">${img(p,'Centre layout','loading="lazy"')}</button>`).join(''):'The venue has not provided a centre layout.'}</div></details><details class="detail-accordion"><summary>Contact Us</summary><div class="accordion-body">${info.phone_number?`<p><a href="tel:${escape(String(info.phone_number).replace(/[^\d+]/g,''))}">${escape(info.phone_number)}</a></p>`:'<p>Ask the venue directly about booking availability.</p>'}<a class="button button-outline" href="${bookUrl(venue)}" data-booking="${venue.id}">Booking details ${icon('right','small')}</a></div></details></section>
    <aside class="pricing-panel"><h2>Pricing & Operating Hours</h2><div class="facility-tabs" role="tablist" aria-label="Venue facilities">${(venue.facilities||[]).map((f,i)=>`<button class="facility-tab ${i===0?'active':''}" role="tab" id="facility-tab-${i}" aria-selected="${i===0}" aria-controls="facility-detail" data-facility="${i}">${escape(f.name||f.categories?.[0]?.category?.name||'Facility')}</button>`).join('')}</div><div id="facility-detail" role="tabpanel"></div><p class="pricing-note">Prices shown are from the venue listing. Confirm current prices and court availability directly with the venue.</p><a class="button" href="${bookUrl(venue)}" data-booking="${venue.id}">Book Now ${icon('right','small')}</a></aside></div>${near.length?`<section><div class="section-header"><h3>Nearby Venues</h3></div><div class="venue-grid">${near.map(card).join('')}</div></section>`:''}</article>`;
  function facility(index){const f=venue.facilities?.[index];const p=$('#facility-detail');if(!f){p.innerHTML=`<div class="prose">${escape(venue.description||'Contact this venue for pricing.')}</div>`;return;}p.setAttribute('aria-labelledby','facility-tab-'+index);p.innerHTML=`<div class="hours">${icon('clock','small')}${escape(f.opening||venue.opening||'')} ${closingTime(f.opening||venue.opening,f.no_of_hours??venue.no_of_hours)?'– '+escape(closingTime(f.opening||venue.opening,f.no_of_hours??venue.no_of_hours)):''}</div>${f.min_price?`<div class="price">${({Malaysia:'MYR',Singapore:'SGD',Australia:'AUD',Indonesia:'IDR',Cambodia:'KHR'}[info.country]||'')} ${escape(Number(f.min_price).toFixed(2))}${f.max_price&&Number(f.max_price)!==Number(f.min_price)?' – '+escape(Number(f.max_price).toFixed(2)):''}<small> / hour</small></div>`:''}<div class="prose">${escape(f.description||venue.description||'See the booking page for details.')}</div>`;document.querySelectorAll('[data-facility]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.facility)===index);b.setAttribute('aria-selected',String(Number(b.dataset.facility)===index));});}
  facility(0);main.querySelectorAll('[data-facility]').forEach(b=>b.onclick=()=>facility(Number(b.dataset.facility)));
  main.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>openGallery(photos.length?photos:['/assets/placeholder.svg'],Number(b.dataset.photo),venue.name));
  main.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>openGallery(info.floor_plan,Number(b.dataset.floor),'Centre layout'));
  $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);announce('Venue link copied');}catch{announce('Copy this page’s address to share the venue.');}};
}

function openBooking(venue){
  const info=venue.info||{};
  const address=[info.address,info.city,info.state,info.country].filter(Boolean).join(', ');
  const mapUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([venue.name,address].filter(Boolean).join(', '));
  const phone=String(info.phone_number||'').replace(/[^\d+]/g,'');
  const selection=[state.date,state.time,state.time?state.duration+' hour(s)':''].filter(Boolean).join(' · ');
  $('#booking-content').innerHTML=`<h3>${escape(venue.name)}</h3><p>${escape(address)}</p>${selection?`<p class="booking-selected">Preferred session: ${escape(selection)}</p>`:''}<p>Contact the venue to confirm court availability, prices and your booking. Booking Central does not take payments or confirm reservations.</p>${phone?'':`<p>A direct phone number isn’t listed. Open the venue’s location to find current contact details.</p>`}<div class="booking-actions">${phone?`<a class="button" href="tel:${escape(phone)}">Call venue</a>`:''}<a class="button ${phone?'button-outline':''}" href="${mapUrl}" target="_blank" rel="noopener noreferrer">View venue location ${icon('pin','small')}</a></div>`;
  $('#booking-dialog').showModal();
}

function openGallery(images,index,title){galleryImages=images;galleryIndex=index;galleryTitle=title;updateGallery();$('#gallery').showModal();document.body.style.overflow='hidden';}
function updateGallery(){const p=$('#gallery-photo');p.src=sitePath(safeUrl(galleryImages[galleryIndex])||'/assets/placeholder.svg');p.alt=galleryTitle+' — photo '+(galleryIndex+1);$('#gallery-counter').textContent=`${galleryIndex+1} / ${galleryImages.length}`;$('.gallery-prev').hidden=$('.gallery-next').hidden=galleryImages.length<2;}
function closeGallery(){$('#gallery').close();document.body.style.overflow='';}
function renderPolicy(which){const title=which==='privacy-policy'?'Privacy Policy':'Terms Of Use';const key=which==='privacy-policy'?'privacy_policy':'terms_condition';const content=data.policies?.[key];document.title=title+' | Booking Central';main.innerHTML=`<article class="policy-page"><h1>${title}</h1><div class="prose">${content?safeRichText(content):`<p>Read the current ${title.toLowerCase()} on <a href="${basePath}/${which}" target="_blank" rel="noopener noreferrer">Booking Central</a>.</p>`}</div></article>`;}
function renderNotFound(){document.title='Page not found | Booking Central';main.innerHTML=`<div class="empty-state" style="margin:50px 0"><h1>Page not found</h1><p>Let’s get you back to the game.</p><a class="button" href="${basePath}/" data-route>Explore venues</a></div>`;}
function renderRoute(){clearInterval(bannerTimer);clearTimeout(searchDebounce);const path=decodeURIComponent(location.pathname.slice(basePath.length)).replace(/\/$/,'')||'/';if(path==='/')renderHome();else if(path.startsWith('/complex/')){renderDetail(path.slice(9));if(location.hash==='#booking'){const venue=data.venues.find(v=>v.slug===path.slice(9));if(venue)openBooking(venue);}}else if(['privacy-policy','terms-condition'].includes(path.slice(1)))renderPolicy(path.slice(1));else renderNotFound();}
document.addEventListener('click',e=>{
  const booking=e.target.closest('[data-booking]');if(booking&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();const venue=data.venues.find(v=>String(v.id)===booking.dataset.booking);if(venue)openBooking(venue);return;}
  const explore=e.target.closest('[data-explore]');if(explore){e.preventDefault();if(location.pathname!==sitePath('/'))navigate('/');$('#booking-heading')?.scrollIntoView({behavior:'smooth'});$('#sport-toggle')?.focus({preventScroll:true});return;}

  const route=e.target.closest('a[data-route]');if(route&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();navigate(route.getAttribute('href'));return;}
  const banner=e.target.closest('[data-banner]');if(banner){bannerIndex=Number(banner.dataset.banner);renderBanners();startBanners();}
  const sport=e.target.closest('[data-sport]');if(sport){state.sport=sport.dataset.sport;state.limit=8;closePopovers();updateHome();$('#sport-toggle').focus();}
  const locationOption=e.target.closest('[data-location]');if(locationOption){state.query=locationOption.dataset.location;state.limit=8;$('#where').value=state.query;closePopovers();updateHome();}
  const venue=e.target.closest('[data-venue]');if(venue)navigate('/complex/'+encodeURIComponent(venue.dataset.venue));
  const clear=e.target.closest('[data-clear]');if(clear){const key=clear.dataset.clear;if(key==='all'){state={sport:'',query:'',date:'',time:'',duration:'1',limit:8};renderHome();}else{if(key==='when'){state.date='';state.time='';$('#date').value='';$('#time').value='';}else{state[key]='';if(key==='query')$('#where').value='';}state.limit=8;updateHome();}closePopovers();}
  if(!e.target.closest('.filter-field'))closePopovers();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePopovers();if($('#gallery').open){if(e.key==='ArrowRight')$('.gallery-next').click();if(e.key==='ArrowLeft')$('.gallery-prev').click();}const options=e.target.closest('.search-options');if(options&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const buttons=[...options.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&!e.target.dataset.fallback){e.target.dataset.fallback='true';e.target.src=sitePath('/assets/placeholder.svg');}},true);
$('.dialog-close').onclick=()=>$('#booking-dialog').close();$('#booking-dialog').addEventListener('click',e=>{if(e.target===$('#booking-dialog'))$('#booking-dialog').close();});
$('.gallery-close').onclick=closeGallery;$('.gallery-prev').onclick=()=>{galleryIndex=(galleryIndex-1+galleryImages.length)%galleryImages.length;updateGallery();};$('.gallery-next').onclick=()=>{galleryIndex=(galleryIndex+1)%galleryImages.length;updateGallery();};$('#gallery').addEventListener('close',()=>document.body.style.overflow='');$('#gallery').addEventListener('click',e=>{if(e.target===$('#gallery'))closeGallery();});window.addEventListener('popstate',()=>{closePopovers();renderRoute();});$('#year').textContent=new Date().getFullYear();
try{const response=await fetch(sitePath('/data/data.json'));if(!response.ok)throw new Error('Venue data unavailable');data=await response.json();renderRoute();}catch(error){main.innerHTML='<div class="empty-state" style="margin:50px 0"><h1>Unable to load venues</h1><p>Please try refreshing the page.</p><button class="button" id="retry">Try again</button></div>';$('#retry').onclick=()=>window.location.reload();console.error(error);}
