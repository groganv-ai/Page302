**APPROVED for the combined release, 26 November 2026.** See [approval register](README.md); older review notes below are historical.

## 6. App icon audit and reuse

The existing icon work replaces the lower green bar with five scoring-color blocks while retaining the approved pixel football and black background. This is an in-progress artwork change, not evidence of approval. The worktree sets APP_BUILD to `v4.1.10_002`. Preserve its files and request visual review before incorporating changed artwork.

Verified from PNG headers: favicon 32×32, Apple touch icon 180×180, PWA icons 192×192 and 512×512. HTML references SVG and PNG favicons, Apple touch icon and site.webmanifest. Manifest declares standalone display, black background/theme and both PNGs with purpose `any`. No maskable icon is declared; do not label current art maskable without safe-zone verification.

Requirements and acceptance criteria:

- Preserve approved pixel-football geometry, palette and opaque backgrounds. Review the existing proposed icon rather than creating new artwork.
- Check actual rendered images, all dimensions, HTML/manifest paths, browser favicon and installed iOS/Android icons. Verify safe areas if adding maskable support.
- Version HTML icon/manifest references and manifest icon URLs when artwork changes; current references are unversioned. Confirm build packaging includes every asset and existing installations refresh as expected.
- Increment the release APP_BUILD once from the final approved base, preserving the pack suffix and dynamic scheduled suffix. Verify the visible About/build label. Do not overwrite the separate icon branch's version blindly.

Tests: file existence and PNG dimensions; SVG rendering; background/alpha inspection; manifest JSON; packaged URLs; old-cache reload; iOS Add to Home Screen; Android install; favicon at small size. Visual/installed-device checks remain outstanding.

## Review candidate — v4.1.19_002

Copied the five existing artwork assets from the preserved game-icon worktree into this review candidate; did not copy its old application version. HTML icon/manifest URLs and manifest PNG URLs now carry `?v=4.1.19`. The private review Site includes the same assets and manifest. The 512px artwork has been visually inspected; native iOS Add to Home Screen and user artwork approval remain outstanding. Existing installed icons may require removal and re-adding because the operating system controls icon caching.
