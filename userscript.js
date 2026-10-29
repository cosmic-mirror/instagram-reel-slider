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
      .ig-slider-container.active-scrub {
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
      .ig-slider-container.active-scrub .ig-time-badge {
        width: 38px;
        opacity: 1;
      }

      /* Track Hit Zone */
      .ig-track-wrapper {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        height: 100%;
        min-width: 0;
        cursor: pointer;
      }

      /* Base Track Rail */
      .ig-track-rail {
        position: relative;
        width: 100%;
        height: 3px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.24);
        transition: height 0.15s ease;
        overflow: visible;
      }
      .ig-slider-container:hover .ig-track-rail,
      .ig-slider-container.active-scrub .ig-track-rail {
        height: 5px;
      }

      /* Ghost Preview Bar */
      .ig-track-ghost {
        position: absolute;
        top: 0;
        height: 100%;
        background: rgba(255, 255, 255, 0.45);
        border-radius: 9999px;
        pointer-events: none;
        display: none;
      }

      /* Solid Active Progress */
      .ig-track-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 0%;
        background: #ffffff;
        border-radius: 9999px;
        pointer-events: none;
      }

      /* Anchor Marker */
      .ig-track-anchor {
        position: absolute;
        top: 50%;
        width: 3px;
        height: 8px;
        background-color: #38bdf8;
        border-radius: 9999px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 2;
        display: none;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
        transition: height 0.15s ease;
      }
      .ig-slider-container:hover .ig-track-anchor,
      .ig-slider-container.active-scrub .ig-track-anchor {
        height: 12px;
      }

      /* Scrub Thumb Dot */
      .ig-track-thumb {
        position: absolute;
        top: 50%;
        left: 0%;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
        z-index: 3;
        transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .ig-slider-container:hover .ig-track-thumb,
      .ig-slider-container.active-scrub .ig-track-thumb {
        transform: translate(-50%, -50%) scale(1);
      }

      /* Frosted Glass Time Tooltip */
      .ig-track-tooltip {
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
      .ig-track-tooltip.visible {
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
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  // --- Scoped & Geometric Native Detection ---
  function hasNativePlayer(video) {
    if (!video) return false;

    let curr = video.parentElement;
    while (curr && curr !== document.body) {
      if (curr.querySelectorAll('video').length > 1) {
        break;
      }
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
        const overlapsX = sRect.left < vRect.right && sRect.right > vRect.left;
        const overlapsY = sRect.top < vRect.bottom && sRect.bottom > vRect.top;
        if (overlapsX && overlapsY) {
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
    if (!state || !state.video) return;
    const { video, fill, thumb, currentEl, durationEl } = state;
    const dur = Number(video.duration);
    const cur = Number(video.currentTime);

    if (!isNaN(dur) && dur > 0) {
      const pct = Math.max(0, Math.min(100, (cur / dur) * 100));
      fill.style.width = `${pct}%`;
      thumb.style.left = `${pct}%`;

      if (currentEl) currentEl.textContent = formatTime(cur);
      if (durationEl) durationEl.textContent = formatTime(dur);
    } else {
      fill.style.width = '0%';
      thumb.style.left = '0%';
      if (currentEl) currentEl.textContent = "0:00";
      if (durationEl) durationEl.textContent = "0:00";
    }
  }

  function updateGhostBar(state, hoverPct) {
    if (!state || !state.ghost) return;
    const { video, ghost } = state;
    if (hoverPct === null || isNaN(video.duration) || video.duration <= 0) {
      ghost.style.display = 'none';
      return;
    }

    const curPct = Math.max(0, Math.min(1, video.currentTime / video.duration));
    const left = Math.min(curPct, hoverPct) * 100;
    const width = Math.abs(hoverPct - curPct) * 100;

    ghost.style.left = `${left}%`;
    ghost.style.width = `${width}%`;
    ghost.style.display = 'block';
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

  // --- Restored Original Native Sound Controller ---
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
      for (let i = 0; i < 12 && curr.parentElement && curr.parentElement !== document.body; i++) {
        curr = curr.parentElement;
        if (curr.querySelector('button, [role="button"]')) {
          container = curr;
        }
      }
    }
    if (!container) container = document;

    // 2. Accessibility label match (English, localized, and SVG icons)
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

    // 3. Geometry fallback: Find circular button (20-60px) hovering directly over the video
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

    // 4. Final Fallback: Direct HTML5 property toggle
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) {
      v.volume = 1;
    }
    return true;
  }

  function createControls(video) {
    if (!video || !(video instanceof HTMLVideoElement)) return;

    if (hasNativePlayer(video)) {
      cleanupVideo(video);
      return;
    }

    const existingState = videoStateMap.get(video);
    if (existingState && existingState.container && existingState.container.isConnected) {
      return;
    }

    const parent = getOptimalParent(video);
    if (!parent) return;
    if (parent.querySelector('.ig-slider-container')) return;

    // Build DOM
    const container = document.createElement('div');
    container.className = 'ig-slider-container';

    const currentEl = document.createElement('span');
    currentEl.className = 'ig-time-badge';
    currentEl.textContent = '0:00';

    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'ig-track-wrapper';

    const rail = document.createElement('div');
    rail.className = 'ig-track-rail';

    const ghost = document.createElement('div');
    ghost.className = 'ig-track-ghost';

    const fill = document.createElement('div');
    fill.className = 'ig-track-fill';

    const pin = document.createElement('div');
    pin.className = 'ig-track-anchor';

    const thumb = document.createElement('div');
    thumb.className = 'ig-track-thumb';

    const tooltip = document.createElement('div');
    tooltip.className = 'ig-track-tooltip';

    rail.appendChild(ghost);
    rail.appendChild(fill);
    rail.appendChild(pin);
    rail.appendChild(thumb);
    trackWrapper.appendChild(rail);
    trackWrapper.appendChild(tooltip);

    const durationEl = document.createElement('span');
    durationEl.className = 'ig-time-badge';
    durationEl.textContent = '0:00';

    container.appendChild(currentEl);
    container.appendChild(trackWrapper);
    container.appendChild(durationEl);
    parent.appendChild(container);

    const state = {
      video,
      container,
      trackWrapper,
      rail,
      ghost,
      fill,
      pin,
      thumb,
      tooltip,
      currentEl,
      durationEl,
      anchorTime: null,
      isDragging: false,
      lastSrc: video.currentSrc
    };

    videoStateMap.set(video, state);

    function stopProp(e) { e.stopPropagation(); }
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(evt => {
      container.addEventListener(evt, stopProp, { capture: true });
    });

    function onTimeUpdate() {
      if (!state.isDragging) updateProgressUI(state);
    }
    function onLoadedMetadata() {
      updateProgressUI(state);
      updateAnchorPin(state);
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onTimeUpdate);

    function getPercentFromEvent(e) {
      const rect = rail.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function updateTooltip(pct) {
      if (isNaN(video.duration) || video.duration <= 0) return;
      tooltip.textContent = formatTime(pct * video.duration);

      const railRect = rail.getBoundingClientRect();
      const x = pct * railRect.width;
      const ttWidth = tooltip.offsetWidth || 36;
      const clampedX = Math.max(ttWidth / 2, Math.min(railRect.width - ttWidth / 2, x));

      tooltip.style.left = `${clampedX}px`;
      tooltip.classList.add('visible');
    }

    function onPointerMove(e) {
      const pct = getPercentFromEvent(e);
      updateGhostBar(state, pct);
      updateTooltip(pct);

      if (state.isDragging) {
        seekTo(video, pct * video.duration);
      }
    }

    function onPointerLeave() {
      if (!state.isDragging) {
        updateGhostBar(state, null);
        tooltip.classList.remove('visible');
      }
    }

    function onPointerDown(e) {
      state.isDragging = true;
      lastInteractedVideo = video;
      container.classList.add('active-scrub');
      trackWrapper.setPointerCapture(e.pointerId);

      const pct = getPercentFromEvent(e);
      seekTo(video, pct * video.duration);
      setAnchor(video, pct * video.duration);
      updateTooltip(pct);
      updateGhostBar(state, pct);
    }

    function onPointerUp(e) {
      if (!state.isDragging) return;
      state.isDragging = false;
      container.classList.remove('active-scrub');
      try { trackWrapper.releasePointerCapture(e.pointerId); } catch (err) {}

      const pct = getPercentFromEvent(e);
      setAnchor(video, pct * video.duration);
      updateGhostBar(state, null);
      tooltip.classList.remove('visible');
    }

    trackWrapper.addEventListener('pointerdown', onPointerDown);
    trackWrapper.addEventListener('pointermove', onPointerMove);
    trackWrapper.addEventListener('pointerleave', onPointerLeave);
    trackWrapper.addEventListener('pointerup', onPointerUp);
    trackWrapper.addEventListener('pointercancel', onPointerUp);

    updateProgressUI(state);

    state.cleanup = () => {
      try {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('seeked', onTimeUpdate);
        trackWrapper.removeEventListener('pointerdown', onPointerDown);
        trackWrapper.removeEventListener('pointermove', onPointerMove);
        trackWrapper.removeEventListener('pointerleave', onPointerLeave);
        trackWrapper.removeEventListener('pointerup', onPointerUp);
        trackWrapper.removeEventListener('pointercancel', onPointerUp);
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

  // ==== Virtualized Lifecycle & Navigation Engine ====
  function scanVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
      if (hasNativePlayer(v)) {
        cleanupVideo(v);
      } else {
        const state = videoStateMap.get(v);
        if (state && state.lastSrc !== v.currentSrc) {
          state.lastSrc = v.currentSrc;
          state.anchorTime = null;
          updateProgressUI(state);
          updateAnchorPin(state);
        } else if (!state) {
          createControls(v);
        }
      }
    });
  }

  // Hook History API
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

  // Hook Scroll & Swipe events for Reels carousel
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

  // Setup DOM Observer
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

  // Initial Boot
  scheduleScan();
})();
