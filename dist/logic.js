export function venueSports(venue) {
  const seen = new Set();
  return (venue.facilities || []).flatMap(f => f.categories || [])
    .map(c => c.category || c).filter(c => c && !c.parent_id)
    .filter(c => !seen.has(c.id) && seen.add(c.id));
}
export function filterVenues(venues, state) {
  const query = (state.query || '').toLocaleLowerCase().trim();
  return venues.filter(v => {
    const sportMatch = !state.sport || venueSports(v).some(c => String(c.id) === String(state.sport));
    const where = [v.name, v.info?.city, v.info?.state, v.info?.country].filter(Boolean).join(' ').toLocaleLowerCase();
    return sportMatch && (!query || where.includes(query));
  });
}
export function makeSuggestions(venues, state) {
  if ((state.query || '').trim().length < 2) return {locations: [], venues: []};
  const query = state.query.toLocaleLowerCase().trim();
  const matching = filterVenues(venues, {...state, query: ''});
  const locations = [...new Set(matching.flatMap(v => [v.info?.city, v.info?.state, v.info?.country]).filter(Boolean))]
    .filter(l => l.toLocaleLowerCase().includes(query)).slice(0, 5);
  return {locations, venues: matching.filter(v => v.name.toLocaleLowerCase().includes(query)).slice(0, 5)};
}
export function closingTime(opening, hours) {
  if (!opening || hours == null) return '';
  const [h, m] = opening.split(':').map(Number);
  const total = (h * 60 + m + Number(hours) * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}
export function safeUrl(value) {
  if (!value) return '';
  if (/^\/(?!\/)/.test(value)) return value;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
