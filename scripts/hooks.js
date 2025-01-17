import CONSTANTS from './constants.js';
import { createDependentRegionForTemplate, createDependentRegionForTile, getFullFlagPath } from './helpers.js';

export default function registerHooks() {
    let modifyingRegionFlags = {};
    let updateRegionFlags = {};

    if (game.system.id === 'dnd5e') {
        if (foundry.utils.isNewerVersion(game.system.version, '4')) {
            Hooks.on('dnd5e.preCreateActivityTemplate', (activity, templateData) => {
                let flags = foundry.utils.getProperty(activity.item, `flags.${CONSTANTS.MODULE_NAME}`);
                if (flags) foundry.utils.setProperty(templateData, `flags.${CONSTANTS.MODULE_NAME}`, flags);
            });
        } else {
            Hooks.on('dnd5e.preCreateItemTemplate', (item, templateData) => {
                let flags = foundry.utils.getProperty(item, `flags.${CONSTANTS.MODULE_NAME}`);
                if (flags) foundry.utils.setProperty(templateData, `flags.${CONSTANTS.MODULE_NAME}`, flags);
            });
        }
    }

    Hooks.on('createMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let systemId = game.system.id;
        if (['dnd5e', 'pf2e'].includes(systemId)) {
            let flagDocument;
            let actorUuid;
            let activityUuid;
            let activityId = '';
            let originUuid;
            if (systemId === 'dnd5e') {
                flagDocument = templateDoc;
                if (foundry.utils.isNewerVersion(game.system.version, '4')) {
                    // Activity handling
                    activityUuid = templateDoc.getFlag('dnd5e', 'origin');
                    activityId = activityUuid?.split('.').at(-1);
                    originUuid = templateDoc.getFlag('dnd5e', 'item');
                } else {
                    originUuid = templateDoc.getFlag('dnd5e', 'origin');
                }
                actorUuid = originUuid?.split('.').toSpliced(-2).join('.');
            } else if (systemId === 'pf2e') {
                originUuid = templateDoc.getFlag('pf2e', 'origin.uuid');
                flagDocument = await fromUuid(originUuid);
                actorUuid = flagDocument?.actor?.uuid;
            }
            if (!(flagDocument?.getFlag(CONSTANTS.MODULE_NAME, `${CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE}.${activityId}`) ?? false)) {
                await templateDoc.update({[getFullFlagPath(CONSTANTS.FLAGS.CREATION_COMPLETE)]: true});
                return;
            };
            let templateUpdates = {
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACHED_REGION)]: flagDocument.getFlag(CONSTANTS.MODULE_NAME, `${CONSTANTS.FLAGS.ATTACHED_REGION}.${activityId}`),
                [getFullFlagPath(CONSTANTS.FLAGS.REGION_BEHAVIORS)]:  flagDocument.getFlag(CONSTANTS.MODULE_NAME, `${CONSTANTS.FLAGS.REGION_BEHAVIORS}.${activityId}`) || [],
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: true,
                [getFullFlagPath(CONSTANTS.FLAGS.CREATION_COMPLETE)]: true
            };
            let region = await createDependentRegionForTemplate(templateDoc, flagDocument.getFlag(CONSTANTS.MODULE_NAME, `${CONSTANTS.FLAGS.REGION_BEHAVIORS}.${activityId}`));
            let regionUpdates = {
                'flags': {
                    [CONSTANTS.MODULE_NAME]: {
                        [CONSTANTS.FLAGS.ITEM_UUID]: originUuid
                    }
                }
            };
            if (activityUuid) regionUpdates.flags[CONSTANTS.MODULE_NAME][CONSTANTS.FLAGS.ACTIVITY_UUID] = activityUuid;
            if (actorUuid) regionUpdates.flags[CONSTANTS.MODULE_NAME][CONSTANTS.FLAGS.ACTOR_UUID] = actorUuid;
            await region.update(regionUpdates);
            await templateDoc.update(templateUpdates);
        } else {
            await templateDoc.update({[getFullFlagPath(CONSTANTS.FLAGS.CREATION_COMPLETE)]: true});
        }
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
        if (modifyingRegionFlags[templateDoc.uuid]) return;
        if (!templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.CREATION_COMPLETE)) return;
        modifyingRegionFlags[templateDoc.uuid] = true;
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        let shouldHaveRegion = templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) || false;
        if (shouldHaveRegion && !region) {
            region = await createDependentRegionForTemplate(templateDoc);
            let itemUuid;
            if (game.system.id === 'dnd5e') {
                itemUuid = templateDoc.flags?.dnd5e?.origin;
            } else if (game.system.id === 'pf2e') {
                itemUuid = templateDoc.flags?.pf2e?.origin?.uuid;
            }
            if (itemUuid) {
                let originItem = await fromUuid(itemUuid);
                let activity;
                if (originItem?.documentName === 'Activity') {
                    activity = originItem;
                    originItem = originItem.item;
                }
                let actorUuid = originItem?.actor?.uuid;
                let updates = {
                    'flags': {
                        [CONSTANTS.MODULE_NAME]: {
                            [CONSTANTS.FLAGS.ITEM_UUID]: itemUuid
                        }
                    }
                }
                if (activity) updates.flags[CONSTANTS.MODULE_NAME][CONSTANTS.FLAGS.ACTIVITY_UUID] = activity.uuid;
                if (actorUuid) updates.flags[CONSTANTS.MODULE_NAME][CONSTANTS.FLAGS.ACTOR_UUID] = actorUuid;
                await region.update(updates);
            }
            await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE, true);
        } else if (region && !shouldHaveRegion) {
            await region.delete();
            await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE, false);
        }
        delete modifyingRegionFlags[templateDoc.uuid];
    });

    Hooks.on('refreshMeasuredTemplate', async (template) => {
        if (!game.user.isGM) return;
        let isDragging = game.canvas.currentMouseManager?.isDragging;
        if (isDragging) return;
        let templateDoc = template.document;
        if (!templateDoc) return;
        if (!templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.CREATION_COMPLETE)) return;
        if (!templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)) return;
        if (updateRegionFlags[templateDoc.uuid]) return;
        updateRegionFlags[templateDoc.uuid] = true;
        setTimeout(async () => {
            let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
            if (!region) {
                delete updateRegionFlags[templateDoc.uuid];
                return;
            }
            let origShape = templateDoc.object?.shape;
            if (!origShape) {
                delete updateRegionFlags[templateDoc.uuid];
                return;
            }
            let points = origShape.points ?? origShape.toPolygon().points;
            let newShape = {
                points: points.map((pt, ind) => ind % 2 ? pt + templateDoc.y : pt + templateDoc.x),
                hole: false,
                type: 'polygon'
            }
            await region?.update({
                'shapes': [newShape]
            });
            delete updateRegionFlags[templateDoc.uuid];
        }, 50)
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
            if (game.system.id === 'dnd5e' && parentItem.documentName === 'Activity') {
                await parentItem.item?.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS + `.${parentItem.id}`, regionBehaviors);
            } else {
                await parentItem.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS, regionBehaviors);
            }
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
        element.querySelector('nav')?.classList?.add('hidden');
        element.querySelector('section.tab.region-shapes')?.classList?.add('hidden');
        element.querySelector('section.tab.region-identity')?.classList?.add('hidden');
        element.querySelector('section.tab.region-behaviors').classList.add('active');
    });
}
