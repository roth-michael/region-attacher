import CONSTANTS from "./constants.js";
import { createDependentRegion } from "./helpers.js";

export default function registerHooks() {
    Hooks.on('createMeasuredTemplate', async (templateDoc) => {
        let originItem = await fromUuid(templateDoc.getFlag('dnd5e', 'origin'));
        if (!originItem) return;
        // TODO: check if item is set to enable region attaching
        await createDependentRegion(templateDoc);
    });

    Hooks.on('updateMeasuredTemplate', async (templateDoc) => {
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
            [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAGS.ATTACHED_TEMPLATE}`]: templateDoc.uuid
        });
    });
    
    Hooks.on('deleteMeasuredTemplate', async (templateDoc) => {
        let region = await fromUuid(templateDoc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
        if (!region) return;
        await region.delete();
    })
}
