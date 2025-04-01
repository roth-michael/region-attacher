import CONSTANTS from './constants.js';

export async function createDependentRegionForTemplate(templateDoc, specifiedBehaviors) {
    if (!templateDoc.object.shape) {
        //If we have no shape, we need to refresh it to create and configuring the shape correctly
        templateDoc.object._refreshShape();
    }
    let origShape = templateDoc.object.shape ?? templateDoc.object._computeShape();
    let points = origShape.points ?? origShape.toPolygon().points;
    let shape = {
        hole: false,
        type: 'polygon',
        points: points.map((pt, ind) => ind % 2 ? pt + templateDoc.y : pt + templateDoc.x)
    }
    let testRegionArr = await canvas.scene.createEmbeddedDocuments('Region', [{
        name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
        shapes: [shape],
        behaviors: specifiedBehaviors ?? templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) ?? [],
        visibility: getSetting(CONSTANTS.SETTINGS.DEFAULT_REGION_VISIBILITY) ?? 0
    }]);
    let testRegion = testRegionArr[0]
    await testRegion.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TEMPLATE, templateDoc.uuid);
    await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION, testRegion.uuid);
    return testRegion;
}

export async function createDependentRegionForTile(tileDoc) {
    let shape = {
        hole: false,
        type: 'rectangle',
        x: tileDoc.x,
        y: tileDoc.y,
        width: tileDoc.width,
        height: tileDoc.height,
        rotation: tileDoc.rotation
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

export async function openRegionConfig(parentDocument, parentActivity) {
    let region = await fromUuid(parentDocument.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
    if (parentDocument instanceof TileDocument || parentDocument instanceof MeasuredTemplateDocument) {
        if (!region) return;
    } else {
        region = (await canvas.scene.createEmbeddedDocuments('Region', [{
            name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
            shapes: [],
            behaviors: parentDocument.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS + (parentActivity ? `.${parentActivity.id}` : '')) ?? []
        }]))[0];
        await region.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION, true);
        await region.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ORIGIN, (parentActivity ?? parentDocument).uuid);
    }
    let renderedConfig = await (new foundry.applications.sheets.RegionConfig({document: region}).render({force: true}));
    renderedConfig.element.querySelector('section.tab.region-behaviors').classList += ' active';
}

export function createElement(innerHTML) {
    let template = document.createElement('template');
    template.innerHTML = innerHTML;
    return template.content.children[0];
}