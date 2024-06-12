import CONSTANTS from './constants.js';

export async function createDependentRegion(templateDoc, originItem) {
    let origShape = templateDoc.object.shape ?? templateDoc.object._computeShape();
    let points = origShape.points ?? origShape.toPolygon().points;
    let shape = {
        hole: false,
        type: 'polygon',
        points: points
    }
    let testRegionArr = await canvas.scene.createEmbeddedDocuments('Region', [{
        name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
        shapes: [shape],
        behaviors: originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) ?? [],
        visibility: getSetting(CONSTANTS.SETTINGS.DEFAULT_REGION_VISIBILITY) ?? 0
    }]);
    let testRegion = testRegionArr[0]
    await testRegion.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TEMPLATE, templateDoc.uuid);
    await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION, testRegion.uuid);
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

export async function openRegionConfig(item) {
    let tempRegion = (await canvas.scene.createEmbeddedDocuments('Region', [{
        name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
        shapes: [],
        behaviors: item.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.REGION_BEHAVIORS) ?? []
    }]))[0];
    await tempRegion.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.IS_CONFIG_REGION, true);
    await tempRegion.setFlag('dnd5e', 'origin', item.uuid);
    let renderedConfig = await (new foundry.applications.sheets.RegionConfig({document: tempRegion}).render({force: true, parts: ['behaviors', 'footer']}));
    renderedConfig.element.querySelector('section.tab.region-behaviors').classList += ' active';
}