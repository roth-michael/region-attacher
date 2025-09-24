import CONSTANTS from './constants.js';
import { getFullFlagPath, openRegionConfig, getSetting, createElement } from './helpers.js';

export function registerDnd4eSheetOverrides() {
    Hooks.on('renderItemSheet4e', patchDnd4eItemSheet);
}

export function registerDnd5eSheetOverrides() {
    if (foundry.utils.isNewerVersion(4, game.system.version)) {
        Hooks.on('renderItemSheet5e', patchItemSheet);
        Hooks.on('tidy5e-sheet.renderItemSheet', patchTidyItemSheet);
    } else {
        Hooks.on('renderActivitySheet', patchActivitySheet);
    }
}

export function registerPF2eSheetOverrides() {
    Hooks.on('renderItemSheetPF2e', patchPF2eItemSheet);
}
export function registerSwadeSheetOverrides() {
    Hooks.on('renderItemSheet', patchSwadeItemSheet);
}

export function registerSheetOverrides() {
    Hooks.on('renderTileConfig', patchTileConfig);
    Hooks.on('renderMeasuredTemplateConfig', patchMeasuredTemplateConfig);
}

function getAttachRegionHtml(document, isTidy=false) {
    let isGM = game.user.isGM;
    let attachRegionToTemplate = foundry.utils.getProperty(document, getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)) ?? false;
    let shouldDisable = document.sheet && !document.sheet.isEditable;
    return createElement(`
        <div class="form-group">
            <label>${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}</label>
            <div class="form-fields">
                <label class="checkbox" ${isTidy? 'style="width: 26ch;"' : ''}>
                    <input id="attachRegionCheckbox" type="checkbox" name="${getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)}" ${shouldDisable ? 'disabled' : ''} ${attachRegionToTemplate ? 'checked' : ''} ${game.system.id === 'pf2e' ? 'style="margin-top: -5px;"' : ''}>
                    ${document instanceof MeasuredTemplateDocument ? game.i18n.localize('REGION-ATTACHER.AttachRegion') : game.i18n.localize('REGION-ATTACHER.AttachRegionToTemplate')}
                </label>
                <button id="configureRegionButton" style="flex: 1; white-space: nowrap;" ${(attachRegionToTemplate && isGM && !shouldDisable) ? '' : 'disabled'} ${isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
                    <i class="fa fa-gear"></i>
                    ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
                </button>
            </div>
        </div>
    `);
}

function getDetachRegionHtml(document) {
    if (!game.user.isGM) return;
    if (document.sheet && !document.sheet.isEditable) return;
    return createElement(`
        <div class="form-group">
            <label></label><!-- Empty label so that the formatting lines up -->
            <div class="form-fields">
                <button id="detachRegionButton" style="flex: 1;" data-tooltip="REGION-ATTACHER.DetachRegionTooltip">
                    <i class="fa fa-chain-broken"></i>
                    ${game.i18n.localize('REGION-ATTACHER.DetachRegion')}
                </button>
            </div>
        </div>
    `);
}

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

// dnd5e 3.x
function patchItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    if (app.options.classes.includes('tidy5e-sheet')) return;
    html = html instanceof HTMLElement ? html : html[0];
    let targetTypeElem = html.querySelector('select[name="system.target.type"]');
    if (!targetTypeElem) return;
    if (!Object.keys(CONFIG.DND5E.areaTargetTypes).includes(targetTypeElem.value)) return;
    let targetElem = targetTypeElem.parentNode.parentNode;
    if (!targetElem) return;
    targetElem.after(getAttachRegionHtml(item));
    html.querySelector('#configureRegionButton')?.addEventListener('click', () => {openRegionConfig(item)});
}

// dnd5e 4.x
function patchActivitySheet(app, html) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    if (app.options.classes.includes('tidy5e-sheet')) return;
    let templateTypeElem = html.querySelector('select[name="target.template.type"]');
    if (!templateTypeElem?.value?.length) return;
    let targetElem = templateTypeElem.parentNode.parentNode;
    if (!targetElem) return;
    let fullFlag = getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE) + `.${app.activity.id}`;
    let attachRegionToTemplate = foundry.utils.getProperty(app.item, fullFlag) ?? false;
    let attachCheckbox = dnd5e.applications.fields.createCheckboxInput(undefined, {
        name: getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE),
        value: attachRegionToTemplate
    });
    attachCheckbox._onClick = async (event) => {
        event.preventDefault();
        let activityId = app.activity?.id;
        let item = app.item;
        if (!item || !activityId) return;
        await item.update({[fullFlag]: !event.target.checked});
    }
    let attachCheckboxGroup = foundry.applications.fields.createFormGroup({
        label: 'REGION-ATTACHER.AttachRegionToTemplate',
        localize: true,
        input: attachCheckbox
    });
    let configureButton = createElement(`
        <button id="configureRegionButton" style="flex: 1;" ${(attachRegionToTemplate && game.user.isGM) ? '' : 'disabled'} ${game.user.isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
            <i class="fa fa-gear"></i>
            ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
        </button>
    `);
    configureButton.addEventListener('click', () => {openRegionConfig(app.item, app.activity)});
    let configureButtonGroup = foundry.applications.fields.createFormGroup({
        label: 'REGION-ATTACHER.RegionAttacher',
        localize: true,
        input: configureButton
    });
    targetElem.after(configureButtonGroup);
    targetElem.after(attachCheckboxGroup);
}

// PF2e
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

function patchTidyItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    html = html instanceof HTMLElement ? html : html[0];
    let injectElement = createElement(`
        <div style="display: contents;" data-tidy-render-scheme="handlebars">
            ${getAttachRegionHtml(item, true).outerHTML}
        </div>
    `);
    let targetTypeElem = html.querySelector('select[data-tidy-field="system.target.type"]');
    if (!targetTypeElem) return;
    if (!Object.keys(CONFIG.DND5E.areaTargetTypes).includes(targetTypeElem.value)) return;
    let targetElem = targetTypeElem.parentNode.parentNode;
    if (!targetElem) return;
    targetElem.after(injectElement)
    html.querySelector('#configureRegionButton').addEventListener('click', () => {openRegionConfig(item)});
}

// Swade
function patchSwadeItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    html = html instanceof HTMLElement ? html : html[0];
    // Check if any of the template types are enabled
    let templateSection = html.querySelector('div[class="templates"]');
    let inputs = templateSection?.querySelectorAll("input") ?? [];
    let hasTemplate = [...inputs].some(i => i.checked);
    if (!hasTemplate) return;
    //If we have a template, insert the attach region controls
    let fullFlag = getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE);
    let attachRegionToTemplate = foundry.utils.getProperty(item, fullFlag) ?? false;
    let attachCheckbox = foundry.applications.fields.createCheckboxInput({
        name: getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE),
        value: attachRegionToTemplate
    });
    attachCheckbox._onClick = async (event) => {
        event.preventDefault();
        await item.update({ [fullFlag]: !event.target.checked });
    };
    let attachCheckboxGroup = foundry.applications.fields.createFormGroup({
        label: 'REGION-ATTACHER.AttachRegionToTemplate',
        localize: true,
        input: attachCheckbox
    });
    templateSection.after(attachCheckboxGroup);
    //If attach is enabled, show the config button
    if (attachRegionToTemplate && game.user.isGM) {
        let configureButton = createElement(`
            <button id="configureRegionButton" style="flex: 1;"'}>
                <i class="fa fa-gear"></i>
                ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
            </button>
        `);
        configureButton.addEventListener('click', () => {openRegionConfig(app.item, app.activity)});
        let configureButtonGroup = foundry.applications.fields.createFormGroup({
            label: 'REGION-ATTACHER.RegionAttacher',
            localize: true,
            input: configureButton
        });
        attachCheckboxGroup.after(configureButtonGroup);
    }
}
function getRegionTabHtml(active=false) {
    return createElement(`
        <a ${active ? 'class="active" ' : ''}data-action="tab" data-group="sheet" data-tab="region">
            <i class="fas fa-chess-board"></i>
            ${game.i18n.localize('REGION-ATTACHER.RegionAttacher')}
        </a>
    `);
}

function getAttachRegionTabHtml(document, active=false) {
    let isGM = game.user.isGM;
    let attachRegionToTile = foundry.utils.getProperty(document, getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)) ?? false;
    let v13 = game.release.generation > 12;
    return createElement(`
        <div class="tab${active ? ' active' : ''}" data-tab="region"${v13 ? ' data-group="sheet" data-application-part="region"' : ''}>
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
    html = html instanceof HTMLElement ? html : html[0];
    let existingSheet = html.querySelector('div.tab[data-application-part="region"]');
    let active = existingSheet?.classList.contains('active');
    if (existingSheet) existingSheet.remove();
    let firstTargetElem = [...(html.querySelector('nav.sheet-tabs')?.children ?? [])].at(-1);
    if (!firstTargetElem) return;
    firstTargetElem.after(getRegionTabHtml(active));
    let secondTargetElem = [...html.querySelectorAll('section div.tab')].at(-1);
    if (!secondTargetElem) return;
    secondTargetElem.after(getAttachRegionTabHtml(document, active));
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

function patchMeasuredTemplateConfig(app, html, {document}) {
    if (!game.user.isGM) return;
    html = html instanceof HTMLElement ? html : html[0];
    html.style.height = 'auto';
    let tabs = html.querySelectorAll('nav');
    if (tabs.length) {
        let targetElem = [...(tabs.nextElementSibling?.children ?? [])].at(-1);
        if (!targetElem) return;
        targetElem.after(getAttachRegionHtml(document));
        html.querySelector('#configureRegionButton').addEventListener("click", (event) => {event.preventDefault(); openRegionConfig(document)});
        html.querySelector('#attachRegionCheckbox').onclick = async (event) => {
            await document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: event.target.checked
            });
        }
    } else {
        let targetElem = [...html.querySelectorAll("section .form-group")].at(-1);
        if (!targetElem) return;
        targetElem.after(getAttachRegionHtml(document));
        if (document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION)) {
            targetElem.after(getDetachRegionHtml(document));
        }
        html.querySelector('#configureRegionButton').addEventListener("click", (event) => {event.preventDefault(); openRegionConfig(document)});
        html.querySelector('#detachRegionButton')?.addEventListener("click", async () => {
            const detachedRegion = fromUuidSync(document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION));
            await Promise.all([
                document.update({
                    [getFullFlagPath(CONSTANTS.FLAGS.ATTACHED_REGION)]: "",
                    [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: false
                }),
                detachedRegion.update({[`flags.-=${CONSTANTS.MODULE_NAME}`]: null})
            ]);

        });
        html.querySelector('#attachRegionCheckbox').onclick = async (event) => {
            await document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: event.target.checked
            });
        };
    }
}
