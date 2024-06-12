# Region Attacher Changelog

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