import CONSTANTS from "./constants.js";
import { createDependentRegion, getFullFlagPath } from "./helpers.js";

export default function registerHooks() {
    Hooks.on('createMeasuredTemplate', async (templateDoc) => {
        if (!game.user.isGM) return;
        let originItem = await fromUuid(templateDoc.getFlag('dnd5e', 'origin'));
        if (!originItem) return;
        if (!(originItem.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) ?? false)) return;
        await createDependentRegion(templateDoc);
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
    })
}
