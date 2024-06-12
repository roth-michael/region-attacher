import CONSTANTS from './constants.js';
import { getFullFlagPath, openRegionConfig, getSetting } from './helpers.js';

export default function registerSheetOverrides() {
    Hooks.on('renderItemSheet5e', patchItemSheet);
    Hooks.on('tidy5e-sheet.renderItemSheet', patchTidyItemSheet)
}

function getAttachRegionHtml(item, isTidy=false) {
    let isGM = game.user.isGM;
    let attachRegionToTemplate = foundry.utils.getProperty(item, getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)) ?? false;
    return `
        <div class="form-group">
            <label>${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}</label>
            <div class="form-fields">
                <label class="checkbox" ${isTidy? 'style="width: 26ch;"' : ''}>
                    <input type="checkbox" name="${getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)}" ${attachRegionToTemplate ? 'checked' : ''}>
                    ${game.i18n.localize('REGION-ATTACHER.AttachRegionToTemplate')}
                </label>
                <button id="configureRegionButton" style="flex: 1;" ${(attachRegionToTemplate && isGM) ? '' : 'disabled'} ${isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
                    <i class="fa fa-gear"></i>
                    ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
                </button>
            </div>
        </div>
    `
}

function patchItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    if (app.options.classes.includes('tidy5e-sheet')) return;
    let targetTypeElem = html.find('select[name="system.target.type"]')?.[0];
    if (!targetTypeElem) return;
    if (!Object.keys(CONFIG.DND5E.areaTargetTypes).includes(targetTypeElem.value)) return;
    let targetElem = targetTypeElem.parentNode.parentNode;
    if (!targetElem) return;
    $(getAttachRegionHtml(item)).insertAfter(targetElem);
    html.find('#configureRegionButton')[0].onclick = () => {openRegionConfig(item)};
}

function patchTidyItemSheet(app, element, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    const html = $(element);
    const markupToInject = `
        <div style="display: contents;" data-tidy-render-scheme="handlebars">
            ${getAttachRegionHtml(item, true)}
        </div>
    `
    let targetTypeElem = html.find('select[data-tidy-field="system.target.type"]')?.[0];
    if (!targetTypeElem) return;
    if (!Object.keys(CONFIG.DND5E.areaTargetTypes).includes(targetTypeElem.value)) return;
    let targetElem = targetTypeElem.parentNode.parentNode;
    if (!targetElem) return;
    $(markupToInject).insertAfter(targetElem);
    html.find('#configureRegionButton')[0].onclick = () => {openRegionConfig(item)};
}