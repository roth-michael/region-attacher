import registerHooks from "./hooks.js";

Hooks.once('init', async function() {
    registerHooks();
});

Hooks.once('ready', async function() {
    console.log('region-attacher | Ready');
});