/* One autosave queue, used by the employee draft and by the manager review.
 *
 * Rules (identical for both): a change marks the queue dirty and schedules a
 * flush 1.2s later; only one request is ever in flight; if the content moved on
 * while a request was away, it flushes again on return, so snapshots can never
 * land out of order. The indicator reflects the latest snapshot, not the last
 * response. Network failures and 5xx keep everything in memory and retry every
 * 10s; a real refusal from the server stops the retries and shows its sentence.
 */

const DEBOUNCE = 1200;
const RETRY = 10000;
const STOP_REASONS = ['locked', 'window_closed', 'too_big'];

/**
 * createSaveQueue({ state, snapshot, send, sendKeepalive, enabled, onOk, onGone, onStopped })
 *
 * `state` is a reactive object owning: seq, savedSeq, saveState, saveMessage,
 * savedAt, now. `onGone` returns true when it handled a dead session.
 */
export function createSaveQueue(opts) {
	const s = opts.state;
	const stopReasons = opts.stopReasons || STOP_REASONS;

	let debounceT = null;
	let retryT = null;
	let inFlight = null;

	function hasUnsaved() {
		return s.savedSeq !== s.seq;
	}

	function markDirty() {
		s.seq++;
		if (s.saveState !== 'retrying' && s.saveState !== 'stopped') s.saveState = 'saving';
		if (debounceT) clearTimeout(debounceT);
		debounceT = setTimeout(function () {
			debounceT = null;
			flush();
		}, DEBOUNCE);
	}

	function scheduleRetry() {
		if (retryT) return;
		retryT = setTimeout(function () {
			retryT = null;
			flush();
		}, RETRY);
	}

	function flush() {
		if (debounceT) {
			clearTimeout(debounceT);
			debounceT = null;
		}
		if (inFlight) return inFlight;
		if (s.saveState === 'stopped') return Promise.resolve();
		if (!opts.enabled() || !hasUnsaved()) return Promise.resolve();

		const snapSeq = s.seq;
		const payload = opts.snapshot();
		if (s.saveState !== 'retrying') s.saveState = 'saving';

		inFlight = opts
			.send(payload)
			.then(function (r) {
				inFlight = null;
				if (opts.onGone && opts.onGone(r)) return;

				if (r && r.ok) {
					s.savedSeq = Math.max(s.savedSeq, snapSeq);
					s.savedAt = Date.now();
					s.now = Date.now();
					if (opts.onOk) opts.onOk(r);
					if (s.seq > s.savedSeq) flush();
					else s.saveState = 'saved';
					return;
				}

				if (r && stopReasons.indexOf(r.reason) >= 0) {
					s.saveState = 'stopped';
					s.saveMessage = r.message || '';
					if (opts.onStopped) opts.onStopped(r);
					return;
				}

				s.saveState = 'retrying';
				scheduleRetry();
			})
			.catch(function () {
				inFlight = null;
				s.saveState = 'retrying';
				scheduleRetry();
			});

		return inFlight;
	}

	/** Fire-and-forget save that survives the tab closing. */
	function flushKeepalive() {
		if (!opts.enabled() || !hasUnsaved() || s.saveState === 'stopped') return;
		if (opts.sendKeepalive) opts.sendKeepalive(opts.snapshot());
	}

	/** Wait for anything on the wire, then push whatever is still dirty. */
	async function settle() {
		if (inFlight) await inFlight;
		if (hasUnsaved()) await flush();
		if (inFlight) await inFlight;
	}

	/** Back to a clean slate — used after a load and after a successful submit. */
	function reset(saved) {
		if (debounceT) {
			clearTimeout(debounceT);
			debounceT = null;
		}
		if (retryT) {
			clearTimeout(retryT);
			retryT = null;
		}
		s.seq = 0;
		s.savedSeq = 0;
		s.saveState = saved === false ? 'idle' : 'saved';
		s.saveMessage = '';
		s.savedAt = Date.now();
		s.now = Date.now();
	}

	return {
		markDirty: markDirty,
		flush: flush,
		flushKeepalive: flushKeepalive,
		settle: settle,
		hasUnsaved: hasUnsaved,
		reset: reset,
	};
}

/** The one line the save indicator shows, for either queue. */
export function saveLabel(s) {
	if (!s) return '';
	if (s.saveState === 'stopped') return s.saveMessage || 'Not saved';
	if (s.saveState === 'retrying') return 'Couldn’t save — retrying';
	if (s.saveState === 'saving') return 'Saving…';
	if (!s.savedAt || s.saveState === 'idle') return '';
	const secs = Math.round((s.now - s.savedAt) / 1000);
	const ago = secs < 5 ? 'just now' : secs < 60 ? secs + 's ago' : Math.round(secs / 60) + ' min ago';
	return 'Saved · ' + ago;
}

export function saveClass(s) {
	return {
		saving: s && s.saveState === 'saving',
		retrying: s && s.saveState === 'retrying',
		stopped: s && s.saveState === 'stopped',
	};
}
