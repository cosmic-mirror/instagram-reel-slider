# Instagram Reel Slider Userscript

### Installation
To install the userscript, you will need a userscript manager such as Tampermonkey or Violentmonkey. Follow these steps:
1. Install a userscript manager from your browser's extension store.
2. Create a new script and paste the code from the [GitHub repository](https://github.com/cosmic-mirror/instagram-reel-slider).
3. Save the script.


### Shortcuts & Features

#### `Alt + K` — Play / Pause
Toggles playback on the active video instantly without needing on-screen buttons.

#### `Alt + M` — Toggle Audio (Mute / Unmute)
Toggles sound on or off natively. Visually flips Instagram's on-screen speaker icon and keeps your sound preference active as you scroll to the next video.

#### `Alt + ArrowLeft` / `Alt + ArrowRight` — Skip ±5 Seconds
Rewinds or fast-forwards the video by 5 seconds smoothly without video stutter or buffer snap-backs.

#### `Alt + R` — Return to Smart Anchor
Snaps playback straight back to the last spot you clicked or scrubbed on the progress bar (indicated by the blue pin). Perfect for looping a specific moment, joke, or scene multiple times. *(Rewinds to the beginning if no spot has been clicked).*

---

### Player Features

* **Hover Time Tooltip:** Hovering or dragging along the slider displays a floating pill showing the exact timestamp at that position.
* **Anchor Pin:** A subtle cyan marker appears on the timeline to show your active replay point.
* **Auto-Focus Release:** Clicking or scrubbing the bar automatically releases input focus, so your keyboard shortcuts keep working immediately.
* **Typing Protection:** Automatically disables all shortcuts when typing inside comments, search bars, or DMs.

---

### Optional Shortcuts *(Disabled by default)*
*You can enable these inside the `CONFIG` block at the top of the script:*

* **`Alt + ArrowUp` / `Alt + ArrowDown`** — Volume Up / Down (±10%)
* **`Alt + .`** or **`Alt + S`** — Speed up playback (1.25x, 1.5x, 2x, etc.)
* **`Alt + ,`** — Slow down playback (0.75x, 0.5x, 0.25x)
* **`Alt + 0`** — Reset speed back to 1.0x

## Debugging
If you encounter issues:
- Check the browser console (F12) for error messages.
- Ensure the userscript manager is enabled and the script is active.
- Consult the [GitHub Issues page](https://github.com/spactable/instagram-reel-slider/issues) for support and reporting bugs.
