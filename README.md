# Russraria

My parody of Terraria.

`Russraria` is now set up as a desktop game build with Electron instead of a browser-only shell.

## Run

- `npm.cmd start`

This opens the game in its own window. The first launch defaults to fullscreen. Inside the game, open `Esc` crafting and use the `Settings` button to switch between fullscreen and windowed mode with borders.

## Build

- `npm.cmd run build:dir`
- `npm.cmd run build:portable`

`build:dir` creates a runnable desktop folder in `dist/win-unpacked`.
The main executable is `dist/win-unpacked/Russraria.exe`.

## UI Changes

- The old browser landing page and side control panel are gone.
- Only gameplay is shown in the main window.
- Controls are now listed inside the in-game settings panel.
- `Esc` still opens crafting and smelting, and that panel now contains the `Settings` button.

## Notes

If `build:portable` fails on this Windows machine, `dist/win-unpacked/Russraria.exe` is still a valid desktop executable build and can be launched directly.
