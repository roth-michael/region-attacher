import registerHooks from "./hooks";

Hooks.once('init', async function() {
    registerHooks();
});

Hooks.once('ready', async function() {

});