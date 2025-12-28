import { persisted } from 'svelte-persisted-store';

// Use export const so they can be accessed in your Svelte files
export const meetingTypeStore = persisted("ml_meetingType", "");
export const transcriptStore = persisted("ml_transcript", "");
export const summaryStore = persisted("ml_summary", "");
export const actionItemsStore = persisted("ml_actionItems", "");
export const highlightsStore = persisted("ml_highlights", "");
export const keyDecisionsStore = persisted("ml_keyDecisions", "");
export const toneResultStore = persisted("ml_toneResult", null);
export const speakerMapStore = persisted("ml_speakerMap", {});