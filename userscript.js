// ==UserScript==
// @name         Instagram Reel Slider
// @namespace    https://github.com/cosmic-mirror/instagram-reel-slider
// @version      4.7
// @description  Minimal progress scrubber for Instagram videos + Hover Tooltip + Smart Anchor + Native Sound Toggle
// @author       me
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
    enablePlayPause: true,      // Alt + K
    enableSeekBackward: true,   // Alt + ArrowLeft (Skips back 5s)
    enableSeekForward: true,    // Alt + ArrowRight (Skips forward 5s)
    enableJumpToAnchor: true,   // Alt + R (Replay from last clicked spot or start)
    enableToggleAudio: true,    // Alt + M (Toggle native Mute / Unmute)
    enableVolumeUp: false,      // Alt + ArrowUp
    enableVolumeDown: false,    // Alt + ArrowDown
    enableSpeedDown: false,     // Alt + , (comma)
    enableSpeedUp: false,       // Alt + . (period) or Alt + S
    enableSpeedReset: false     // Alt + 0
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
        height: 12px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        padding: 0;
        gap: 0;
        box-sizing: border-box;
        background: transparent;
        transition: height 0.2s ease, padding 0.2s ease, background 0.2s ease, gap 0.2s ease;
        pointer-events: auto;
      }

      .custom-seek-container:hover,
      .custom-seek-container:focus-within {
        height: 48px;
        padding: 0 16px;
        gap: 12px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
      }

      .time-text {
        width: 0;
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

      .slider-wrapper {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        height: 100%;
        min-width: 0;
      }

      .custom-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
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

      /* Hover Time Tooltip */
      .slider-tooltip {
        position: absolute;
        bottom: calc(100% - 2px);
        left: 0;
        transform: translateX(-50%);
        background: rgba(18, 18, 18, 0.92);
        color: #ffffff;
        padding: 3px 7px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.18);
        z-index: 10;
        user-select: none;
      }
      .slider-tooltip.visible {
        opacity: 1;
      }

      /* Anchor Marker Pin */
      .slider-anchor-pin {
        position: absolute;
        top: 50%;
        width: 4px;
        height: 8px;
        background-color: #38bdf8;
        border-radius: 2px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 2;
        display: none;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
        transition: height 0.2s ease;
      }
      .custom-seek-container:hover .slider-anchor-pin,
      .custom-seek-container:focus-within .slider-anchor-pin {
        height: 14px;
      }

      /* Webkit Slider Thumb */
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

      /* Firefox Slider Thumb */
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

  const enhanced = new WeakSet();
  const videoStateMap = new WeakMap();
  let lastInteractedVideo = null;

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function getActiveVideo() {
    if (lastInteractedVideo && lastInteractedVideo.isConnected) {
      const rect = lastInteractedVideo.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        return lastInteractedVideo;
      }
    }

    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;

    const playing = videos.find(v => !v.paused && v.currentTime > 0);
    if (playing) return playing;

    const viewportCenter = window.innerHeight / 2;
    let closestVideo = null;
    let minDistance = Infinity;

    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        const videoCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - videoCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestVideo = video;
        }
      }
    }

    return closestVideo || videos[0];
  }

  function getOptimalParent(video) {
    if (!video) return null;
    let current = video.parentElement;
    let bestMatch = current;
    const vRect = video.getBoundingClientRect();

    if (vRect.width === 0 || vRect.height === 0) return current;

    while (current && current !== document.body) {
      const rect = current.getBoundingClientRect();
      const isSameHeight = Math.abs(rect.height - vRect.height) <= 10;
      const isSameWidth = Math.abs(rect.width - vRect.width) <= 10;

      if (isSameHeight && isSameWidth) {
        bestMatch = current;
      } else {
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

  function updateProgressUI(video, slider, currentEl, durationEl) {
    if (!video || !slider) return;
    const dur = Number(video.duration);
    const cur = Number(video.currentTime);

    if (!isNaN(dur) && dur > 0) {
      const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
      slider.style.background = `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.2) ${pct}%)`;

      slider.value = cur;
      slider.max = dur;

      if (currentEl) currentEl.textContent = formatTime(cur);
      if (durationEl) durationEl.textContent = formatTime(dur);
    } else {
      slider.style.background = 'linear-gradient(to right, #fff 0%, rgba(255,255,255,0.2) 0%)';
      if (currentEl) currentEl.textContent = "0:00";
      if (durationEl) durationEl.textContent = "0:00";
    }
  }

  function updateAnchorPin(state) {
    if (!state || !state.pin) return;
    const { video, pin, anchorTime } = state;
    if (anchorTime === null || isNaN(video.duration) || video.duration <= 0) {
      pin.style.display = 'none';
      return;
    }
    const pct = Math.max(0, Math.min(100, (anchorTime / video.duration) * 100));
    pin.style.left = `${pct}%`;
    pin.style.display = 'block';
  }

  function seekTo(video, targetTime) {
    if (!video || isNaN(video.duration)) return;
    const clamped = Math.max(0, Math.min(video.duration, targetTime));

    try {
      video.currentTime = clamped;
    } catch (err) {}

    const state = videoStateMap.get(video);
    if (state) {
      updateProgressUI(video, state.slider, state.currentTimeEl, state.durationEl);
    }
  }

  function setAnchor(video, time) {
    lastInteractedVideo = video;
    const state = videoStateMap.get(video);
    if (!state) return;
    state.anchorTime = time;
    updateAnchorPin(state);
  }

  function safeTogglePlay(video) {
    if (!video) return;
    if (video.paused) {
      const p = video.play();
      if (p !== undefined) p.catch(() => {});
    } else {
      video.pause();
    }
  }

  function clickElement(el) {
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.click();
  }

  function toggleAudio() {
    const v = getActiveVideo();
    if (!v) return false;

    // 1. Climb up to find the full Reel/Post frame container
    let container = v.closest('article') || v.closest('section') || v.closest('[role="dialog"]');
    if (!container) {
      let curr = v;
      for (let i = 0; i < 10 && curr.parentElement && curr.parentElement !== document.body; i++) {
        curr = curr.parentElement;
        if (curr.querySelector('button, [role="button"]')) {
          container = curr;
        }
      }
    }
    if (!container) container = document;

    // 2. Try to find the button by accessibility labels (English & Multilingual)
    const candidates = container.querySelectorAll(
      'button[aria-label*="audio" i], button[aria-label*="sound" i], button[aria-label*="mute" i], ' +
      '[role="button"][aria-label*="audio" i], [role="button"][aria-label*="sound" i], [role="button"][aria-label*="mute" i], ' +
      'svg[aria-label*="audio" i], svg[aria-label*="sound" i], svg[aria-label*="mute" i]'
    );

    for (const el of candidates) {
      const btn = el.closest('button') || el.closest('[role="button"]') || el;
      if (btn && btn.isConnected && !btn.closest('.custom-seek-container')) {
        clickElement(btn);
        return true;
      }
    }

    // 3. Geometry fallback: Find the circular button sitting directly OVER the video frame
    const vRect = v.getBoundingClientRect();
    const allButtons = container.querySelectorAll('button, [role="button"]');
    for (const btn of allButtons) {
      if (btn.closest('.custom-seek-container')) continue;
      const bRect = btn.getBoundingClientRect();

      const isOverVideo = (
        bRect.top >= vRect.top - 10 &&
        bRect.bottom <= vRect.bottom + 10 &&
        bRect.left >= vRect.left - 10 &&
        bRect.right <= vRect.right + 10 &&
        bRect.width >= 20 && bRect.width <= 60 &&
        bRect.height >= 20 && bRect.height <= 60
      );

      if (isOverVideo) {
        clickElement(btn);
        return true;
      }
    }

    // 4. Final Fallback: Direct HTML5 property toggle
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) {
      v.volume = 1;
    }
    return true;
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

    const currentTimeEl = document.createElement('div');
    currentTimeEl.className = 'time-text current-time';
    currentTimeEl.textContent = '0:00';

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'slider-wrapper';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'custom-slider';
    slider.min = 0;
    slider.step = 0.01;
    slider.value = 0;

    const pin = document.createElement('div');
    pin.className = 'slider-anchor-pin';

    const tooltip = document.createElement('div');
    tooltip.className = 'slider-tooltip';

    sliderWrapper.appendChild(slider);
    sliderWrapper.appendChild(pin);
    sliderWrapper.appendChild(tooltip);

    const durationEl = document.createElement('div');
    durationEl.className = 'time-text duration-time';
    durationEl.textContent = '0:00';

    // Prevent Instagram tap overlays from intercepting interactions
    function stopProp(e) { e.stopPropagation(); }
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
      container.addEventListener(evt, stopProp, { capture: true });
    });

    function onTimeUpdate() {
      updateProgressUI(video, slider, currentTimeEl, durationEl);
    }

    function onLoadedMetadata() {
      if (!isNaN(video.duration)) slider.max = video.duration;
      updateProgressUI(video, slider, currentTimeEl, durationEl);
      const state = videoStateMap.get(video);
      if (state) updateAnchorPin(state);
    }

    function handleSliderScrub() {
      const t = parseFloat(slider.value);
      if (!isNaN(t)) {
        seekTo(video, t);
        setAnchor(video, t);
      }
    }

    function recordCurrentClick() {
      lastInteractedVideo = video;
      const t = parseFloat(slider.value);
      if (!isNaN(t)) {
        setAnchor(video, t);
      }
    }

    function releaseFocus() {
      recordCurrentClick();
      slider.blur();
    }

    // Hover Tooltip Handlers
    function onHoverMove(e) {
      if (!video || isNaN(video.duration) || video.duration <= 0) return;
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const hoverTime = pct * video.duration;

      tooltip.textContent = formatTime(hoverTime);

      const tooltipWidth = tooltip.offsetWidth || 36;
      const minX = tooltipWidth / 2;
      const maxX = rect.width - tooltipWidth / 2;
      const clampedX = Math.max(minX, Math.min(maxX, x));

      tooltip.style.left = `${clampedX}px`;
      tooltip.classList.add('visible');
    }

    function onHoverLeave() {
      tooltip.classList.remove('visible');
    }

    slider.addEventListener('pointermove', onHoverMove);
    slider.addEventListener('pointerleave', onHoverLeave);
    slider.addEventListener('input', handleSliderScrub);
    slider.addEventListener('pointerdown', recordCurrentClick);
    slider.addEventListener('mousedown', recordCurrentClick);
    slider.addEventListener('change', releaseFocus);
    slider.addEventListener('mouseup', releaseFocus);
    slider.addEventListener('touchend', releaseFocus);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onTimeUpdate);

    container.appendChild(currentTimeEl);
    container.appendChild(sliderWrapper);
    container.appendChild(durationEl);
    parent.appendChild(container);

    if (!isNaN(video.duration)) slider.max = video.duration;
    updateProgressUI(video, slider, currentTimeEl, durationEl);

    enhanced.add(video);

    const state = {
      video,
      slider,
      pin,
      tooltip,
      currentTimeEl,
      durationEl,
      anchorTime: null,
      cleanup: () => {
        try {
          video.removeEventListener('timeupdate', onTimeUpdate);
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('seeked', onTimeUpdate);
          slider.removeEventListener('pointermove', onHoverMove);
          slider.removeEventListener('pointerleave', onHoverLeave);
          slider.removeEventListener('input', handleSliderScrub);
          slider.removeEventListener('pointerdown', recordCurrentClick);
          slider.removeEventListener('mousedown', recordCurrentClick);
          slider.removeEventListener('change', releaseFocus);
          slider.removeEventListener('mouseup', releaseFocus);
          slider.removeEventListener('touchend', releaseFocus);
        } catch (e) {}
        try { if (container.parentElement) container.parentElement.removeChild(container); } catch (e) {}
        enhanced.delete(video);
        videoStateMap.delete(video);
      }
    };

    videoStateMap.set(video, state);
  }

  function cleanupVideo(video) {
    if (!video) return;
    const state = videoStateMap.get(video);
    if (state && typeof state.cleanup === 'function') {
      state.cleanup();
    }
  }

  // ==== Keyboard Actions ====
  function togglePlayPause() {
    const v = getActiveVideo();
    if (v) { safeTogglePlay(v); return true; }
  }

  function seekRelative(seconds) {
    const v = getActiveVideo();
    if (v) {
      seekTo(v, (v.currentTime || 0) + seconds);
      return true;
    }
  }

  function jumpToAnchor() {
    const v = getActiveVideo();
    if (!v) return false;
    const state = videoStateMap.get(v);
    const target = (state && state.anchorTime !== null) ? state.anchorTime : 0;
    seekTo(v, target);
    return true;
  }

  function increaseVolume(a = 0.1) { const v = getActiveVideo(); if (v) { v.volume = Math.min(1, v.volume + a); return true; } }
  function decreaseVolume(a = 0.1) { const v = getActiveVideo(); if (v) { v.volume = Math.max(0, v.volume - a); return true; } }

  function getClosestSpeedIndex(rate) {
    return PLAYBACK_SPEEDS.reduce((prev, curr, idx) =>
      Math.abs(curr - rate) < Math.abs(PLAYBACK_SPEEDS[prev] - rate) ? idx : prev, 0
    );
  }

  function increaseSpeed() {
    const v = getActiveVideo();
    if (v) {
      const i = getClosestSpeedIndex(v.playbackRate || 1);
      v.playbackRate = PLAYBACK_SPEEDS[Math.min(i + 1, PLAYBACK_SPEEDS.length - 1)];
      return true;
    }
  }

  function decreaseSpeed() {
    const v = getActiveVideo();
    if (v) {
      const i = getClosestSpeedIndex(v.playbackRate || 1);
      v.playbackRate = PLAYBACK_SPEEDS[Math.max(i - 1, 0)];
      return true;
    }
  }

  function resetSpeed() { const v = getActiveVideo(); if (v) { v.playbackRate = 1; return true; } }

  function handleKeyDown(event) {
    const isTextEntry =
      (event.target.tagName === 'INPUT' && event.target.type !== 'range') ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable;

    if (isTextEntry) return;
    if (!event.altKey) return;

    let handled = false;

    const code = event.code;
    const key = event.key.toLowerCase();

    if (CONFIG.enablePlayPause && (code === 'KeyK' || key === 'k')) {
      handled = togglePlayPause();
    } else if (CONFIG.enableToggleAudio && (code === 'KeyM' || key === 'm' || key === 'µ')) {
      handled = toggleAudio();
    } else if (CONFIG.enableSeekBackward && (code === 'ArrowLeft' || key === 'arrowleft')) {
      handled = seekRelative(-5);
    } else if (CONFIG.enableSeekForward && (code === 'ArrowRight' || key === 'arrowright')) {
      handled = seekRelative(5);
    } else if (CONFIG.enableJumpToAnchor && (code === 'KeyR' || key === 'r' || key === '®')) {
      handled = jumpToAnchor();
    } else if (CONFIG.enableVolumeUp && (code === 'ArrowUp' || key === 'arrowup')) {
      handled = increaseVolume(0.1);
    } else if (CONFIG.enableVolumeDown && (code === 'ArrowDown' || key === 'arrowdown')) {
      handled = decreaseVolume(0.1);
    } else if (CONFIG.enableSpeedDown && (code === 'Comma' || key === ',')) {
      handled = decreaseSpeed();
    } else if (CONFIG.enableSpeedUp && (code === 'Period' || key === '.' || code === 'KeyS' || key === 's')) {
      handled = increaseSpeed();
    } else if (CONFIG.enableSpeedReset && (code === 'Digit0' || key === '0')) {
      handled = resetSpeed();
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Setup DOM Observer
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
