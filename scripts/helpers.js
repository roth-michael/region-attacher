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
        visibility: 1 // TODO: have as an option
    }]);
    let testRegion = testRegionArr[0]
    await testRegion.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TEMPLATE, templateDoc.uuid);
    await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION, testRegion.uuid);
    return testRegion;
}

export function getFullFlagPath(flag) {
    return `flags.${CONSTANTS.MODULE_NAME}.${flag}`;
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