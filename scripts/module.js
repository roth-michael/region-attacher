import registerHooks from './hooks.js';
import { registerSettings } from './settings.js';
import { registerSheetOverrides, registerDnd5eSheetOverrides } from './sheet-overrides.js';

Hooks.once('init', async function() {
    registerHooks();
    registerSheetOverrides();
    if (game.system.id === 'dnd5e') registerDnd5eSheetOverrides();
    registerSettings();
});

Hooks.once('ready', async function() {
    console.log('region-attacher | Ready');
});