# Glions

Glions is a Bedrock Edition economy and trading package with a companion UI resource pack.

## Contents
- `Glions_BP` — behavior pack with economy, shop, trade, and admin scripting.
- `Glions_RP` — resource pack with UI assets for icons, panels, and atlas metadata.

## Installation
1. Copy the `Glions_BP` folder to your Bedrock world's `behavior_packs` folder.
2. Copy the `Glions_RP` folder to your world's `resource_packs` folder.
3. Enable both packs in the world settings.
4. Enable `Experimental Gameplay` and `Enable Scripting` if your Bedrock version requires them.
5. Start the world.

## Usage
- `/glions` — open the main Glions menu.
- `/glions.trade invite <player>` — invite a player to trade.
- `/glions.trade accept <player>` — accept an open trade invite.
- `/glions.trade view` — open your current pending trade.
- `/glions.trade cancel` — cancel your current pending trade.
- `/glions.admin` — open the admin GUI (requires operator permission level 2).
- `/glions.exportlogs` — export recent transaction logs to the sender (requires operator permission level 2).

## Configuration
Edit `Glions_BP/config/settings.json` and `Glions_BP/config/prices.json`:
- `settings.json` controls currency name, symbol, starting balance, trade timeout, and negative balance rules.
- `prices.json` defines sell prices, buy prices, and shop categories.

## Notes
- Balances persist using the scoreboard objective `glions`.
- The behavior pack initializes a player's balance the first time they join.
- The resource pack assets are optional visual enhancements; the script currently uses Bedrock modal forms for UI.

## Testing
- Verify the scoreboard objective exists with `/scoreboard objectives list`.
- Test selling and buying from the shop.
- Test the trade workflow: invite, accept, add items, confirm, and verify item exchange.
- Verify admin tools with `/glions.admin` and `/glions.exportlogs`.

## Files
- `Glions_BP/scripts/glions.js` — main script.
- `Glions_BP/manifest.json` — behavior pack manifest.
- `Glions_BP/config/prices.json` — shop pricing.
- `Glions_BP/config/settings.json` — currency and trade settings.
- `Glions_RP/manifest.json` — resource pack manifest.
- `Glions_RP/ui/glions_ui.json` — UI asset mapping.
- `Glions_RP/textures/ui/glions_atlas.json` — atlas metadata.
- `package_mspack.ps1` — PowerShell packaging script.

Note: `Glions_BP` now declares a dependency on `Glions_RP` so the behavior pack is aligned with the resource pack.

## Packaging
Run the repository bundle script only for source distribution or manual inspection. It creates a `.mspack` archive containing both pack folders, but that bundle is not a direct Minecraft import package.

```powershell
.\package_mspack.ps1
```

You can also specify a custom filename:

```powershell
.\package_mspack.ps1 -OutputFile GlionsCustom.mspack
```

The script packages:
- `Glions_BP`
- `Glions_RP`

### Creating a valid combined addon `.mcpack`
Minecraft requires a `.mcpack` file to contain pack content at the archive root. Use the new builder script to generate a single combined addon package:

```powershell
.\package_mcpack.ps1
```

This produces `Glions_Addon.mcpack` with both the behavior pack and resource pack merged correctly.

### Building separate `.mcpack` files
If you prefer separate pack files, use the installer script:

```powershell
.\install_glions_bp.ps1 -BuildMcpack
```

This builds:
- `Glions_BP.mcpack` from `Glions_BP`
- `Glions_RP.mcpack` from `Glions_RP` if `-InstallResourcePack` is specified

> Use `Glions_BP.mcpack` for the behavior pack import. The combined addon package is only for full addon import, not the BP slot.


For direct install without archive files, copy `Glions_BP` into `behavior_packs` and `Glions_RP` into `resource_packs`.
