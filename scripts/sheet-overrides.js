import CONSTANTS from './constants.js';
import { getFullFlagPath, openRegionConfig, getSetting } from './helpers.js';

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
    return `
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
    `
}

function getDetachRegionHtml(document) {
    if (!game.user.isGM) return;
    if (document.sheet && !document.sheet.isEditable) return;
    return `
        <div class="form-group">
            <label></label><!-- Empty label so that the formatting lines up -->
            <div class="form-fields">
                <button id="detachRegionButton" style="flex: 1;" data-tooltip="REGION-ATTACHER.DetachRegionTooltip">
                    <i class="fa fa-chain-broken"></i>
                    ${game.i18n.localize('REGION-ATTACHER.DetachRegion')}
                </button>
            </div>
        </div>
    `
}

// dnd5e 3.x
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

// dnd5e 4.x
function patchActivitySheet(app, element) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    if (app.options.classes.includes('tidy5e-sheet')) return;
    let html = $(element);
    let templateTypeElem = html.find('select[name="target.template.type"]')?.[0];
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
    let configureButton = $(`
        <button id="configureRegionButton" style="flex: 1;" ${(attachRegionToTemplate && game.user.isGM) ? '' : 'disabled'} ${game.user.isGM ? '' : 'data-tooltip="REGION-ATTACHER.NonGMConfigureTooltip"'}>
            <i class="fa fa-gear"></i>
            ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
        </button>
    `)[0];
    configureButton.onclick = () => {openRegionConfig(app.item, app.activity)};
    let configureButtonGroup = foundry.applications.fields.createFormGroup({
        label: 'REGION-ATTACHER.RegionAttacher',
        localize: true,
        input: configureButton
    });
    $(configureButtonGroup).insertAfter(targetElem);
    $(attachCheckboxGroup).insertAfter(targetElem);
}

// PF2e
function patchPF2eItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;

    let elementFound = html.find('select[name="system.area.type"]')?.[0];
    // For non-spell items with an inline @Template in the description
    if (!elementFound && item.system?.description?.value?.includes("@Template")) {
        elementFound = html.find('fieldset.publication')?.[0];
        if (!elementFound) return;
        $(getAttachRegionHtml(item)).insertBefore(elementFound);
    } else {
        // For spells, put it next to the Area input
        elementFound = elementFound?.parentNode?.parentNode;
        if (!elementFound) return;
        $(getAttachRegionHtml(item)).insertAfter(elementFound);
    }

    html.find("#configureRegionButton")[0].onclick = () => {
        openRegionConfig(item);
    };
}

function patchTidyItemSheet(app, element, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    let html = $(element);
    let markupToInject = `
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

// Swade
function patchSwadeItemSheet(app, html, { item }) {
    if (!game.user.isGM && !getSetting(CONSTANTS.SETTINGS.SHOW_OPTIONS_TO_NON_GMS)) return;
    // Check if any of the template types are enabled
    let templateSection = html.find('div[class="templates"]');
    let inputs = templateSection.find("input");
    let hasTemplate = false;
    for (let input of inputs) {
        if (input.checked) {
            hasTemplate = true;
            break;
        }
    }
    //If we have a template, insert the attach region controls
    if (hasTemplate) {
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
        $(attachCheckboxGroup).insertAfter(templateSection);
        //If attach is enabled, show the config button
        if (attachRegionToTemplate && game.user.isGM) {
            let configureButton = $(`
                <button id="configureRegionButton" style="flex: 1;"'}>
                    <i class="fa fa-gear"></i>
                    ${game.i18n.localize('REGION-ATTACHER.ConfigureRegion')}
                </button>
            `)[0];
            configureButton.onclick = () => { openRegionConfig(app.item, app.activity); };
            let configureButtonGroup = foundry.applications.fields.createFormGroup({
                label: 'REGION-ATTACHER.RegionAttacher',
                localize: true,
                input: configureButton
            });
            $(configureButtonGroup).insertAfter(attachCheckboxGroup);
        }
    }
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
                    <input id="attachRegionCheckbox" type="checkbox" name="${getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)}" ${attachRegionToTile ? 'checked' : ''}>
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
    if (document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH)) {
        foundry.utils.setProperty(document, getFullFlagPath(CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH), false);
        html.find('nav>[data-tab="region"]')[0].click();
        let closeElement;
        if (html.is('form')) {
            closeElement = html.parent().prev().find('.close')[0];
        } else {
            closeElement = html.find('.close')[0];
        }
        let restoreNormalFunc = async () => {
            document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH)]: false
            });
        };
        closeElement.onclick = restoreNormalFunc;
        html.find('button[type="submit"]')[0].onclick = restoreNormalFunc;
    }
    html.find('#configureRegionButton')[0].onclick = () => {openRegionConfig(document)};
    html.find('#attachRegionCheckbox')[0].onclick = async (event) => {
        await document.update({
            [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TILE)]: event.target.checked,
            [getFullFlagPath(CONSTANTS.FLAGS.JUST_TOGGLED_ATTACH)]: true
        });
    };
}

function patchMeasuredTemplateConfig(app, html, {document}) {
    if (!game.user.isGM) return;
    html.height('auto');
    let tabs = html.find('nav');
    if (tabs.length) {
        let targetElem = tabs.next().children().last()?.[0];
        if (!targetElem) return;
        $(getAttachRegionHtml(document)).insertAfter(targetElem);
        html.find('#configureRegionButton')[0].onclick = (event) => {event.preventDefault(); openRegionConfig(document)};
        html.find('#attachRegionCheckbox')[0].onclick = async (event) => {
            await document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: event.target.checked
            });
        }
    } else {
        let targetElem = html.find('button[type="submit"]')?.[0];
        if (!targetElem) return;
        $(getAttachRegionHtml(document)).insertBefore(targetElem);
        if (app.object.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAGS.ATTACHED_REGION)) {
            $(getDetachRegionHtml(document)).insertBefore(targetElem);
        }
        html.find('#configureRegionButton')[0].onclick = (event) => {event.preventDefault(); openRegionConfig(document)};
        html.find('#detachRegionButton')[0].onclick = async (event) => {
            event.preventDefault();
            await document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACHED_REGION)]: "",
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: false
            });
        };
        html.find('#attachRegionCheckbox')[0].onclick = async (event) => {
            await document.update({
                [getFullFlagPath(CONSTANTS.FLAGS.ATTACH_REGION_TO_TEMPLATE)]: event.target.checked
            });
        }
    }
}
