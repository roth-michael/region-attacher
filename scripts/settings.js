import CONSTANTS from './constants.js';

export function registerSettings() {
    game.settings.register(CONSTANTS.MODULE_NAME, CONSTANTS.SETTINGS.DEFAULT_REGION_VISIBILITY, {
        name: 'REGION-ATTACHER.SETTINGS.DEFAULT_REGION_VISIBILITY.name',
        hint: 'REGION-ATTACHER.SETTINGS.DEFAULT_REGION_VISIBILITY.hint',
        scope: 'world',
        config: true,
        type: Number,
        default: 0,
        choices: {
            0: 'REGION.VISIBILITY.LAYER.label',
            1: 'REGION.VISIBILITY.GAMEMASTER.label',
            2: 'REGION.VISIBILITY.ALWAYS.label',
        }
    });

    game.settings.register(CONSTANTS.MODULE_NAME, CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS, {
        name: 'REGION-ATTACHER.SETTINGS.SHOW_OPTIONS_TO_NON_GMS.name',
        hint: 'REGION-ATTACHER.SETTINGS.SHOW_OPTIONS_TO_NON_GMS.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });
}