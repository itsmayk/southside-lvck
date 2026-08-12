/* Background music for the whole site.
 *
 * Browsers block autoplay-with-sound, so nothing plays until the visitor's
 * FIRST gesture (tap / scroll / key). A discreet corner toggle then mutes or
 * resumes it, and the choice is remembered (ss-music). The site is multi-page,
 * so playback restarts on navigation — to soften that we stash the position in
 * sessionStorage and resume from it on the next page (near-seamless in a session).
 *
 * Self-contained: it injects its own <style>, holds the <audio> in a closure
 * (so it keeps playing even if a page's framework detaches the node), and
 * re-attaches the toggle if a re-render wipes it (index.html's bundle does that).
 * If the track file is missing it stays completely inert — no broken control.
 */
(function () {
  "use strict";

  var SRC = "music/southside.mp3";   // user drops a royalty-free track here
  var VOL = 0.4;                      // background level
  var FADE_MS = 1000;
  var BTN_ID = "ss-music-btn";
  var STYLE_ID = "ss-music-style";
  var PREF_KEY = "ss-music";          // localStorage: "on" | "off"
  var TIME_KEY = "ss-music-time";     // sessionStorage: seconds

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  var muted = lsGet(PREF_KEY) === "off";
  var available = true;      // flips false if the file can't load
  var fadeTimer = null;

  var audio = document.createElement("audio");
  audio.loop = true;
  audio.preload = "metadata";   // load just enough to know it exists (404 -> hide the control early)
  audio.src = SRC;
  audio.volume = 0;
  audio.addEventListener("error", function () { available = false; removeBtn(); });
  audio.addEventListener("play", updateBtn);
  audio.addEventListener("pause", updateBtn);
  (document.body || document.documentElement).appendChild(audio);

  function fadeTo(target, ms, done) {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    var from = audio.volume, t0 = Date.now();
    fadeTimer = setInterval(function () {
      var k = ms <= 0 ? 1 : Math.min(1, (Date.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * k));
      if (k >= 1) { clearInterval(fadeTimer); fadeTimer = null; if (done) done(); }
    }, 40);
  }

  function resumePosition() {
    var t = parseFloat(ssGet(TIME_KEY) || "0");
    if (t > 0 && isFinite(t)) { try { audio.currentTime = t; } catch (e) {} }
  }

  function start() {
    if (!available || muted) return;
    resumePosition();
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});   // stays silent if still blocked
    fadeTo(VOL, FADE_MS);
  }

  function stop() {
    fadeTo(0, 300, function () { try { audio.pause(); } catch (e) {} });
  }

  /* ---- start on the first user gesture (unless the visitor muted it) ---- */
  function onFirstGesture(e) {
    // if the gesture is the toggle itself, let its click handler decide
    if (e && e.target && e.target.closest && e.target.closest("#" + BTN_ID)) {
      removeGesture();
      return;
    }
    removeGesture();
    start();
  }
  function removeGesture() {
    document.removeEventListener("pointerdown", onFirstGesture, true);
    document.removeEventListener("touchstart", onFirstGesture, true);
    document.removeEventListener("keydown", onFirstGesture, true);
  }
  document.addEventListener("pointerdown", onFirstGesture, true);
  document.addEventListener("touchstart", onFirstGesture, true);
  document.addEventListener("keydown", onFirstGesture, true);

  /* ---- keep the playback position for the next page ---- */
  setInterval(function () { if (!audio.paused) ssSet(TIME_KEY, String(audio.currentTime)); }, 2000);
  window.addEventListener("pagehide", function () { if (audio.currentTime) ssSet(TIME_KEY, String(audio.currentTime)); });

  /* ---- the corner toggle (self-healing) ---- */
  function iconSVG(off) {
    var note = '<path d="M9 18V6l11-2v10"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + note +
      (off ? '<path class="x" d="M4 4 20 20"/>' : '') + '</svg>';
  }
  function updateBtn() {
    var b = document.getElementById(BTN_ID);
    if (!b) return;
    var off = audio.paused || muted;
    b.classList.toggle("off", off);
    b.innerHTML = iconSVG(off);
  }
  function removeBtn() { var b = document.getElementById(BTN_ID); if (b) b.remove(); }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      /* matches the theme-switch glass exactly (same tokens, size, shadow, hover) */
      "#" + BTN_ID + "{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:130px;z-index:120;width:46px;height:46px;" +
      "border-radius:50%;display:grid;place-items:center;cursor:pointer;color:var(--ink);" +
      "border:1px solid rgba(255,255,255,.16);background:rgba(245,245,240,.34);" +
      "-webkit-backdrop-filter:blur(20px) saturate(1.2);backdrop-filter:blur(20px) saturate(1.2);" +
      "box-shadow:0 6px 20px -8px rgba(10,10,10,.25),inset 0 1px 0 rgba(255,255,255,.16);" +
      "transition:border-color .3s ease,transform .3s ease,box-shadow .3s ease,opacity .25s ease;}" +
      ":root[data-theme=\"dark\"] #" + BTN_ID + "{background:rgba(35,35,32,.34);border-color:rgba(255,255,255,.08);" +
      "box-shadow:0 6px 20px -8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);}" +
      "#" + BTN_ID + ":hover{color:var(--ink);border-color:var(--ink);transform:translateY(-2px);box-shadow:0 7px 22px -8px rgba(10,10,10,.32);}" +
      "#" + BTN_ID + ".off{opacity:.55;}" +
      "#" + BTN_ID + " svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.6;" +
      "stroke-linecap:round;stroke-linejoin:round;}" +
      "#" + BTN_ID + " .x{stroke-width:1.9;}";
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureBtn() {
    if (!available) return;
    if (document.getElementById(BTN_ID)) return;
    ensureStyle();
    var b = document.createElement("button");
    b.id = BTN_ID; b.type = "button";
    b.setAttribute("aria-label", "Music");
    b.setAttribute("title", "Music");
    b.className = "off";
    b.innerHTML = iconSVG(true);
    b.addEventListener("click", function () {
      if (audio.paused) {              // not playing -> turn on
        muted = false; lsSet(PREF_KEY, "on"); start();
      } else {                         // playing -> mute
        muted = true; lsSet(PREF_KEY, "off"); stop();
      }
      updateBtn();
    });
    (document.body || document.documentElement).appendChild(b);
    updateBtn();
  }

  ensureBtn();
  // index.html's bundle re-render can wipe injected nodes; re-attach if gone
  // (the audio keeps playing while detached, but re-attach it too for tidiness)
  setInterval(function () {
    if (!available) return;
    if (!audio.isConnected) (document.body || document.documentElement).appendChild(audio);
    if (!document.getElementById(BTN_ID)) ensureBtn();
  }, 1500);
})();
