import CONSTANTS from './constants.js';

export async function createDependentRegionForTile(tileDoc) {
    let shape = {
        hole: false,
        type: 'rectangle',
        x: tileDoc.x,
        y: tileDoc.y,
        width: tileDoc.width,
        height: tileDoc.height,
        rotation: tileDoc.rotation,
        anchorX: 0.5,
        anchorY: 0.5
    }
    let testRegionArr = await canvas.scene.createEmbeddedDocuments('Region', [{
        name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
        shapes: [shape],
        behaviors: tileDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) ?? [],
        visibility: getSetting(CONSTANTS.SETTINGS.DEFAULT_REGION_VISIBILITY) ?? 0
    }]);
    let testRegion = testRegionArr[0]
    await testRegion.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TILE, tileDoc.uuid);
    await tileDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION, testRegion.uuid);
    return testRegion;
}

export function getFullFlagPath(flag) {
    return `flags.${CONSTANTS.MODULE_NAME}.${flag}`;
}

export function getSetting(setting) {
    if (!Array.from(game.settings.settings.keys()).includes(`${CONSTANTS.MODULE_NAME}.${setting}`)) {
        console.warn(`Tried to get setting "${CONSTANTS.MODULE_NAME}.${setting}", which is not registered`)
        return undefined;
    }
    return game.settings.get(CONSTANTS.MODULE_NAME, setting);
}

export async function openRegionConfig(parentDocument) {
    // let region = await fromUuid(parentDocument.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
    // temp
    let region = await fromUuid(parentDocument.flags?.[CONSTANTS.MODULE_NAME]?.[CONSTANTS.FLAGS.ATTACHED_REGION]);
    if (!(parentDocument instanceof TileDocument)) {
        if (!canvas.scene) return;
        region = (await canvas.scene.createEmbeddedDocuments('Region', [{
            name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
            shapes: [],
            // behaviors: parentDocument.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) ?? []
            // temp
            behaviors: parentDocument.flags?.[CONSTANTS.MODULE_NAME]?.[CONSTANTS.FLAGS.REGION_BEHAVIORS] ?? [],
            flags: {
                [CONSTANTS.MODULE_NAME]: {
                    [CONSTANTS.FLAGS.IS_CONFIG_REGION]: true,
                    [CONSTANTS.FLAGS.ORIGIN]: parentDocument.uuid
                }
            }
        }]))[0];
    }
    if (!region) return;
    await (new foundry.applications.sheets.RegionConfig({document: region}).render({force: true}));
}

export function createElement(innerHTML) {
    let template = document.createElement('template');
    template.innerHTML = innerHTML;
    return template.content.children[0];
}