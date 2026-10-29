// ==UserScript==
// @name         Instagram Reel Slider
// @namespace    https://github.com/cosmic-mirror/instagram-reel-slider
// @version      5.5
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
    enableJumpToAnchor: true,   // Alt + R (Replay from anchor)
    enableToggleAudio: true,    // Alt + M (Toggle native sound)
    enableVolumeUp: false,      // Alt + ArrowUp
    enableVolumeDown: false,    // Alt + ArrowDown
    enableSpeedDown: false,     // Alt + , (comma)
    enableSpeedUp: false,       // Alt + . (period) or Alt + S
    enableSpeedReset: false     // Alt + 0
  };
  // ==========================================

  // ---- Stylesheet ----
  if (!document.head.querySelector('#ig-native-slider-styles')) {
    const style = document.createElement('style');
    style.id = 'ig-native-slider-styles';
    style.textContent = `
      .ig-slider-container {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 14px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 0;
        box-sizing: border-box;
        background: transparent;
        pointer-events: auto;
        user-select: none;
        transition: height 0.2s cubic-bezier(0.2, 0, 0, 1) 0.06s, 
                    background 0.2s cubic-bezier(0.2, 0, 0, 1) 0.06s, 
                    gap 0.2s cubic-bezier(0.2, 0, 0, 1) 0.06s;
      }

      .ig-slider-container:hover,
      .ig-slider-container:focus-within {
        height: 36px;
        gap: 12px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%);
        transition-delay: 0s;
      }

      /* Native-spec Time Badges */
      .ig-time-badge {
        width: 0;
        opacity: 0;
        overflow: hidden;
        color: #ffffff;
        font-family: -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        font-weight: 600;
        line-height: 18px;
        letter-spacing: 0.2px;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        text-align: center;
        white-space: nowrap;
        pointer-events: none;
        transition: width 0.2s ease, opacity 0.2s ease;
      }
      .ig-slider-container:hover .ig-time-badge,
      .ig-slider-container:focus-within .ig-time-badge {
        width: 38px;
        opacity: 1;
      }

      /* Slider Track Wrapper */
      .ig-slider-wrapper {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        height: 100%;
        min-width: 0;
      }

      /* Native Slider Input */
      .ig-range-slider {
        -webkit-appearance: none;
        appearance: none;
        position: relative;
        z-index: 2;
        width: 100%;
        height: 3px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.24);
        outline: none;
        margin: 0;
        cursor: pointer;
        display: block;
        transition: height 0.15s ease;
      }
      .ig-slider-container:hover .ig-range-slider,
      .ig-slider-container:focus-within .ig-range-slider {
        height: 5px;
      }

      /* Webkit Slider Thumb */
      .ig-range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        transition: width 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                    height 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                    transform 0.1s ease;
      }
      .ig-slider-container:hover .ig-range-slider::-webkit-slider-thumb,
      .ig-slider-container:focus-within .ig-range-slider::-webkit-slider-thumb {
        width: 12px;
        height: 12px;
      }
      .ig-range-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      /* Firefox Slider Thumb */
      .ig-range-slider::-moz-range-thumb {
        width: 0;
        height: 0;
        border: 0;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        transition: width 0.15s ease, height 0.15s ease;
      }
      .ig-slider-container:hover .ig-range-slider::-moz-range-thumb,
      .ig-slider-container:focus-within .ig-range-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
      }

      /* Ghost Preview Bar (Between playhead and cursor) */
      .ig-ghost-preview {
        position: absolute;
        top: 50%;
        height: 3px;
        background: rgba(255, 255, 255, 0.45);
        border-radius: 9999px;
        transform: translateY(-50%);
        pointer-events: none;
        z-index: 1;
        display: none;
        transition: height 0.15s ease;
      }
      .ig-slider-container:hover .ig-ghost-preview {
        height: 5px;
      }

      /* Anchor Marker */
      .ig-anchor-pin {
        position: absolute;
        top: 50%;
        width: 3px;
        height: 8px;
        background-color: #38bdf8;
        border-radius: 9999px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 3;
        display: none;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
        transition: height 0.15s ease;
      }
      .ig-slider-container:hover .ig-anchor-pin {
        height: 12px;
      }

      /* Frosted Glass Time Tooltip */
      .ig-time-tooltip {
        position: absolute;
        bottom: 24px;
        left: 0;
        transform: translateX(-50%) scale(0.85);
        background: rgba(22, 22, 22, 0.78);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #ffffff;
        padding: 3px 8px;
        border-radius: 9999px;
        font-family: -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.2px;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
        opacity: 0;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
        border: 0.5px solid rgba(255, 255, 255, 0.16);
        z-index: 10;
        transition: opacity 0.12s ease, transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .ig-time-tooltip.visible {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
    `;
    document.head.appendChild(style);
  }

  const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const videoStateMap = new WeakMap();
  let lastInteractedVideo = null;

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function hasNativePlayer(video) {
    if (!video) return false;

    let curr = video.parentElement;
    while (curr && curr !== document.body) {
      if (curr.querySelectorAll('video').length > 1) break;
      if (curr.querySelector && curr.querySelector('[aria-label="Video progress"]')) {
        return true;
      }
      curr = curr.parentElement;
    }

    const vRect = video.getBoundingClientRect();
    if (vRect.width > 0 && vRect.height > 0) {
      const nativeSliders = document.querySelectorAll('[aria-label="Video progress"]');
      for (const s of nativeSliders) {
        const sRect = s.getBoundingClientRect();
        if (sRect.left < vRect.right && sRect.right > vRect.left &&
            sRect.top < vRect.bottom && sRect.bottom > vRect.top) {
          return true;
        }
      }
    }
    return false;
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

    for (const v of videos) {
      const rect = v.getBoundingClientRect();
      if (rect.width > 80 && rect.height > 80) {
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(viewportCenter - center);
        if (dist < minDistance) {
          minDistance = dist;
          closestVideo = v;
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
      if (current.querySelectorAll('video').length > 1) break;
      if (current.tagName === 'ARTICLE' || current.getAttribute('role') === 'presentation') {
        bestMatch = current;
        break;
      }
      const rect = current.getBoundingClientRect();
      if (Math.abs(rect.height - vRect.height) <= 12 && Math.abs(rect.width - vRect.width) <= 12) {
        bestMatch = current;
      } else {
        break;
      }
      current = current.parentElement;
    }

    if (getComputedStyle(bestMatch).position === 'static') {
      bestMatch.style.position = 'relative';
    }
    return bestMatch;
  }

  function updateProgressUI(state) {
    if (!state || !state.video || !state.slider) return;
    const { video, slider, currentEl, durationEl } = state;
    const dur = Number(video.duration);
    const cur = Number(video.currentTime);

    if (!isNaN(dur) && dur > 0 && isFinite(dur)) {
      const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
      slider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.24) ${pct}%)`;
      slider.value = cur;
      slider.max = dur;

      if (currentEl) currentEl.textContent = formatTime(cur);
      if (durationEl) durationEl.textContent = formatTime(dur);
    } else {
      slider.style.background = 'linear-gradient(to right, #ffffff 0%, rgba(255, 255, 255, 0.24) 0%)';
      if (currentEl) currentEl.textContent = "0:00";
      if (durationEl) durationEl.textContent = "0:00";
    }
  }

  function updateAnchorPin(state) {
    if (!state || !state.pin) return;
    const { video, pin, anchorTime } = state;
    const dur = Number(video.duration);
    if (anchorTime === null || isNaN(dur) || dur <= 0 || !isFinite(dur)) {
      pin.style.display = 'none';
      return;
    }
    const pct = Math.max(0, Math.min(100, (anchorTime / dur) * 100));
    pin.style.left = `${pct}%`;
    pin.style.display = 'block';
  }

  function seekTo(video, targetTime) {
    if (!video) return;
    const dur = Number(video.duration);
    if (isNaN(dur) || dur <= 0 || !isFinite(dur)) return;

    const clamped = Math.max(0, Math.min(dur, targetTime));
    try { video.currentTime = clamped; } catch (err) {}

    const state = videoStateMap.get(video);
    if (state) updateProgressUI(state);
  }

  function setAnchor(video, time) {
    lastInteractedVideo = video;
    const state = videoStateMap.get(video);
    if (!state) return;
    state.anchorTime = time;
    updateAnchorPin(state);
  }

  // --- Native Sound Controller (4-Stage Fallback) ---
  function clickElement(el) {
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.click();
  }

  function toggleAudio() {
    const v = getActiveVideo();
    if (!v) return false;

    let container = v.closest('article') || v.closest('section') || v.closest('[role="dialog"]');
    if (!container) {
      let curr = v;
      for (let i = 0; i < 12 && curr.parentElement && curr.parentElement !== document.body; i++) {
        curr = curr.parentElement;
        if (curr.querySelector('button, [role="button"]')) container = curr;
      }
    }
    if (!container) container = document;

    const candidates = container.querySelectorAll(
      'button[aria-label*="audio" i], button[aria-label*="sound" i], button[aria-label*="mute" i], ' +
      '[role="button"][aria-label*="audio" i], [role="button"][aria-label*="sound" i], [role="button"][aria-label*="mute" i], ' +
      'svg[aria-label*="audio" i], svg[aria-label*="sound" i], svg[aria-label*="mute" i]'
    );

    for (const el of candidates) {
      const btn = el.closest('button') || el.closest('[role="button"]') || el;
      if (btn && btn.isConnected && !btn.closest('.ig-slider-container')) {
        clickElement(btn);
        return true;
      }
    }

    const vRect = v.getBoundingClientRect();
    const allButtons = container.querySelectorAll('button, [role="button"]');
    for (const btn of allButtons) {
      if (btn.closest('.ig-slider-container')) continue;
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

    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 1;
    return true;
  }

  function createControls(video) {
    if (!video || !(video instanceof HTMLVideoElement)) return;
    if (hasNativePlayer(video)) return;

    const existingState = videoStateMap.get(video);
    if (existingState && existingState.container && existingState.container.isConnected) {
      return;
    }

    const parent = getOptimalParent(video);
    if (!parent) return;
    if (parent.querySelector('.ig-slider-container')) return;

    const container = document.createElement('div');
    container.className = 'ig-slider-container';

    const currentEl = document.createElement('span');
    currentEl.className = 'ig-time-badge';
    currentEl.textContent = '0:00';

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'ig-slider-wrapper';

    const ghost = document.createElement('div');
    ghost.className = 'ig-ghost-preview';

    const pin = document.createElement('div');
    pin.className = 'ig-anchor-pin';

    const tooltip = document.createElement('div');
    tooltip.className = 'ig-time-tooltip';

    // Native range input: guarantees instant, non-failing click-to-seek
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'ig-range-slider';
    slider.min = 0;
    slider.step = 0.01;
    slider.value = 0;

    sliderWrapper.appendChild(ghost);
    sliderWrapper.appendChild(pin);
    sliderWrapper.appendChild(tooltip);
    sliderWrapper.appendChild(slider);

    const durationEl = document.createElement('span');
    durationEl.className = 'ig-time-badge';
    durationEl.textContent = '0:00';

    container.appendChild(currentEl);
    container.appendChild(sliderWrapper);
    container.appendChild(durationEl);
    parent.appendChild(container);

    const state = {
      video,
      container,
      sliderWrapper,
      slider,
      ghost,
      pin,
      tooltip,
      currentEl,
      durationEl,
      anchorTime: null,
      lastSrc: video.currentSrc
    };

    videoStateMap.set(video, state);

    function stopProp(e) { e.stopPropagation(); }
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
      container.addEventListener(evt, stopProp, { capture: true });
    });

    // Stream & Duration Listeners
    function onStreamSync() {
      updateProgressUI(state);
      updateAnchorPin(state);
    }

    video.addEventListener('timeupdate', onStreamSync);
    video.addEventListener('durationchange', onStreamSync);
    video.addEventListener('loadedmetadata', onStreamSync);
    video.addEventListener('canplay', onStreamSync);
    video.addEventListener('playing', onStreamSync);
    video.addEventListener('seeked', onStreamSync);

    // Native Range Scrubbing (Rock-solid)
    function handleScrub() {
      const t = parseFloat(slider.value);
      if (!isNaN(t)) {
        seekTo(video, t);
        setAnchor(video, t);
      }
    }

    function recordClick() {
      lastInteractedVideo = video;
      const t = parseFloat(slider.value);
      if (!isNaN(t)) setAnchor(video, t);
    }

    slider.addEventListener('input', handleScrub);
    slider.addEventListener('pointerdown', recordClick);
    slider.addEventListener('mousedown', recordClick);
    slider.addEventListener('change', () => slider.blur());

    // Hover Tooltip & Ghost Fill
    function onHoverMove(e) {
      const dur = Number(video.duration);
      if (isNaN(dur) || dur <= 0 || !isFinite(dur)) {
        tooltip.classList.remove('visible');
        ghost.style.display = 'none';
        return;
      }

      const rect = slider.getBoundingClientRect();
      if (rect.width <= 0) return; // Guard against mid-transition layout

      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const hoverPct = x / rect.width;
      const hoverTime = hoverPct * dur;

      // 1. Update Tooltip
      tooltip.textContent = formatTime(hoverTime);
      const ttWidth = tooltip.offsetWidth || 36;
      const clampedX = Math.max(ttWidth / 2, Math.min(rect.width - ttWidth / 2, x));
      tooltip.style.left = `${clampedX}px`;
      tooltip.classList.add('visible');

      // 2. Update Ghost Bar (space between pointer and playhead)
      const curPct = Math.max(0, Math.min(1, (video.currentTime || 0) / dur));
      const left = Math.min(hoverPct, curPct) * 100;
      const width = Math.abs(hoverPct - curPct) * 100;

      ghost.style.left = `${left}%`;
      ghost.style.width = `${width}%`;
      ghost.style.display = 'block';
    }

    function onHoverLeave() {
      tooltip.classList.remove('visible');
      ghost.style.display = 'none';
    }

    slider.addEventListener('pointermove', onHoverMove);
    slider.addEventListener('pointerleave', onHoverLeave);

    updateProgressUI(state);

    state.cleanup = () => {
      try {
        video.removeEventListener('timeupdate', onStreamSync);
        video.removeEventListener('durationchange', onStreamSync);
        video.removeEventListener('loadedmetadata', onStreamSync);
        video.removeEventListener('canplay', onStreamSync);
        video.removeEventListener('playing', onStreamSync);
        video.removeEventListener('seeked', onStreamSync);
        slider.removeEventListener('input', handleScrub);
        slider.removeEventListener('pointerdown', recordClick);
        slider.removeEventListener('mousedown', recordClick);
        slider.removeEventListener('pointermove', onHoverMove);
        slider.removeEventListener('pointerleave', onHoverLeave);
      } catch (e) {}
      try { if (container.parentElement) container.parentElement.removeChild(container); } catch (e) {}
      videoStateMap.delete(video);
    };
  }

  function cleanupVideo(video) {
    if (!video) return;
    const state = videoStateMap.get(video);
    if (state && typeof state.cleanup === 'function') {
      state.cleanup();
    }
  }

  // ==== Virtualized Lifecycle Engine ====
  function scanVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
      if (hasNativePlayer(v)) {
        cleanupVideo(v);
      } else {
        const state = videoStateMap.get(v);
        if (state) {
          if (state.lastSrc !== v.currentSrc || !state.container.isConnected) {
            cleanupVideo(v);
            createControls(v);
          } else {
            updateProgressUI(state);
          }
        } else {
          createControls(v);
        }
      }
    });
  }

  const origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    scheduleScan();
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    scheduleScan();
  };
  window.addEventListener('popstate', scheduleScan);
  window.addEventListener('wheel', scheduleScan, { passive: true });
  window.addEventListener('touchmove', scheduleScan, { passive: true });

  // ==== Keyboard Actions ====
  function togglePlayPause() {
    const v = getActiveVideo();
    if (!v) return false;
    if (v.paused) {
      const p = v.play();
      if (p !== undefined) p.catch(() => {});
    } else {
      v.pause();
    }
    return true;
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

  function handleKeyDown(event) {
    const isTextEntry =
      (event.target.tagName === 'INPUT' && event.target.type !== 'range') ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable;

    if (isTextEntry || !event.altKey) return;

    let handled = false;
    const code = event.code;
    const key = event.key.toLowerCase();
    const v = getActiveVideo();

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
      if (v) { v.volume = Math.min(1, v.volume + 0.1); handled = true; }
    } else if (CONFIG.enableVolumeDown && (code === 'ArrowDown' || key === 'arrowdown')) {
      if (v) { v.volume = Math.max(0, v.volume - 0.1); handled = true; }
    } else if (CONFIG.enableSpeedDown && (code === 'Comma' || key === ',')) {
      if (v) {
        const cur = v.playbackRate || 1;
        const idx = PLAYBACK_SPEEDS.reduce((p, c, i) => Math.abs(c - cur) < Math.abs(PLAYBACK_SPEEDS[p] - cur) ? i : p, 0);
        v.playbackRate = PLAYBACK_SPEEDS[Math.max(idx - 1, 0)];
        handled = true;
      }
    } else if (CONFIG.enableSpeedUp && (code === 'Period' || key === '.' || code === 'KeyS' || key === 's')) {
      if (v) {
        const cur = v.playbackRate || 1;
        const idx = PLAYBACK_SPEEDS.reduce((p, c, i) => Math.abs(c - cur) < Math.abs(PLAYBACK_SPEEDS[p] - cur) ? i : p, 0);
        v.playbackRate = PLAYBACK_SPEEDS[Math.min(idx + 1, PLAYBACK_SPEEDS.length - 1)];
        handled = true;
      }
    } else if (CONFIG.enableSpeedReset && (code === 'Digit0' || key === '0')) {
      if (v) { v.playbackRate = 1; handled = true; }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  let scanRaf = null;
  function scheduleScan() {
    if (scanRaf) cancelAnimationFrame(scanRaf);
    scanRaf = requestAnimationFrame(scanVideos);
  }

  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const m of mutations) {
      if (m.addedNodes.length || m.removedNodes.length) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) scheduleScan();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', handleKeyDown, true);

  scheduleScan();
})();
