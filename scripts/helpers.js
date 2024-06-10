import CONSTANTS from "./constants.js";

export async function createDependentRegion(templateDoc) {
    let origShape = templateDoc.object.shape ?? templateDoc.object._computeShape();
    let points = origShape.points ?? origShape.toPolygon().points;
    let shape = {
        hole: false,
        type: 'polygon',
        points: points
    }
    let testRegionArr = await canvas.scene.createEmbeddedDocuments("Region", [{
        name: RegionDocument.implementation.defaultName({parent: canvas.scene}),
        shapes: [shape],
        visibility: 1 // TODO: have as an option
    }]);
    let testRegion = testRegionArr[0]
    await testRegion.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_TEMPLATE, templateDoc.uuid);
    await templateDoc.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION, testRegion.uuid);
    return testRegion;
}