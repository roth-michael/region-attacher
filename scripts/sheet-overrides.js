import CONSTANTS from "./constants.js";

export default function registerSheetOverrides() {
    Hooks.on("renderItemSheet5e", patchItemSheet);
}

function getAttachRegionHtml(item) {
    let attachRegionToTemplate = foundry.utils.getProperty(item, CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) ?? false;
    return `
        <div class="form-group">
            <label>${game.i18n.localize("REGION-ATTACHER.RegionAttacher")}</label>
            <div class="form-fields">
                <label class="checkbox">
                    <input type="checkbox" name="${CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE}" ${attachRegionToTemplate ? 'checked' : ''}>
                    ${game.i18n.localize("REGION-ATTACHER.AttachRegionToTemplate")}
                </label>
            </div>
        </div>
    `
}

function patchItemSheet(app, html, item) {
    let targetTypeElem = html.find('select[name="system.target.type"]')?.[0];
    if (!targetTypeElem) return;
    if (!Object.keys(CONFIG.DND5E.areaTargetTypes).includes(targetTypeElem.value)) return;
    let targetElem = targetTypeElem.parentNode.parentNode;
    $(getAttachRegionHtml(item)).insertAfter(targetElem)
}