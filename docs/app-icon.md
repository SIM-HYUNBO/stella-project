# WAGIE home-screen icon

The installed app uses the yellow WAGIE duck wearing a sky-blue baseball cap. The in-app `public/wag.png` mascot and loading artwork are unchanged.

- Master asset: `public/app-icons/duck-cap.png` (1024px square).
- PWA: 192px and 512px PNGs plus a separate maskable asset.
- Apple touch: 180px PNG through layout metadata.
- Android: five launcher densities, round icons and padded adaptive foregrounds. Requires a new native app build/install to update.

Created with the built-in image generation tool, editing `public/wag.png`. Prompt: preserve the simple yellow circular duck, black eyes with white glints and orange rectangular bill; add a sky-blue baseball cap without text; pale sky-blue square background with safe margins for phone masks. No scenery, extra characters or watermark.

Additional requested previews: `public/app-icons/duck-mask.png`, `duck-sweat.png`, and `duck-earmuffs.png`. These are saved alternatives; the installed icon remains the baseball-cap duck.

For deterministic size exports on Windows: `powershell -File scripts/update-app-icons.ps1 -Source public/app-icons/duck-cap.png -Foreground public/app-icons/duck-cap-foreground.png`.
