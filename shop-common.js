/* Shared behaviour for the three storefront pages (catalog, product, thank-you).
   Deliberately plain: no framework, no build step, same as the rest of the repo.

   Language reuses the exact localStorage keys the landing page writes
   ("ss-lang" / "ss-country"), so someone who already chose a language there
   never gets asked twice — even though the two sites are otherwise separate
   until the drop. */

(function (global) {
  "use strict";

  var LANG_KEY = "ss-lang";
  var COUNTRY_KEY = "ss-country";
  var LANGS = ["es", "en", "pt"];

  // same country -> language table the landing page uses
  var LANG_BY_COUNTRY = {
    AR: "es", BO: "es", CL: "es", CO: "es", CR: "es", CU: "es", DO: "es", EC: "es",
    SV: "es", GQ: "es", GT: "es", HN: "es", MX: "es", NI: "es", PA: "es", PY: "es",
    PE: "es", ES: "es", UY: "es", VE: "es",
    AO: "pt", BR: "pt", CV: "pt", GW: "pt", MZ: "pt", PT: "pt", ST: "pt", TL: "pt"
  };

  var T = {
    es: {
      "nav.shop": "Tienda",
      "nav.lang": "Idioma",
      "theme.toDark": "Cambiar a modo oscuro",
      "theme.toLight": "Cambiar a modo claro",
      "nav.back": "Volver a la tienda",
      "foot.brand": "LVCK · South Side",
      "foot.note": "Bogotá, Colombia",
      "lang.pick": "Elige tu idioma",
      "test.notice": "Modo prueba · ningún pago es real todavía",
      "drop.label": "Lanzamiento",
      "drop.date": "15 AGO 2026",
      "drop.live": "Ya disponible",

      "shop.eyebrow": "Lanzamiento",
      "shop.intro": "Dos piezas. Producción corta. Cuando se agota una talla, no vuelve.",
      "shop.view": "Ver",
      "shop.soldOut": "Agotado",
      "shop.allSoldOut": "Agotado en todas las tallas",
      "shop.swipeHint": "Desliza para ver más fotos",

      "how.title": "Cómo comprar",
      "how.1.t": "Elige tu talla",
      "how.1.d": "Mira la guía de medidas antes de decidir. Es la razón número uno de cambios.",
      "how.2.t": "Paga seguro",
      "how.2.d": "El pago lo procesa Stripe. Nosotros nunca vemos los datos de tu tarjeta.",
      "how.3.t": "Te llega a casa",
      "how.3.d": "Recibes un correo con la confirmación y luego el número de guía.",

      "p.choose": "Elige tu talla",
      "p.guide": "Guía de tallas",
      "p.buy": "Comprar",
      "btn.back": "Volver",
      "p.pickFirst": "Elige",
      "p.soldOut": "Agotado",
      "p.secure": "Pago seguro con Stripe · no guardamos tu tarjeta",
      "p.desc": "Descripción",
      "p.materials": "Materiales y cuidado",
      "p.shipping": "Envíos",
      "p.returns": "Cambios y devoluciones",
      "p.guideIntro": "Medidas de la prenda en centímetros. Si estás entre dos tallas, sube una: el corte es holgado.",
      "p.close": "Cerrar",
      "p.notFound": "No encontramos ese producto.",
      "p.also": "También te puede gustar",

      "ty.eyebrow": "Pedido confirmado",
      "ty.title": "Gracias",
      "ty.sub": "Tu pedido entró. Te llega un correo con la confirmación en unos minutos.",
      "ty.n1": "Revisa tu correo (mira también en spam).",
      "ty.n2": "Preparamos tu pedido y te enviamos el número de guía.",
      "ty.n3": "¿Algo no cuadra? Escríbenos por Instagram.",
      "ty.next": "Qué sigue"
    },
    en: {
      "nav.shop": "Shop",
      "nav.lang": "Language",
      "theme.toDark": "Switch to dark mode",
      "theme.toLight": "Switch to light mode",
      "nav.back": "Back to the shop",
      "foot.brand": "LVCK · South Side",
      "foot.note": "Bogotá, Colombia",
      "lang.pick": "Choose your language",
      "test.notice": "Test mode · no payment is real yet",
      "drop.label": "Drop",
      "drop.date": "15 AUG 2026",
      "drop.live": "Available now",

      "shop.eyebrow": "Drop",
      "shop.intro": "Two pieces. Short production run. Once a size is gone, it's gone.",
      "shop.view": "View",
      "shop.soldOut": "Sold out",
      "shop.allSoldOut": "Sold out in every size",
      "shop.swipeHint": "Swipe to see more photos",

      "how.title": "How to buy",
      "how.1.t": "Pick your size",
      "how.1.d": "Check the measurements first. It's the number one reason for exchanges.",
      "how.2.t": "Pay securely",
      "how.2.d": "Stripe handles the payment. We never see your card details.",
      "how.3.t": "It ships to you",
      "how.3.d": "You get a confirmation email, then your tracking number.",

      "p.choose": "Choose your size",
      "p.guide": "Size guide",
      "p.buy": "Buy",
      "btn.back": "Back",
      "p.pickFirst": "Pick",
      "p.soldOut": "Sold out",
      "p.secure": "Secure payment via Stripe · we never store your card",
      "p.desc": "Description",
      "p.materials": "Materials & care",
      "p.shipping": "Shipping",
      "p.returns": "Returns & exchanges",
      "p.guideIntro": "Garment measurements in centimetres. Between two sizes? Take the larger one — the cut is loose.",
      "p.close": "Close",
      "p.notFound": "We couldn't find that product.",
      "p.also": "You may also like",

      "ty.eyebrow": "Order confirmed",
      "ty.title": "Thank you",
      "ty.sub": "Your order went through. A confirmation email is on its way.",
      "ty.n1": "Check your inbox (and your spam folder).",
      "ty.n2": "We prepare your order and send you the tracking number.",
      "ty.n3": "Something off? Message us on Instagram.",
      "ty.next": "What happens next"
    },
    pt: {
      "nav.shop": "Loja",
      "nav.lang": "Idioma",
      "theme.toDark": "Mudar para o modo escuro",
      "theme.toLight": "Mudar para o modo claro",
      "nav.back": "Voltar para a loja",
      "foot.brand": "LVCK · South Side",
      "foot.note": "Bogotá, Colômbia",
      "lang.pick": "Escolha seu idioma",
      "test.notice": "Modo teste · nenhum pagamento é real ainda",
      "drop.label": "Lançamento",
      "drop.date": "15 AGO 2026",
      "drop.live": "Já disponível",

      "shop.eyebrow": "Lançamento",
      "shop.intro": "Duas peças. Produção curta. Quando um tamanho acaba, não volta.",
      "shop.view": "Ver",
      "shop.soldOut": "Esgotado",
      "shop.allSoldOut": "Esgotado em todos os tamanhos",
      "shop.swipeHint": "Deslize para ver mais fotos",

      "how.title": "Como comprar",
      "how.1.t": "Escolha seu tamanho",
      "how.1.d": "Veja as medidas antes de decidir. É o motivo número um de trocas.",
      "how.2.t": "Pague com segurança",
      "how.2.d": "O pagamento é processado pela Stripe. Nunca vemos os dados do seu cartão.",
      "how.3.t": "Chega até você",
      "how.3.d": "Você recebe um e-mail de confirmação e depois o código de rastreio.",

      "p.choose": "Escolha seu tamanho",
      "p.guide": "Guia de tamanhos",
      "p.buy": "Comprar",
      "btn.back": "Voltar",
      "p.pickFirst": "Escolha",
      "p.soldOut": "Esgotado",
      "p.secure": "Pagamento seguro via Stripe · não guardamos seu cartão",
      "p.desc": "Descrição",
      "p.materials": "Materiais e cuidados",
      "p.shipping": "Envios",
      "p.returns": "Trocas e devoluções",
      "p.guideIntro": "Medidas da peça em centímetros. Entre dois tamanhos? Pegue o maior — o corte é solto.",
      "p.close": "Fechar",
      "p.notFound": "Não encontramos esse produto.",
      "p.also": "Você também pode gostar",

      "ty.eyebrow": "Pedido confirmado",
      "ty.title": "Obrigado",
      "ty.sub": "Seu pedido entrou. Um e-mail de confirmação está a caminho.",
      "ty.n1": "Confira seu e-mail (e a caixa de spam).",
      "ty.n2": "Preparamos seu pedido e enviamos o código de rastreio.",
      "ty.n3": "Algo errado? Fale com a gente no Instagram.",
      "ty.next": "O que acontece agora"
    }
  };

  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); }
    catch (e) { return null; }
  }

  function getLang() {
    var saved = store(LANG_KEY);
    return LANGS.indexOf(saved) === -1 ? null : saved;
  }

  function t(key, lang) {
    var dict = T[lang || getLang() || "es"] || T.es;
    return dict[key] !== undefined ? dict[key] : (T.es[key] !== undefined ? T.es[key] : key);
  }

  function money(cop, lang) {
    // one currency for now: showing a converted price the Stripe checkout will
    // not honour is worse than showing none. See the currency work still to come.
    return "$" + Number(cop).toLocaleString(lang === "en" ? "en-US" : "es-CO") + " COP";
  }

  /* Anything carrying data-i18n has its text replaced; data-i18n-attr does the
     same for an attribute ("alt", "aria-label", …) as "attr:key". */
  function applyI18n(root) {
    var lang = getLang() || "es";
    document.documentElement.lang = lang;
    (root || document).querySelectorAll("[data-i18n]").forEach(function (el) {
      var val = t(el.getAttribute("data-i18n"), lang);
      if (el.textContent !== val) el.textContent = val;
    });
    (root || document).querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var bits = pair.split(":");
        if (bits.length === 2) el.setAttribute(bits[0].trim(), t(bits[1].trim(), lang));
      });
    });
    // the switch carries no visible text, so its accessible name is set here
    // rather than by the data-i18n sweep
    labelThemeSwitch(document.documentElement.getAttribute("data-theme"), lang);

    // Only a whole-document pass announces the change. Listeners react by
    // re-rendering config-driven copy and then translating that new markup with
    // a subtree call — if those announced too, the listener would re-enter
    // itself until the stack blew.
    if (!root) global.dispatchEvent(new CustomEvent("lvck:lang", { detail: { lang: lang } }));
  }

  /* ---------- light / dark ---------- */

  /* The theme is already on <html> by the time this runs: a tiny inline script
     in each page's <head> sets it before the stylesheet paints, so the page
     never flashes bone at someone whose phone is in dark mode. This half owns
     the manual override and keeps the browser chrome in step. */
  var THEME_KEY = "ss-theme";
  var PAGE_COLOUR = { light: "#F5F5F0", dark: "#232320" };

  function labelThemeSwitch(theme, lang) {
    var btn = document.getElementById("ss-theme-btn");
    if (!btn) return;
    var text = t(theme === "dark" ? "theme.toLight" : "theme.toDark", lang);
    btn.setAttribute("aria-label", text);
    btn.setAttribute("title", text);
  }

  function storedTheme() {
    var t = store(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  }

  function systemTheme() {
    return global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || storedTheme() || systemTheme();
  }

  function applyTheme(theme, remember) {
    document.documentElement.setAttribute("data-theme", theme);
    if (remember) store(THEME_KEY, theme);

    // the phone's status bar and the desktop browser's surround
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", PAGE_COLOUR[theme]);

    // The switch is a sun and a moon, not words — its meaning is carried for
    // screen readers and for the tooltip. Like the icon, it names where it
    // will take you rather than where you are.
    labelThemeSwitch(theme);

    global.dispatchEvent(new CustomEvent("lvck:theme", { detail: { theme: theme } }));
  }

  function toggleTheme() {
    applyTheme(getTheme() === "dark" ? "light" : "dark", true);
  }

  function initTheme() {
    applyTheme(getTheme(), false);

    // follow the device until the visitor overrides it by hand
    if (global.matchMedia) {
      var mq = global.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (!storedTheme()) applyTheme(systemTheme(), false); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-toggle-theme]")) toggleTheme();
  });

  /* The flame's fill is the button's own background-colour, so the label can't
     also carry a gradient — it needs its own box. Every button therefore holds
     a .lbl span, and that span is what gets the chrome. */
  function btnLabel(btn) {
    var lbl = btn.querySelector(".lbl");
    if (lbl) return lbl;
    lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = btn.textContent.trim();
    btn.textContent = "";
    btn.appendChild(lbl);
    return lbl;
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    store(LANG_KEY, lang);
    applyI18n();
  }

  /* Ask the IP service only if we have neither a language nor a stored country.
     A failure is recorded as "ZZ" so a returning visitor isn't made to wait on
     the same lookup, and falls back to the picker. */
  function detectLang(done) {
    var country = store(COUNTRY_KEY);
    if (country) return done(LANG_BY_COUNTRY[country] || (country === "ZZ" ? null : "en"));

    var settled = false;
    function finish(lang) { if (!settled) { settled = true; done(lang); } }
    var timer = setTimeout(function () { store(COUNTRY_KEY, "ZZ"); finish(null); }, 3000);

    fetch("https://ipapi.co/json/")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        var code = (d && d.country_code) || "ZZ";
        store(COUNTRY_KEY, code);
        finish(code === "ZZ" ? null : (LANG_BY_COUNTRY[code] || "en"));
      })
      .catch(function () { clearTimeout(timer); store(COUNTRY_KEY, "ZZ"); finish(null); });
  }

  function buildLangModal() {
    var modal = document.createElement("div");
    modal.className = "lang-modal";
    modal.id = "lang-modal";
    modal.innerHTML =
      '<div class="panel">' +
        '<div class="eyebrow">Language · Idioma</div>' +
        '<button class="lang-btn" data-set-lang="es">Español</button>' +
        '<button class="lang-btn" data-set-lang="en">English</button>' +
        '<button class="lang-btn" data-set-lang="pt">Português</button>' +
      '</div>';
    document.body.appendChild(modal);
    return modal;
  }

  function openLangModal() {
    (document.getElementById("lang-modal") || buildLangModal()).classList.add("open");
  }
  function closeLangModal() {
    var m = document.getElementById("lang-modal");
    if (m) m.classList.remove("open");
  }

  document.addEventListener("click", function (e) {
    var setter = e.target.closest && e.target.closest("[data-set-lang]");
    if (setter) { setLang(setter.getAttribute("data-set-lang")); closeLangModal(); return; }
    if (e.target.closest && e.target.closest("[data-open-lang]")) { openLangModal(); return; }
    if (e.target.id === "lang-modal") closeLangModal();
  });

  /* Scroll reveal. The displaced starting state is set from JS so that a
     visitor without JS (or with it broken) still sees every product rather
     than a page of invisible elements. */
  function initReveal(root) {
    var els = (root || document).querySelectorAll("[data-reveal]:not(.revealed)");
    if (!els.length) return;

    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in global)) {
      els.forEach(function (el) { el.classList.add("revealed"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseFloat(el.getAttribute("data-reveal-delay") || "0");
        setTimeout(function () { el.classList.add("revealed"); }, delay * 1000);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    els.forEach(function (el) {
      var shift = el.getAttribute("data-reveal") === "left" ? "-28px" : "28px";
      el.style.opacity = "0";
      el.style.transform = el.getAttribute("data-reveal") === "up"
        ? "translateY(28px)" : "translateX(" + shift + ")";
      el.style.transition = "opacity 0.9s var(--ease), transform 0.9s var(--ease)";
      io.observe(el);
    });
  }

  /* ---------- countdown ---------- */

  // same instant the landing page counts to: midnight in Colombia, 15 Aug 2026
  var DROP_AT = new Date("2026-08-15T00:00:00-05:00").getTime();

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  /* The strip under the header. Right now everyone sees it; when the drop is
     gated this is the element to hide behind whatever grants early access —
     the markup and the clock stay exactly as they are. */
  function initCountdown() {
    var bar = document.querySelector(".countdown-bar");
    if (!bar) return;

    var clock = bar.querySelector(".clock");
    if (!clock) return;

    function tick() {
      var diff = DROP_AT - Date.now();
      if (diff <= 0) {
        bar.classList.add("live");
        clock.textContent = t("drop.live");
        return;
      }
      bar.classList.remove("live");
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      clock.textContent = d + "D " + pad(h) + "H " + pad(m) + "M " + pad(s) + "S";
    }

    tick();
    setInterval(tick, 1000);
    global.addEventListener("lvck:lang", tick);   // "Ya disponible" is translated
  }

  // called by every page once its own markup exists
  function boot(afterLang) {
    initTheme();
    initCountdown();
    var lang = getLang();
    applyI18n();
    if (!lang) {
      detectLang(function (detected) {
        if (getLang()) return;             // visitor picked one while we waited
        if (detected) setLang(detected);
        else openLangModal();
        if (afterLang) afterLang();
      });
    } else if (afterLang) {
      afterLang();
    }
  }

  global.LVCK = {
    t: t, money: money, getLang: getLang, setLang: setLang,
    applyI18n: applyI18n, initReveal: initReveal, boot: boot,
    openLangModal: openLangModal, btnLabel: btnLabel,
    getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme
  };
})(window);
