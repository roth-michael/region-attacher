import CONSTANTS from './constants.js';
import { createDependentRegionForTile, getFullFlagPath } from './helpers.js';

export default function registerHooks() {
    if (game.system.id === 'dnd5e') {
        Hooks.on('dnd5e.preCreateActivityTemplate', (activity, templateData) => {
            let flags = foundry.utils.getProperty(activity.item, `flags.${CONSTANTS.MODULE_NAME}`);
            if (flags) foundry.utils.setProperty(templateData, `flags.${CONSTANTS.MODULE_NAME}`, flags);
        });
    }

    Hooks.on('createRegion', async (region) => {
        if (!game.user.isGM || region.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION)) return;
        let systemId = game.system.id;
        if (['dnd4e', 'dnd5e', 'pf2e', 'swade'].includes(systemId)) {
            let flagDocument;
            let actorUuid;
            let originUuid;
            if (systemId === 'dnd4e') {
                originUuid = region.getFlag('dnd4e', 'origin');
                flagDocument = await fromUuid(originUuid);
                actorUuid = flagDocument?.actor?.uuid;
            } else if (systemId === 'dnd5e') {
                originUuid = region.getFlag('dnd5e', 'origin');
                flagDocument = await fromUuid(originUuid);
                actorUuid = flagDocument?.actor?.uuid;

                // Migrate module flags lazily, now that activities can have flags
                if (flagDocument && !flagDocument.flags[CONSTANTS.MODULE_NAME] && flagDocument.item.flags[CONSTANTS.MODULE_NAME]) {
                    await flagDocument.item.update({
                        flags: {
                            [CONSTANTS.MODULE_NAME]: _del
                        },
                        [`system.activities.${flagDocument.id}.flags`]: flagDocument.item.flags[CONSTANTS.MODULE_NAME]
                    });
                }
            } else if (systemId === 'pf2e') {
                originUuid = region.getFlag('pf2e', 'origin.uuid');
                flagDocument = await fromUuid(originUuid);
                actorUuid = flagDocument?.actor?.uuid;
            } else if (systemId === 'swade') {
                originUuid = region.getFlag('swade', 'origin');
                flagDocument = await fromUuid(originUuid);
                actorUuid = flagDocument?.actor?.uuid;
            }
            if (!flagDocument) return;
            //let behaviors = flagDocument.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) ?? []
            // temp
            let behaviors = flagDocument.flags?.[CONSTANTS.MODULE_NAME]?.[CONSTANTS.FLAGS.REGION_BEHAVIORS] ?? []
            await region.createEmbeddedDocuments("RegionBehavior", behaviors);
            if (actorUuid) await region.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ACTOR_UUID, actorUuid);
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
            rotation: tileDoc.rotation,
            anchorX: 0.5,
            anchorY: 0.5
        };
        await region.update({
            'shapes': [newShape]
        });
    });

    Hooks.on('deleteTile', async (tileDoc) => {
        if (!game.user.isGM) return;
        let region = await fromUuid(tileDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        await region?.delete();
    });

    Hooks.on('closeRegionConfig', async (regionConfig) => {
        if (!game.user.isGM) return;
        let regionBehaviors = Array.from(regionConfig.document.behaviors) ?? [];
        if (regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION)) {
            let parentDocument = await fromUuid(regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ORIGIN));
            if (!parentDocument) return;
            // await parentDocument.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS, regionBehaviors);
            // temp
            await parentDocument.update({[getFullFlagPath(CONSTANTS.FLAGS.REGION_BEHAVIORS)]: regionBehaviors});
            if (parentDocument instanceof TileDocument) return;
            await regionConfig.document.delete();
        } else {
            let parentDocumentUuid = regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TILE);
            let parentDocument = await fromUuid(parentDocumentUuid);
            if (!parentDocument) return;
            await parentDocument.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS, regionBehaviors);
        }
    });

    Hooks.on('renderRegionConfig', async (regionConfig, element) => {
        if (!game.user.isGM) return;
        if (!regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION) &&
            !regionConfig.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TILE)) return;
        element.querySelector('nav')?.classList?.add('hidden');
        element.querySelector('section.tab.region-appearance')?.classList?.add('hidden');
        element.querySelector('section.tab.region-area')?.classList?.add('hidden');
        element.querySelector('section.tab.region-behaviors').classList.add('active');
    });
}
