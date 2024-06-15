import CONSTANTS from './constants.js';
import { getFullFlagPath, openRegionConfig, getSetting } from './helpers.js';

export function registerDnd5eSheetOverrides() {
    Hooks.on('renderItemSheet5e', patchItemSheet);
    Hooks.on('tidy5e-sheet.renderItemSheet', patchTidyItemSheet);
}

export function registerSheetOverrides() {
    Hooks.on('renderTileConfig', patchTileConfig);
    Hooks.on('renderMeasuredTemplateConfig', patchMeasuredTemplateConfig);
}

function getAttachRegionHtml(document, isTidy=false) {
    let isGM = game.user.isGM;
    let attachRegionToTemplate = foundry.utils.getProperty(document, getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)) ?? false;
    return `
        <div class="form-group">
            <label>${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}</label>
            <div class="form-fields">
                <label class="checkbox" ${isTidy? 'style="width: 26ch;"' : ''}>
                    <input type="checkbox" name="${getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)}" ${attachRegionToTemplate ? 'checked' : ''}>
                    ${document instanceof MeasuredTemplateDocument ? game.i18n.localize('REGION-ATTACHER.AttachRegion') : game.i18n.localize('REGION-ATTACHER.AttachRegionToTemplate')}
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

function getRegionTabHtml() {
    return `
        <a class="item" data-tab="region">
            <i class="fas fa-chess-board"></i>
            ${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}
        </a>
    `
}

function getAttachRegionTabHtml(document) {
    let isGM = game.user.isGM;
    let attachRegionToTile = foundry.utils.getProperty(document, getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)) ?? false;
    return `
        <div class="form-group">
            <label>${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}</label>
            <div class="form-fields">
                <label class="checkbox">
                    <input type="checkbox" name="${getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)}" ${attachRegionToTile ? 'checked' : ''}>
                    ${game.i18n.localize('REGION-ATTACHER.AttachRegionToTile')}
                </label>
                <button id="configureRegionButton" type="button" style="flex: 1;" ${(attachRegionToTile && isGM) ? '' : 'disabled'} ${isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
                    <i class="fa fa-gear"></i>
                    ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
                </button>
            </div>
        </div>
    `
}

function patchTileConfig(app, html, {document}) {
    if (!game.user.isGM) return;
    // Don't show if the tile hasn't yet been created
    if (!document.id) return;
    let firstTargetElem = html.find('nav.sheet-tabs > a.item[data-tab="animation"]')?.[0];
    if (!firstTargetElem) return;
    $(getRegionTabHtml()).insertAfter(firstTargetElem);
    let secondTargetElem = html.find('div.tab[data-tab="animation"]')?.[0];
    if (!secondTargetElem) return;
    $(`
        <div class="tab" data-tab="region">
            ${getAttachRegionTabHtml(document)}
        </div>
    `).insertAfter(secondTargetElem);
    html.find('#configureRegionButton')[0].onclick = () => {openRegionConfig(document)};
}

function patchMeasuredTemplateConfig(app, html, {document}) {
    if (!game.user.isGM) return;
    let targetElem = html.find('button[type="submit"]')?.[0];
    if (!targetElem) return;
    $(getAttachRegionHtml(document)).insertBefore(targetElem);
    html.find('#configureRegionButton')[0].onclick = () => {openRegionConfig(document)};
}