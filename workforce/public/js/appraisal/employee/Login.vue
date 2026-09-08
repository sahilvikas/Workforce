<template>
	<div class="login">
		<div class="card">
			<h2>{{ heading }}</h2>
			<p v-if="notice" class="muted mt-1">{{ notice }}</p>
			<p v-else class="muted mt-1">
				Enter the password HR emailed you with this link to open your appraisal.
			</p>

			<div class="field mt-3">
				<label for="wfa-pw">Password</label>
				<input
					id="wfa-pw"
					ref="pw"
					class="input"
					:class="{ err: !!error }"
					type="text"
					inputmode="text"
					autocapitalize="characters"
					autocomplete="off"
					spellcheck="false"
					placeholder="8 characters, e.g. K7M3-QX2P"
					:disabled="busy"
					:value="password"
					:aria-invalid="error ? 'true' : null"
					aria-describedby="wfa-pw-msg"
					@input="onInput"
					@keyup.enter="submit"
				/>
				<div id="wfa-pw-msg">
					<div v-if="error" class="err-text">{{ error }}</div>
					<div v-if="attemptsLeft !== null" class="err-text mt-1">
						{{ attemptsLeft }} attempt{{ attemptsLeft === 1 ? '' : 's' }} left before the link locks.
					</div>
					<div v-if="!error" class="hint">
						The password is in the same email as this link.
					</div>
				</div>
			</div>

			<Button variant="primary" class="mt-3" block :disabled="busy || !password" @click="submit">
				{{ busy ? 'Opening…' : 'Open my appraisal' }}
			</Button>

			<p class="xs muted mt-3">
				The link works until the cycle closes. If you lose the password, ask HR to resend it —
				nobody else can open this page with your link alone.
			</p>
		</div>
	</div>
</template>

<script>
import { state, login } from '../store.js';
import Button from '../ui/Button.vue';

export default {
	name: 'WfaLogin',
	components: { Button },
	props: {
		// Shown over the wizard after a session expires; the draft stays in memory.
		overlay: { type: Boolean, default: false },
		message: { type: String, default: '' },
	},
	emits: ['locked'],
	data() {
		return {
			state: state,
			password: '',
			error: this.message || '',
			attemptsLeft: null,
			busy: false,
		};
	},
	computed: {
		heading() {
			return state.cycle && state.cycle.name ? state.cycle.name : 'Your self-appraisal';
		},
		notice() {
			if (this.overlay) return 'Your session timed out. Enter your password again — nothing you typed is lost.';
			if (state.header && state.header.email) {
				return 'HR sent this link to ' + state.header.email + '. Enter the password from the same email to open your appraisal.';
			}
			return '';
		},
	},
	mounted() {
		if (this.$refs.pw) this.$refs.pw.focus();
	},
	methods: {
		// Uppercase, and drop the spaces and dashes people paste in from the email.
		onInput(e) {
			this.password = String(e.target.value || '').toUpperCase().replace(/[\s-]/g, '');
			e.target.value = this.password;
		},
		async submit() {
			if (this.busy || !this.password) return;
			this.busy = true;
			this.error = '';
			this.attemptsLeft = null;
			const r = await login(this.password);
			this.busy = false;
			if (r && r.ok) {
				this.password = '';
				return;
			}
			this.error = (r && r.message) || '';
			if (r && r.attempts_left !== undefined && r.attempts_left !== null) {
				this.attemptsLeft = Number(r.attempts_left);
			}
			if (r && r.reason === 'locked') this.$emit('locked', this.error);
		},
	},
};
</script>
