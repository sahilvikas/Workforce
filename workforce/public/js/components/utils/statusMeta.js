// One place for status colours (tones). Components never hard-code status colours.
// Tones: ok | hold | primary | decision | bad | grey
// Labels stay exactly as stored in phase 01; plain-language labels arrive with the redesigned screens.

const TONES = {
	// positions
	'Open': 'ok', 'On Hold': 'hold', 'Closed': 'grey',
	// candidates
	'Applied': 'primary', 'Under Screening': 'primary', 'Shortlisted': 'primary',
	'Rejected at Screening': 'bad', 'Interview Scheduled': 'primary', 'Interview In Progress': 'primary',
	'All Rounds Complete': 'decision', 'Selected': 'ok', 'Not Selected': 'bad',
	'BGV Initiated': 'hold', 'BGV Cleared': 'ok', 'BGV Failed': 'bad', 'BGV Not Applicable': 'ok',
	'Offer Sent': 'hold', 'Offer Accepted': 'ok', 'Offer Declined': 'bad',
	'Onboarding Initiated': 'decision', 'Onboarded': 'ok',
	// interviews + feedback
	'Scheduled': 'primary', 'In Progress': 'primary', 'Completed': 'ok', 'Cancelled': 'grey',
	'Strongly Recommend': 'ok', 'Recommend': 'ok', 'Neutral': 'hold', 'Do Not Recommend': 'bad',
	// requisitions
	'Draft': 'grey', 'Pending CMO Approval': 'hold', 'Pending Approval': 'hold', 'Needs Revision': 'decision',
	'Approved': 'decision', 'Published': 'ok', 'Rejected': 'bad', 'Rejected by CMO': 'bad',
	// background check
	'Awaiting Candidate': 'hold', 'Awaiting Verifiers': 'hold', 'Ready for HR Review': 'decision',
	'Cleared': 'ok', 'Failed': 'bad', 'Not Applicable': 'grey',
	'Verified Correct': 'ok', 'Partially Correct': 'hold', 'Incorrect': 'bad', 'No Response': 'hold',
	'Confirmed': 'ok', 'Mismatch': 'bad', 'Not Checked': 'grey',
	// talent search / misc
	'Pending': 'hold', 'Invited': 'primary', 'Responded': 'ok', 'Declined': 'bad',
	'New': 'primary', 'Shared': 'hold', 'Interested': 'ok', 'Not Interested': 'bad',
	'Screened': 'ok', 'Archived': 'grey'
};

export function toneFor(label) {
	return TONES[label] || 'grey';
}

export default TONES;