// ==UserScript==
// @name         Instagram Reel Slider
// @namespace    https://github.com/spactable/instagram-reel-slider
// @version      2.0
// @description  Minimal progress scrubber for Instagram videos + configurable keyboard shortcuts
// @author       spactable
// @match        https://www.instagram.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ==========================================
  // ---- CONFIGURATION (SHORTCUT TOGGLES) ----
  // ==========================================
  const CONFIG = {
    enablePlayPause: true,    // Alt + K
    enableSeekBackward: false, // Alt + ArrowLeft
    enableSeekForward: false,  // Alt + ArrowRight
    enableVolumeUp: false,     // Alt + ArrowUp
    enableVolumeDown: false,   // Alt + ArrowDown
    enableSpeedDown: false,    // Alt + , (comma)
    enableSpeedUp: false,      // Alt + . (period) or Alt + S
    enableSpeedReset: false    // Alt + 0
  };
  // ==========================================

  // ---- Styles (insert once) ----
  if (!document.head.querySelector('#insta-custom-seek-styles')) {
    const style = document.createElement('style');
    style.id = 'insta-custom-seek-styles';
    style.textContent = `
      .custom-seek-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 12px; /* Thin capture area when unhovered */
        z-index: 2147483647; /* Maximum z-index to break out of overlays */
        display: flex;
        align-items: center;
        padding: 0;
        gap: 0;
        box-sizing: border-box;
        background: transparent;
        transition: height 0.2s ease, padding 0.2s ease, background 0.2s ease, gap 0.2s ease;
        pointer-events: auto;
      }

      /* Expand into full player UI on hover */
      .custom-seek-container:hover,
      .custom-seek-container:focus-within {
        height: 48px;
        padding: 0 16px;
        gap: 12px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
      }

      .play-pause-btn {
        width: 0; /* Hidden by default */
        height: 24px;
        opacity: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: hidden;
        transition: width 0.2s ease, opacity 0.2s ease, transform 0.1s ease;
      }
      .custom-seek-container:hover .play-pause-btn,
      .custom-seek-container:focus-within .play-pause-btn {
        width: 24px;
        opacity: 1;
      }
      .play-pause-btn:hover {
        transform: scale(1.15);
      }

      .time-text {
        width: 0; /* Hidden by default */
        opacity: 0;
        overflow: hidden;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 13px;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        user-select: none;
        text-align: center;
        transition: width 0.2s ease, opacity 0.2s ease;
      }
      .custom-seek-container:hover .time-text,
      .custom-seek-container:focus-within .time-text {
        width: 38px;
        opacity: 1;
      }

      .custom-slider {
        -webkit-appearance: none;
        appearance: none;
        flex: 1;
        min-width: 0;
        height: 3px;
        border-radius: 1.5px;
        background: rgba(255, 255, 255, 0.3);
        outline: none;
        margin: 0;
        cursor: pointer;
        display: block;
        transition: height 0.2s ease;
      }
      .custom-seek-container:hover .custom-slider,
      .custom-seek-container:focus-within .custom-slider {
        height: 5px;
        border-radius: 2.5px;
      }

      /* Webkit Thumb - invisible when unhovered */
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0,0,0,0.6);
        transition: width 0.2s, height 0.2s, transform 0.1s;
      }
      .custom-seek-container:hover .custom-slider::-webkit-slider-thumb,
      .custom-seek-container:focus-within .custom-slider::-webkit-slider-thumb {
        width: 14px;
        height: 14px;
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.25);
      }

      /* Firefox Thumb - invisible when unhovered */
      .custom-slider::-moz-range-thumb {
        width: 0;
        height: 0;
        border: 0;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.6);
        transition: width 0.2s, height 0.2s, transform 0.1s;
      }
      .custom-seek-container:hover .custom-slider::-moz-range-thumb,
      .custom-seek-container:focus-within .custom-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const SVG_PLAY = `<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
  const SVG_PAUSE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

  const enhanced = new WeakSet();
  const cleanupMap = new WeakMap();

  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function getActiveVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;
    if (videos.length === 1) return videos[0];

    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      const isInViewport =
        rect.top >= -rect.height &&
        rect.left >= -rect.width &&
        rect.bottom <= window.innerHeight + rect.height &&
        rect.right <= window.innerWidth + rect.width;

      if (isInViewport && rect.width > 100 && rect.height > 100) return video;
    }

    return videos[0];
  }

  /** Finds the absolute highest parent element that still precisely bounds the video */
  function getOptimalParent(video) {
    if (!video) return null;
    let current = video.parentElement;
    let bestMatch = current;
    const vRect = video.getBoundingClientRect();

    // If video hasn't rendered size yet, fallback to immediate parent
    if (vRect.width === 0 || vRect.height === 0) return current;

    while (current && current !== document.body) {
      const rect = current.getBoundingClientRect();
      // Allow up to 10px difference to account for borders/rounding
      const isSameHeight = Math.abs(rect.height - vRect.height) <= 10;
      const isSameWidth = Math.abs(rect.width - vRect.width) <= 10;

      if (isSameHeight && isSameWidth) {
        bestMatch = current;
      } else {
        // We've hit a container that is larger than the video itself; stop here
        break;
      }
      current = current.parentElement;
    }

    const style = getComputedStyle(bestMatch);
    if (style.position === 'static') {
      bestMatch.style.position = 'relative';
    }
    return bestMatch;
  }

  function updateProgress(video, slider, currentEl, durationEl) {
    if (!video || !slider) return;
    const dur = Number(video.duration);
    const cur = Number(video.currentTime);

    if (!isNaN(dur) && dur > 0) {
      const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
      slider.style.background = `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.2) ${pct}%)`;

      if (document.activeElement !== slider) slider.value = cur;
      slider.max = dur;

      if (currentEl) currentEl.textContent = formatTime(cur);
      if (durationEl) durationEl.textContent = formatTime(dur);
    } else {
      slider.style.background = 'linear-gradient(to right, #fff 0%, rgba(255,255,255,0.2) 0%)';
      if (currentEl) currentEl.textContent = "0:00";
      if (durationEl) durationEl.textContent = "0:00";
    }
  }

  function createControls(video) {
    if (!video || !(video instanceof HTMLVideoElement)) return;
    if (enhanced.has(video)) return;

    const parent = getOptimalParent(video);
    if (!parent) return;

    const existing = parent.querySelector('.custom-seek-container');
    if (existing) return;

    const container = document.createElement('div');
    container.className = 'custom-seek-container';

    const playPauseBtn = document.createElement('div');
    playPauseBtn.className = 'play-pause-btn';
    playPauseBtn.innerHTML = video.paused ? SVG_PLAY : SVG_PAUSE;

    const currentTimeEl = document.createElement('div');
    currentTimeEl.className = 'time-text current-time';
    currentTimeEl.textContent = '0:00';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'custom-slider';
    slider.min = 0;
    slider.step = 0.01;
    slider.value = 0;

    const durationEl = document.createElement('div');
    durationEl.className = 'time-text duration-time';
    durationEl.textContent = '0:00';

    // Prevent ALL clicks/touches from propagating to Instagram's invisible overlays
    function stopProp(e) { e.stopPropagation(); }
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
      container.addEventListener(evt, stopProp, { capture: true });
    });

    function togglePlay(e) {
      e.stopPropagation();
      if (video.paused) video.play();
      else video.pause();
    }
    playPauseBtn.addEventListener('click', togglePlay);

    function onPlayStateChange() {
      playPauseBtn.innerHTML = video.paused ? SVG_PLAY : SVG_PAUSE;
    }

    function onTimeUpdate() { updateProgress(video, slider, currentTimeEl, durationEl); }
    function onLoadedMetadata() {
      if (!isNaN(video.duration)) slider.max = video.duration;
      updateProgress(video, slider, currentTimeEl, durationEl);
    }

    function onSliderInput() {
      const t = parseFloat(slider.value);
      if (!isNaN(t)) {
        try {
          video.currentTime = t;
          updateProgress(video, slider, currentTimeEl, durationEl);
        } catch (err) {}
      }
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onTimeUpdate);
    video.addEventListener('play', onPlayStateChange);
    video.addEventListener('pause', onPlayStateChange);
    slider.addEventListener('input', onSliderInput);

    container.appendChild(playPauseBtn);
    container.appendChild(currentTimeEl);
    container.appendChild(slider);
    container.appendChild(durationEl);
    parent.appendChild(container);

    if (!isNaN(video.duration)) slider.max = video.duration;
    updateProgress(video, slider, currentTimeEl, durationEl);

    enhanced.add(video);

    const cleanup = () => {
      try {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('seeked', onTimeUpdate);
        video.removeEventListener('play', onPlayStateChange);
        video.removeEventListener('pause', onPlayStateChange);
        slider.removeEventListener('input', onSliderInput);
        playPauseBtn.removeEventListener('click', togglePlay);
      } catch (e) {}
      try { if (container.parentElement) container.parentElement.removeChild(container); } catch (e) {}
      enhanced.delete(video);
      cleanupMap.delete(video);
    };

    cleanupMap.set(video, cleanup);
  }

  function cleanupVideo(video) {
    if (!video) return;
    const fn = cleanupMap.get(video);
    if (typeof fn === 'function') fn();
  }

  // ==== Keyboard Handling ====
  function togglePlayPause() { const v = getActiveVideo(); if (v) { v.paused ? v.play() : v.pause(); return true; } }
  function seekBackward(s = 5) { const v = getActiveVideo(); if (v) { v.currentTime = Math.max(0, v.currentTime - s); return true; } }
  function seekForward(s = 5) { const v = getActiveVideo(); if (v) { v.currentTime = Math.min(v.duration || v.currentTime + s, v.currentTime + s); return true; } }
  function increaseVolume(a = 0.1) { const v = getActiveVideo(); if (v) { v.volume = Math.min(1, v.volume + a); return true; } }
  function decreaseVolume(a = 0.1) { const v = getActiveVideo(); if (v) { v.volume = Math.max(0, v.volume - a); return true; } }
  function increaseSpeed() { const v = getActiveVideo(); if (v) { const i = PLAYBACK_SPEEDS.indexOf(v.playbackRate || 1); v.playbackRate = PLAYBACK_SPEEDS[Math.min(i + 1, PLAYBACK_SPEEDS.length - 1)]; return true; } }
  function decreaseSpeed() { const v = getActiveVideo(); if (v) { const i = PLAYBACK_SPEEDS.indexOf(v.playbackRate || 1); v.playbackRate = PLAYBACK_SPEEDS[Math.max(i - 1, 0)]; return true; } }
  function resetSpeed() { const v = getActiveVideo(); if (v) { v.playbackRate = 1; return true; } }

  function handleKeyDown(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    if (!event.altKey) return;

    let handled = false;
    switch (event.key) {
      case 'k': case 'K': if (CONFIG.enablePlayPause) handled = togglePlayPause(); break;
      case 'ArrowLeft': if (CONFIG.enableSeekBackward) handled = seekBackward(5); break;
      case 'ArrowRight': if (CONFIG.enableSeekForward) handled = seekForward(5); break;
      case 'ArrowUp': if (CONFIG.enableVolumeUp) handled = increaseVolume(0.1); break;
      case 'ArrowDown': if (CONFIG.enableVolumeDown) handled = decreaseVolume(0.1); break;
      case ',': if (CONFIG.enableSpeedDown) handled = decreaseSpeed(); break;
      case '.': if (CONFIG.enableSpeedUp) handled = increaseSpeed(); break;
      case '0': if (CONFIG.enableSpeedReset) handled = resetSpeed(); break;
      case 's': case 'S': if (CONFIG.enableSpeedUp) handled = increaseSpeed(); break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Setup Observer
  try { document.querySelectorAll('video').forEach((v) => createControls(v)); } catch (e) {}

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (!node || node.nodeType !== 1) return;
          if (node.tagName === 'VIDEO') createControls(node);
          else if (node.querySelectorAll) {
            const vids = node.querySelectorAll('video');
            if (vids.length) vids.forEach(createControls);
          }
        });
      }
      if (mutation.removedNodes) {
        mutation.removedNodes.forEach((node) => {
          if (!node || node.nodeType !== 1) return;
          if (node.tagName === 'VIDEO') cleanupVideo(node);
          else if (node.querySelectorAll) {
            const vids = node.querySelectorAll('video');
            if (vids.length) vids.forEach(cleanupVideo);
          }
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', handleKeyDown, true);
})();
