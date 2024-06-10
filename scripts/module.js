import registerHooks from "./hooks.js";
import registerSheetOverrides from "./sheet-overrides.js";

Hooks.once('init', async function() {
    registerHooks();
    registerSheetOverrides();
});

Hooks.once('ready', async function() {
    console.log('region-attacher | Ready');
});