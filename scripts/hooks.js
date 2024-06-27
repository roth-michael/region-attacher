import CONSTANTS from './constants.js';
import { createDependentRegionForTemplate, createDependentRegionForTile, getFullFlagPath } from './helpers.js';

export default function registerHooks() {
    let shouldUpdateFlags = {};

    Hooks.on('createMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        if (game.system.id === 'dnd5e') {
            let originItem = await fromUuid(templateDoc.getFlag('dnd5e', 'origin'));
            if (!originItem) return;
            if (!(originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) ?? false)) return;
            let update = {
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACHED_REGION)]: originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION),
                [getFullFlagPath(CONSTANTS.FLAGS.REGION_BEHAVIORS)]:  originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) || [],
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: true
            }
            await templateDoc.update(update);
        }
    });

    Hooks.on('updateMeasuredTemplate', async (templateDoc) => {
        await templateDoc.object.refresh();
    });

    Hooks.on('updateTile', async (tileDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(tileDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        let shouldHaveRegion = tileDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE) || false;
        if (shouldHaveRegion && !region) {
            await createDependentRegionForTile(tileDoc);
            await tileDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE, true);
        } else if (region && !shouldHaveRegion) {
            await region.delete();
            await tileDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE, false);
            return;
        }
        if (!region) return;
        let newShape = {
            hole: false,
            type: 'rectangle',
            x: tileDoc.x,
            y: tileDoc.y,
            width: tileDoc.width,
            height: tileDoc.height,
            rotation: tileDoc.rotation
        };
        await region?.update({
            'shapes': [newShape]
        });
    });

    Hooks.on('deleteTile', async (tileDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(tileDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        await region.delete();
    });

    Hooks.on('updateMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        let shouldHaveRegion = templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) || false;
        if (shouldHaveRegion && !region) {
            await createDependentRegionForTemplate(templateDoc);
            await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE, true);
        } else if (region && !shouldHaveRegion) {
            await region.delete();
            await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE, false);
        }
        if (!region) return;
        shouldUpdateFlags[templateDoc.uuid] = true;
    });

    Hooks.on('refreshMeasuredTemplate', async (template) => {
        if (!game.user.isGM) return;
        let templateDoc = template.document;
        if (!templateDoc) return;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        if (!shouldUpdateFlags[templateDoc.uuid]) return;
        let origShape = templateDoc.object?.shape;
        if (!origShape) return;
        let points = origShape.points ?? origShape.toPolygon().points;
        let newShape = {
            points: points.map((pt, ind) => ind % 2 ? pt + templateDoc.y : pt + templateDoc.x),
            hole: false,
            type: 'polygon'
        }
        await region?.update({
            'shapes': [newShape]
        });
        delete shouldUpdateFlags[templateDoc.uuid];
    });
    
    Hooks.on('deleteMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        await region.delete();
    });

    Hooks.on('closeRegionConfig', async (regionConfig) => {
        if (!game.user.isGM) return;
        let regionBehaviors = Array.from(regionConfig.document.behaviors) ?? [];
        if (regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION)) {
            let parentItem = await fromUuid(regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ORIGIN));
            if (!parentItem) return;
            await parentItem.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS, regionBehaviors);
            if (parentItem instanceof TileDocument) return;
            await regionConfig.document.delete();
        } else {
            let parentDocumentUuid = regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TEMPLATE) ?? 
                                     regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TILE);
            let parentDocument = await fromUuid(parentDocumentUuid);
            if (!parentDocument) return;
            await parentDocument.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS, regionBehaviors);
        }
    });

    Hooks.on('renderRegionConfig', async (regionConfig, element) => {
        if (!game.user.isGM) return;
        if (!regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION) &&
            !regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TILE) &&
            !regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TEMPLATE)) return;
        element.querySelector('nav')?.remove();
        element.querySelector('section.tab.region-shapes')?.remove();
        element.querySelector('section.tab.region-identity')?.remove();
        element.querySelector('section.tab.region-behaviors').classList.add('active');
    });
}
