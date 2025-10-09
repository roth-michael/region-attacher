import registerHooks from './hooks.js';
import { registerSettings } from './settings.js';
import { registerSheetOverrides, registerDnd4eSheetOverrides, registerDnd5eSheetOverrides, registerPF2eSheetOverrides, registerSwadeSheetOverrides } from './sheet-overrides.js';

Hooks.once('init', async function() {
    registerHooks();
    registerSheetOverrides();
    if (game.system.id === 'dnd4e') registerDnd4eSheetOverrides();
    if (game.system.id === 'dnd5e') registerDnd5eSheetOverrides();
    if (game.system.id === 'pf2e') registerPF2eSheetOverrides();
    if (game.system.id === 'swade') registerSwadeSheetOverrides();
    registerSettings();
});

Hooks.once('ready', async function() {
    console.log('region-attacher | Ready');
});