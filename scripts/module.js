import registerHooks from './hooks.js';
import { registerSettings } from './settings.js';
import registerSheetOverrides from './sheet-overrides.js';

Hooks.once('init', async function() {
    registerHooks();
    registerSheetOverrides();
    registerSettings();
});

Hooks.once('ready', async function() {
    console.log('region-attacher | Ready');
});