Glions - Resource Pack (companion)

This resource pack contains placeholder assets for the Glions economy UI. Replace the placeholder PNG files with your designed UI panels and icons.

Installation
1. Place the `Glions_RP` folder into your world's `resource_packs` folder (or global resource_packs directory).
2. Enable the resource pack for the world (move it to the active resource packs list).
3. Replace the placeholder files:
   - `pack_icon.png` — pack icon (128x128 recommended)
   - `textures/ui/panel.png` — panel background for menus
   - `textures/ui/icons/coin.png` — currency icon
  
Assets added
- Real raster PNG assets have been generated from the sample SVGs.
- Files:
  - `Glions_RP/pack_icon.svg` / `Glions_RP/pack_icon.png` — pack icon.
  - `Glions_RP/textures/ui/panel.svg` / `Glions_RP/textures/ui/panel.png` — panel background.
  - `Glions_RP/textures/ui/icons/*.svg` / `Glions_RP/textures/ui/icons/*.png` — coin, sell, buy, trade, history, and settings icons.
  - `Glions_RP/textures/ui/glions_atlas.png` — combined icon atlas.
  - `Glions_RP/textures/ui/glions_atlas.json` — atlas mapping for custom UI systems.

Custom UI integration
- This pack includes an atlas at `textures/ui/glions_atlas.png` and metadata at `textures/ui/glions_atlas.json`.
- Use `Glions_RP/ui/glions_ui.json` to locate the panel and icons for integration with Bedrock builds that support custom UI resources.

Converting or regenerating SVG to PNG
- If you want to regenerate PNGs from the source SVGs, convert them at these sizes:
  - `pack_icon.png`: 128x128
  - `textures/ui/panel.png`: 512x256 (or higher, powers-of-two)
  - `textures/ui/icons/*.png`: 128x128

Example conversion using ImageMagick:
magick convert Glions_RP/pack_icon.svg -resize 128x128 Glions_RP/pack_icon.png
magick convert Glions_RP/textures/ui/panel.svg -resize 512x256 Glions_RP/textures/ui/panel.png
magick convert Glions_RP/textures/ui/icons/coin.svg -resize 128x128 Glions_RP/textures/ui/icons/coin.png
```

Integration notes
- The behavior pack uses modal forms which do not natively show images; to build fully custom UI panels you can implement Bedrock's resource-driven UI and call it from scripts (engine-specific). The `ui/glions_ui.json` describes paths to assets which you can use in a custom UI implementation.
- If you prefer simple visuals, replace the `coin.png` and use `tellraw`/chat messages with custom item icons via resource textures.

Tips
- Keep icons at powers-of-two sizes (64x64, 128x128) for best compatibility.
- Test iteration: replace one asset, enable resource pack, then reload the world to see changes.

If you want, I can:
- Add a sample polished panel and icons (I will generate SVG/PNG assets), or
- Add a minimal custom UI JSON and a compatible script `show_ui` call tailored to your Bedrock server version — tell me your Bedrock build/version.
