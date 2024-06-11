import CONSTANTS from './constants.js';
import { createDependentRegion, getFullFlagPath } from './helpers.js';

export default function registerHooks() {
    Hooks.on('createMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let originItem = await fromUuid(templateDoc.getFlag('dnd5e', 'origin'));
        if (!originItem) return;
        if (!(originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) ?? false)) return;
        await createDependentRegion(templateDoc, originItem);
    });

    Hooks.on('updateMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        let origShape = templateDoc.object.shape;
        let points = origShape.points ?? origShape.toPolygon().points;
        let newShape = {
            points: points.map((pt, ind) => ind % 2 ? pt + templateDoc.y : pt + templateDoc.x),
            hole: false,
            type: 'polygon'
        }
        await region.update({
            'shapes': [newShape],
            [getFullFlagPath(CONSTANTS.FLAGS.ATTACHED_TEMPLATE)]: templateDoc.uuid
        });
    });
    
    Hooks.on('deleteMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        await region.delete();
    });

    Hooks.on('closeRegionConfig', async (regionConfig) => {
        if (!game.user.isGM) return;
        if (!regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION)) return;
        let parentItem = await fromUuid(regionConfig.document.getFlag('dnd5e', 'origin'));
        if (!parentItem) return;
        let regionBehaviors = Array.from(regionConfig.document.behaviors) ?? [];
        await parentItem.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS, regionBehaviors);
        await regionConfig.document.delete();
    });

    Hooks.on('renderRegionConfig', async (regionConfig, element) => {
        if (!game.user.isGM) return;
        if (!regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION)) return;
        element.querySelector('nav')?.remove();
        element.querySelector('section.tab.region-shapes')?.remove();
        element.querySelector('section.tab.region-identity')?.remove();
        element.querySelector('section.tab.region-behaviors').classList.add('active');
    });
}
