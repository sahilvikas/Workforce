<template>
	<div>
		<TemplateEditor v-if="editing" :key="editorKey" :seed="seed" @close="closeEditor" />

		<template v-else>
			<div class="head">
				<div>
					<h1>KRA templates</h1>
					<p>
						One template per team. Pick it when you send; every person in that group gets these
						KRAs and competencies pre-filled.
					</p>
				</div>
				<Button variant="primary" @click="newTemplate">New template</Button>
			</div>

			<div v-if="hr.templateLoading && !hr.templates.length" class="list-tpl" aria-busy="true">
				<div v-for="n in 3" :key="n" class="tplcard">
					<Skeleton width="60%" height="16px" />
					<Skeleton width="90%" height="12px" mt="10px" />
					<Skeleton width="100%" height="10px" mt="12px" radius="5px" />
				</div>
			</div>

			<div v-else-if="hr.templateError" class="card">
				<h3>We couldn’t load the templates</h3>
				<p class="mt-2">{{ hr.templateError }}</p>
				<Button variant="primary" class="mt-3" @click="reload">Try again</Button>
			</div>

			<div v-else class="list-tpl">
				<button v-for="t in hr.templates" :key="t.name" type="button" class="tplcard" @click="open(t)">
					<span class="row between">
						<h4>{{ t.template_name }}</h4>
						<Chip :tone="Number(t.complete) ? 'moss' : 'gold'">{{ t.kra_sum }}%</Chip>
					</span>
					<span class="meta">
						{{ t.team || 'No team set' }} · {{ t.kra_count }} KRAs · {{ t.comp_count }} competencies ·
						used by {{ t.used_by }} {{ t.used_by === 1 ? 'person' : 'people' }}
					</span>
					<span v-if="!Number(t.active)" class="meta">Inactive</span>
					<span class="weightbar mt-2">
						<i
							v-for="(w, i) in shares(t)"
							:key="i"
							:style="{ width: w + '%', background: i % 2 ? 'var(--moss-2)' : 'var(--moss)', borderRight: '2px solid #fff' }"
						></i>
					</span>
				</button>

				<button type="button" class="tplcard new" @click="newTemplate">+ New template</button>
			</div>
		</template>
	</div>
</template>

<script>
import { hr, loadTemplates } from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';
import Skeleton from '../../appraisal/ui/Skeleton.vue';
import TemplateEditor from './TemplateEditor.vue';

export default {
	name: 'HrTemplates',
	components: { Button, Chip, Skeleton, TemplateEditor },
	data() {
		return { hr: hr, editing: false, seed: null, editorKey: 0 };
	},
	methods: {
		reload() {
			loadTemplates();
		},
		// Each KRA's share of the section, so the bar reads as "how full is this".
		shares(t) {
			const total = hr.kraWeight || 100;
			const n = Number(t.kra_count || 0);
			if (!n) return [];
			const each = (Number(t.kra_sum || 0) / total / n) * 100;
			return new Array(n).fill(Math.max(0, each));
		},
		async open(t) {
			await loadTemplates(t.name);
			this.seed = null;
			this.editorKey++;
			this.editing = true;
		},
		newTemplate() {
			hr.template = null;
			this.seed = null;
			this.editorKey++;
			this.editing = true;
		},
		closeEditor() {
			this.editing = false;
			hr.template = null;
			loadTemplates();
		},
	},
};
</script>
