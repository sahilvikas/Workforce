// Time helpers for the Workforce Hub.
//
// Two kinds of time exist in this system and they must be treated differently:
//   1. Record timestamps (creation, modified, submitted_on, leadership_decision_on, shared_on...)
//      are stored on the SERVER clock, which is America/Denver. They must be converted
//      to the viewer's local time (India) before being shown.
//   2. Interview scheduled_date + scheduled_time are already India wall-clock
//      (Google events are created with timeZone Asia/Kolkata). They are NEVER converted.

const SERVER_TZ = 'America/Denver';

function parts(dateLike, tz) {
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
	});
	const o = {};
	fmt.formatToParts(dateLike).forEach(p => { o[p.type] = p.value; });
	return Date.UTC(+o.year, +o.month - 1, +o.day, +(o.hour === '24' ? '00' : o.hour), +o.minute, +o.second);
}

// A server timestamp string ("2026-09-11 02:44:27") -> a real Date in the viewer's time.
export function serverDate(str) {
	if (!str) return null;
	const s = String(str).trim().replace(' ', 'T').split('.')[0];
	const naive = new Date(s + 'Z');           // read the wall-clock digits as if UTC
	if (isNaN(naive.getTime())) return null;
	const offset = parts(naive, SERVER_TZ) - naive.getTime();   // Denver offset at that moment
	return new Date(naive.getTime() - offset);
}

// Interview date + time are already India time. Build the Date without shifting.
export function interviewDate(date, time) {
	if (!date) return null;
	const t = (time || '00:00:00').slice(0, 8);
	const d = new Date(String(date).slice(0, 10) + 'T' + t);
	return isNaN(d.getTime()) ? null : d;
}

export function shortDate(value) {
	const d = value instanceof Date ? value : serverDate(value) || new Date(String(value).slice(0, 10) + 'T12:00:00');
	if (!d || isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function longDate(value) {
	const d = value instanceof Date ? value : serverDate(value);
	if (!d || isNaN(d.getTime())) return '';
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "today", "yesterday", "3 days ago", then a date
export function relative(value) {
	const d = value instanceof Date ? value : serverDate(value);
	if (!d || isNaN(d.getTime())) return '';
	const a = new Date(); a.setHours(0, 0, 0, 0);
	const b = new Date(d); b.setHours(0, 0, 0, 0);
	const days = Math.round((a - b) / 86400000);
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 7) return days + ' days ago';
	return shortDate(d);
}

export default { serverDate, interviewDate, shortDate, longDate, relative };