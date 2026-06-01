Glions - Minecraft Bedrock Economy & Trading

Overview
- Glions is a modular economy and secure trading system for Minecraft Bedrock Edition.
- Provides a custom currency (Glions), GUI menus, sell/buy shop, player-to-player trades with escrow, admin tools, and transaction logging.

Installation
1. Copy the `Glions_BP` folder into your world's `behavior_packs` folder.
2. Enable `Experimental Gameplay` and `Enable Scripting` (if required) in world settings.
3. Start the world. Use the `/glions` command in-game to open the main menu.

Files
- manifest.json: Behavior pack manifest.
- scripts/glions.js: Core script (UI, economy, trading, admin commands).
- config/prices.json: Configure buy/sell prices and shop categories.
- config/settings.json: Currency name, starting balance, and trade settings.

Configuration
- Edit `config/prices.json` to change item prices and shop categories.
- Edit `config/settings.json` for currency name, symbol, starting balances, and trade timeouts.

Notes and Limitations
- This pack uses the Bedrock Scripting API. Enable experimental gameplay and scripting to use fully.
- Persistence uses the scoreboard objective `glions` so balances are persistent with the world save.
- Transaction log is stored in-memory and echoed to server console/chat. For persistent logs, export `transactionLog` from `scripts/glions.js` or adapt the script to write to an external file by a server-side helper.
- The UI uses modal forms (`ModalFormData`) which rely on the scripting API available in the Bedrock experimental builds.

Admin & Commands
- Open the admin GUI with `/glions.admin` (requires operator permission level 2).
- Admin GUI supports Add/Set/Remove/Check balances and export of recent transaction logs.

Trading
- Invite a player using `/glions.trade invite <player>`.
- Accept an invitation with `/glions.trade accept <player>`.
- The trade system uses a secure escrow: when adding items to a trade, the items are removed from the player's inventory and locked in escrow until both players confirm; items are returned on cancel.

Notes on UI & Icons
- This repo provides modal-form based menus. For a modern visual polish, use the companion `Glions_RP` resource pack.
- The resource pack includes real PNG assets and an icon atlas to support Bedrock builds with custom UI resources.
- Use `Glions_RP/ui/glions_ui.json` and `Glions_RP/textures/ui/glions_atlas.json` as the starting point for custom UI integration.

Extending
- Add localized texts, icons, and resource-pack UI assets in the companion resource pack.
- Improve inventory inspection by using the inventory component to present a native pick-list instead of manual item IDs.
- For Bedrock builds supporting custom UI panels, map the atlas icons into your UI screens and use the generated PNG resources.

Support
- This repository provides a starting point; adapt `scripts/glions.js` to the exact scripting API surface of your Bedrock build if function names differ.

Commands & Usage
- `/glions` — Open main Glions menu (players).
- `/glions.trade invite <player>` — Invite a player to trade.
- `/glions.trade accept <player>` — Accept a trade invite.
- `/glions.admin` — Open admin GUI (ops only).
- `/glions.exportlogs` — Export recent logs to the command sender (ops only).

Notes on Persistence & Testing
- Balances are stored using the `scoreboard` objective named `glions` and are saved with the world. The script initializes a player's balance to `starting_balance` (from `config/settings.json`) the first time the player joins.
- Transaction logs are kept in memory and can be exported via the admin GUI or `/glions.exportlogs`. Bedrock scripting does not provide direct file I/O in stable builds; to persist logs to disk, run a server-side helper script or periodically copy the `transactionLog` object to an external service.

Testing Checklist
- Enable `Experimental Gameplay` and `Scripting` in the world settings.
- Install both `Glions_BP` (behavior pack) and `Glions_RP` (resource pack) in the world.
- Run `/scoreboard objectives list` to verify `glions` objective exists.
- Join with a test player and open `/glions`.
- Test selling an item listed in `config/prices.json` and verify balance increases and inventory decreases.
- Test buying an item and verify balance decreases and item is added.
- Test trade flow: invite, accept, add items, confirm both sides, ensure items swap and are not duplicated.

If you want, I can generate ready-to-use PNGs (rasterized from the SVGs), optimize them into atlases, and hook the behavior pack UI to show the images in a custom UI implementation for specific Bedrock versions — tell me which you'd like next.
