# Region Attacher Changelog

## Version 1.4.1
- Fixed broken Measured Template config

## Version 1.4.0
- Fixed regions to still live-update for templates as long as the GM isn't dragging something on the canvas - this should allow regins to "stick to" moving tokens (if a template is attached to a token)
- Measured Template config improvements:
    - Added compatibility for modules which add tabs to config
    - Fixed bug where pressing "Configure Region" in config would close the config
    - Clicking "Attach Region" checkbox in config now immediately updates the template, so you can attach & configure without having to hit "Update Measured Template"
- Clicking "Attach Region" checkbox in Tile config no longer resets the active tab

## Version 1.3.0
- Got rid of the "live-preview" of regions moving while templates/tiles were being dragged or resized - this caused some visual bugs & could cause unintended interactions on the scene

## Version 1.2.0
- Should now be system agnostic (though with extra functionality for dnd5e)
- MeasuredTemplate config now has an added toggle for enabling region attachment & configuring the attached region

## Version 1.1.0
- First pass at attaching regions to tiles; currently only supported after tile is created
    - Currently when dragging a tile to change its size, there's some visual flickering, I hope to remedy that at some point
- Changed region update code to only update once every 100ms at most, which should reduce any performance hit
    - This change assumes only one region should be updating within a given 100ms window, so won't fully work for dragging multiple tiles with regions attached, for instance; in this case, moving each tile a small amount and back after such a multi-drag will update them each in turn

## Version 1.0.2
- Fixed bug introduced in last bugfix where region would never update

## Version 1.0.1
- Fixed feedback loop that caused region to re-update whenever associated template was hovered

## Version 1.0.0
- Added setting for the GM to allow players the see the checkbox & configuration button on their item sheets
    - If enabled, the player will still not be able to configure the region, but they'll be able to toggle whether it's created
- Added setting for devault visibility of item-created regions (mirroring the dropdown available on a full scene region configuration window)
- Scene regions should now stick more accurately to templates in the instance that they are rotated without moving their position

## Version 0.4.0
- Region Configuration Menu added; now if attaching a Scene Region to an item-created template, can pre-configure its behaviors in the item sheet
    - For now, this is restricted only to GMs, as a temporary region is created in the background while the behaviors are pre-configured

## Version 0.3.1
- Added tidy5e integration

## Version 0.3.0
- Added changelog
- Ensured only GM will run code in hooks