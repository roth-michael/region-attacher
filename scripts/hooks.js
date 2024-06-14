import CONSTANTS from './constants.js';
import { createDependentRegionForTemplate, createDependentRegionForTile, getFullFlagPath } from './helpers.js';

export default function registerHooks() {
    let tooSoon = false;
    let toDoOnTimeout = () => {};

    Hooks.on('createMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let originItem = await fromUuid(templateDoc.getFlag('dnd5e', 'origin'));
        if (!originItem) return;
        if (!(originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) ?? false)) return;
        await createDependentRegionForTemplate(templateDoc, originItem);
    });

    Hooks.on('refreshTile', async (tile, { refreshShape=false, refreshPosition=false, refreshRotation=false, refreshSize=false }) => {
        if (!game.user.isGM) return;
        let tileDoc = tile.document;
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
        if (!refreshShape && !refreshPosition && !refreshRotation && !refreshSize) return;
        if (!region) return;
        if (!tooSoon) {            
            tooSoon = true;
            setTimeout(() => {
                tooSoon = false;;
                toDoOnTimeout()
            }, 100);
        }
        toDoOnTimeout = async () => {
            let newShape = {
                hole: false,
                type: 'rectangle',
                x: tileDoc.x,
                y: tileDoc.y,
                width: tileDoc.width,
                height: tileDoc.height,
                rotation: tileDoc.rotation
            };
            await region.update({
                'shapes': [newShape],
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACHED_TILE)]: tileDoc.uuid
            });
        }
    });

    Hooks.on('deleteTile', async (tileDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(tileDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        await region.delete();
    });

    Hooks.on('refreshMeasuredTemplate', async (template, { refreshGrid=false }) => {
        if (!refreshGrid) return;
        if (!game.user.isGM) return;
        let templateDoc = template.document;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        if (!tooSoon) {
            tooSoon = true;
            setTimeout(() => {
                tooSoon = false;
                toDoOnTimeout();
            }, 100);
        }
        toDoOnTimeout = async () => {
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
        }
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
        if (parentItem instanceof TileDocument) return;
        await regionConfig.document.delete();
    });

    Hooks.on('renderRegionConfig', async (regionConfig, element) => {
        if (!game.user.isGM) return;
        if (!regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION) &&
            !regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TILE)) return;
        element.querySelector('nav')?.remove();
        element.querySelector('section.tab.region-shapes')?.remove();
        element.querySelector('section.tab.region-identity')?.remove();
        element.querySelector('section.tab.region-behaviors').classList.add('active');
    });
}
