import CONSTANTS from './constants.js';
import { getFullFlagPath, openRegionConfig, getSetting, createElement } from './helpers.js';

export function registerDnd4eSheetOverrides() {
    Hooks.on('renderItemSheet4e', patchDnd4eItemSheet);
}

export function registerDnd5eSheetOverrides() {
    Hooks.on('renderActivitySheet', patchActivitySheet);
}

export function registerPF2eSheetOverrides() {
    Hooks.on('renderItemSheetPF2e', patchPF2eItemSheet);
}
export function registerSwadeSheetOverrides() {
    Hooks.on('renderItemSheet', patchSwadeItemSheet);
}

export function registerSheetOverrides() {
    Hooks.on('renderTileConfig', patchTileConfig);
}

function getAttachRegionHtml(document) {
    let isGM = game.user.isGM;
    let shouldDisable = document.sheet && !document.sheet.isEditable;
    return createElement(`
        <div class="form-group">
            <label>${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}</label>
            <div class="form-fields">
                <button id="configureRegionButton" style="flex: 1; white-space: nowrap;" ${(isGM && !shouldDisable) ? '' : 'disabled'} ${isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
                    <i class="fa fa-gear"></i>
                    ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
                </button>
            </div>
        </div>
    `);
}

// dnd4e
function patchDnd4eItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    html = html instanceof HTMLElement ? html : html[0];
    let targetTypeElem = html.querySelector('select[name="system.rangeType"]');
    if (!targetTypeElem) return;
    if (!Object.keys(CONFIG.DND4E.areaTargetTypes).includes(targetTypeElem.value)) return;
    let targetElem = targetTypeElem.parentNode.parentNode;
    if (!targetElem) return;
    targetElem.after(getAttachRegionHtml(item));
    html.querySelector('#configureRegionButton')?.addEventListener('click', () => {openRegionConfig(app.item)});
}

// dnd5e
function patchActivitySheet(app, html) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    if (app.options.classes.includes('tidy5e-sheet')) return;
    let templateTypeElem = html.querySelector('select[name="target.template.type"]');
    if (!templateTypeElem?.value?.length) return;
    let targetElem = templateTypeElem.parentNode.parentNode;
    if (!targetElem) return;

    // Migrate module flags lazily, now that activities can have flags
    if (app.activity && !app.activity.flags[CONSTANTS.MODULE_NAME] && app.activity.item.flags[CONSTANTS.MODULE_NAME] && app.activity.item.isOwner) {
        app.activity.item.update({
            flags: {
                [CONSTANTS.MODULE_NAME]: _del
            },
            [`system.activities.${app.activity.id}.flags`]: app.activity.item.flags[CONSTANTS.MODULE_NAME]
        });
    }
    targetElem.after(getAttachRegionHtml(app.activity));
    html.querySelector('#configureRegionButton')?.addEventListener('click', () => {openRegionConfig(app.activity)});
}

// pf2e
function patchPF2eItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;

    html = html instanceof HTMLElement ? html : html[0];
    let elementFound = html.querySelector('select[name="system.area.type"]');
    let position;
    // For non-spell items with an inline @Template in the description
    if (!elementFound && item.system?.description?.value?.includes("@Template")) {
        elementFound = html.querySelector('fieldset.publication');
        position = 'beforebegin';
        if (!elementFound) return;
    } else {
        // For spells, put it next to the Area input
        elementFound = elementFound?.parentNode?.parentNode;
        position = 'afterend';
        if (!elementFound) return;
    }

    elementFound.insertAdjacentHTML(position, getAttachRegionHtml(item).outerHTML);

    html.querySelector("#configureRegionButton").addEventListener('click', () => {openRegionConfig(item)});
}

// swade
function patchSwadeItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    html = html instanceof HTMLElement ? html : html[0];
    // Check if any of the template types are enabled
    let templateSection = html.querySelector('div[class="templates"]');
    let inputs = templateSection?.querySelectorAll("input") ?? [];
    let hasTemplate = [...inputs].some(i => i.checked);
    if (!hasTemplate) return;
    //If we have a template, insert the config button
    let configureButton = createElement(`
        <button id="configureRegionButton" style="flex: 1;"'}>
            <i class="fa fa-gear"></i>
            ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
        </button>
    `);
    configureButton.addEventListener('click', () => {openRegionConfig(app.item)});
    let configureButtonGroup = foundry.applications.fields.createFormGroup({
        label: 'REGION-ATTACHER.RegionAttacher',
        localize: true,
        input: configureButton
    });
    templateSection.after(configureButtonGroup);
}
function getTileRegionTabHtml(active=false) {
    return createElement(`
        <a ${active ? 'class="active" ' : ''}data-action="tab" data-group="sheet" data-tab="region">
            <i class="fas fa-chess-board"></i>
            ${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}
        </a>
    `);
}

function getTileRegionSectionHtml(document, active=false) {
    let isGM = game.user.isGM;
    let attachRegionToTile = foundry.utils.getProperty(document, getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)) ?? false;
    return createElement(`
        <div class="tab${active ? ' active' : ''}" data-tab="region" data-group="sheet" data-application-part="region">
            <div class="form-group">
                <label>${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}</label>
                <div class="form-fields">
                    <label class="checkbox">
                        <input id="attachRegionCheckbox" type="checkbox" name="${getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)}" ${attachRegionToTile ? 'checked' : ''}>
                        ${game.i18n.localize('REGION-ATTACHER.AttachRegionToTile')}
                    </label>
                    <button id="configureRegionButton" type="button" style="flex: 1;line-height: var(--input-height);" ${(attachRegionToTile && isGM) ? '' : 'disabled'} ${isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
                        <i class="fa fa-gear"></i>
                        ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
                    </button>
                </div>
            </div>
        </div>
    `);
}

function patchTileConfig(app, html, {document}) {
    if (!game.user.isGM) return;
    // Don't show if the tile hasn't yet been created
    if (!document.id) return;
    let existingSheet = html.querySelector('div.tab[data-application-part="region"]');
    let active = existingSheet?.classList.contains('active');
    if (existingSheet) existingSheet.remove();
    let firstTargetElem = [...(html.querySelector('nav.sheet-tabs')?.children ?? [])].at(-1);
    if (!firstTargetElem) return;
    firstTargetElem.after(getTileRegionTabHtml(active));
    let secondTargetElem = [...html.querySelectorAll('section div.tab')].at(-1);
    if (!secondTargetElem) return;
    secondTargetElem.after(getTileRegionSectionHtml(document, active));
    if (document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH)) {
        foundry.utils.setProperty(document, getFullFlagPath(CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH), false);
        html.querySelector('nav>[data-tab="region"]').click();
        let closeElement;
        if (html.matches('form')) {
            closeElement = html.querySelector('header button[data-action="close"]');
            if (!closeElement) closeElement = html.parentNode.previousElementSibling?.querySelector('.close');
        } else {
            closeElement = html.querySelector('.close');
        }
        let restoreNormalFunc = async () => {
            await document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH)]: false
            });
        };
        closeElement.onclick = restoreNormalFunc;
        html.querySelector('button[type="submit"]').onclick = restoreNormalFunc;
    }
    html.querySelector('#configureRegionButton').addEventListener("click", () => {openRegionConfig(document)});
    html.querySelector('#attachRegionCheckbox').onclick = async (event) => {
        await document.update({
            [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)]: event.target.checked,
            [getFullFlagPath(CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH)]: true
        });
    };
}
