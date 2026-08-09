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
  var CURRENCY_KEY = "ss-currency";
  var LANGS = ["es", "en", "pt"];

  /* ---------- currency picker (Shopify-style, display only) ----------
     Prices live in COP. The visitor picks a COUNTRY and prices show in that
     country's currency (reference only — the real charge stays COP/Bold, USD/intl).
     Real flags come from flagcdn.com (render everywhere, unlike flag emoji on
     Windows). Rates come live from /api/rates (base COP). */
  var HOME_CURRENCY = "COP";
  var CUR_COUNTRY_KEY = "ss-cur-country";   // the picked country's ISO2 (drives currency + flag)

  // currency -> display symbol (cosmetic; Intl handles the actual price format)
  var CUR_SYM = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", AUD: "$", CAD: "$", CHF: "Fr",
    COP: "$", MXN: "$", BRL: "R$", ARS: "$", CLP: "$", PEN: "S/", UYU: "$U", BOB: "Bs",
    PYG: "₲", CRC: "₡", GTQ: "Q", DOP: "RD$", HNL: "L", NIO: "C$", PAB: "B/.", VES: "Bs",
    CUP: "$", BZD: "BZ$", JMD: "J$", TTD: "TT$", BSD: "$", BBD: "$", BND: "$", FJD: "$",
    KRW: "₩", INR: "₹", IDR: "Rp", PHP: "₱", MYR: "RM", SGD: "$", HKD: "$", TWD: "NT$",
    THB: "฿", NZD: "$", VND: "₫", PKR: "₨", LKR: "₨", NPR: "₨", BDT: "৳", KHR: "៛",
    SEK: "kr", NOK: "kr", DKK: "kr", ISK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
    RON: "lei", BGN: "лв", RSD: "дин", RUB: "₽", UAH: "₴", TRY: "₺", GEL: "₾", AMD: "֏",
    AZN: "₼", KZT: "₸", UZS: "soʻm", MNT: "₮", MDL: "L", BYN: "Br", BAM: "KM", MKD: "ден",
    AED: "د.إ", SAR: "﷼", QAR: "﷼", KWD: "د.ك", BHD: ".د.ب", OMR: "﷼", JOD: "د.ا",
    LBP: "ل.ل", ILS: "₪", EGP: "£", MAD: "د.م.", DZD: "د.ج", TND: "د.ت", AFN: "؋",
    MVR: ".ރ", ZAR: "R", NGN: "₦", GHS: "₵", KES: "Sh", TZS: "Sh", UGX: "Sh", ZMW: "ZK",
    ETB: "Br", AOA: "Kz", XOF: "Fr", XAF: "Fr", BWP: "P", MZN: "MT", MUR: "₨"
  };

  // Country list (alphabetical by name) -> { n: name, c: ISO2 for the flag, cur: ISO4217 }.
  // Comprehensive across every continent; pricing uses `cur`, the flag uses `c`.
  var COUNTRIES = [
    { n: "Afghanistan", c: "af", cur: "AFN" }, { n: "Albania", c: "al", cur: "ALL" },
    { n: "Algeria", c: "dz", cur: "DZD" }, { n: "Andorra", c: "ad", cur: "EUR" },
    { n: "Angola", c: "ao", cur: "AOA" }, { n: "Argentina", c: "ar", cur: "ARS" },
    { n: "Armenia", c: "am", cur: "AMD" }, { n: "Australia", c: "au", cur: "AUD" },
    { n: "Austria", c: "at", cur: "EUR" }, { n: "Azerbaijan", c: "az", cur: "AZN" },
    { n: "Bahamas", c: "bs", cur: "BSD" }, { n: "Bahrain", c: "bh", cur: "BHD" },
    { n: "Bangladesh", c: "bd", cur: "BDT" }, { n: "Barbados", c: "bb", cur: "BBD" },
    { n: "Belarus", c: "by", cur: "BYN" }, { n: "Belgium", c: "be", cur: "EUR" },
    { n: "Belize", c: "bz", cur: "BZD" }, { n: "Bolivia", c: "bo", cur: "BOB" },
    { n: "Bosnia & Herzegovina", c: "ba", cur: "BAM" }, { n: "Botswana", c: "bw", cur: "BWP" },
    { n: "Brazil", c: "br", cur: "BRL" }, { n: "Brunei", c: "bn", cur: "BND" },
    { n: "Bulgaria", c: "bg", cur: "BGN" }, { n: "Cambodia", c: "kh", cur: "KHR" },
    { n: "Cameroon", c: "cm", cur: "XAF" }, { n: "Canada", c: "ca", cur: "CAD" },
    { n: "Chile", c: "cl", cur: "CLP" }, { n: "China", c: "cn", cur: "CNY" },
    { n: "Colombia", c: "co", cur: "COP" }, { n: "Costa Rica", c: "cr", cur: "CRC" },
    { n: "Croatia", c: "hr", cur: "EUR" }, { n: "Cuba", c: "cu", cur: "CUP" },
    { n: "Cyprus", c: "cy", cur: "EUR" }, { n: "Czechia", c: "cz", cur: "CZK" },
    { n: "Denmark", c: "dk", cur: "DKK" }, { n: "Dominican Republic", c: "do", cur: "DOP" },
    { n: "Ecuador", c: "ec", cur: "USD" }, { n: "Egypt", c: "eg", cur: "EGP" },
    { n: "El Salvador", c: "sv", cur: "USD" }, { n: "Estonia", c: "ee", cur: "EUR" },
    { n: "Ethiopia", c: "et", cur: "ETB" }, { n: "Fiji", c: "fj", cur: "FJD" },
    { n: "Finland", c: "fi", cur: "EUR" }, { n: "France", c: "fr", cur: "EUR" },
    { n: "Georgia", c: "ge", cur: "GEL" }, { n: "Germany", c: "de", cur: "EUR" },
    { n: "Ghana", c: "gh", cur: "GHS" }, { n: "Greece", c: "gr", cur: "EUR" },
    { n: "Guatemala", c: "gt", cur: "GTQ" }, { n: "Honduras", c: "hn", cur: "HNL" },
    { n: "Hong Kong", c: "hk", cur: "HKD" }, { n: "Hungary", c: "hu", cur: "HUF" },
    { n: "Iceland", c: "is", cur: "ISK" }, { n: "India", c: "in", cur: "INR" },
    { n: "Indonesia", c: "id", cur: "IDR" }, { n: "Ireland", c: "ie", cur: "EUR" },
    { n: "Israel", c: "il", cur: "ILS" }, { n: "Italy", c: "it", cur: "EUR" },
    { n: "Jamaica", c: "jm", cur: "JMD" }, { n: "Japan", c: "jp", cur: "JPY" },
    { n: "Jordan", c: "jo", cur: "JOD" }, { n: "Kazakhstan", c: "kz", cur: "KZT" },
    { n: "Kenya", c: "ke", cur: "KES" }, { n: "Kuwait", c: "kw", cur: "KWD" },
    { n: "Latvia", c: "lv", cur: "EUR" }, { n: "Lebanon", c: "lb", cur: "LBP" },
    { n: "Lithuania", c: "lt", cur: "EUR" }, { n: "Luxembourg", c: "lu", cur: "EUR" },
    { n: "Malaysia", c: "my", cur: "MYR" }, { n: "Maldives", c: "mv", cur: "MVR" },
    { n: "Malta", c: "mt", cur: "EUR" }, { n: "Mauritius", c: "mu", cur: "MUR" },
    { n: "Mexico", c: "mx", cur: "MXN" }, { n: "Moldova", c: "md", cur: "MDL" },
    { n: "Monaco", c: "mc", cur: "EUR" }, { n: "Mongolia", c: "mn", cur: "MNT" },
    { n: "Morocco", c: "ma", cur: "MAD" }, { n: "Mozambique", c: "mz", cur: "MZN" },
    { n: "Nepal", c: "np", cur: "NPR" }, { n: "Netherlands", c: "nl", cur: "EUR" },
    { n: "New Zealand", c: "nz", cur: "NZD" }, { n: "Nicaragua", c: "ni", cur: "NIO" },
    { n: "Nigeria", c: "ng", cur: "NGN" }, { n: "North Macedonia", c: "mk", cur: "MKD" },
    { n: "Norway", c: "no", cur: "NOK" }, { n: "Oman", c: "om", cur: "OMR" },
    { n: "Pakistan", c: "pk", cur: "PKR" }, { n: "Panama", c: "pa", cur: "PAB" },
    { n: "Paraguay", c: "py", cur: "PYG" }, { n: "Peru", c: "pe", cur: "PEN" },
    { n: "Philippines", c: "ph", cur: "PHP" }, { n: "Poland", c: "pl", cur: "PLN" },
    { n: "Portugal", c: "pt", cur: "EUR" }, { n: "Puerto Rico", c: "pr", cur: "USD" },
    { n: "Qatar", c: "qa", cur: "QAR" }, { n: "Romania", c: "ro", cur: "RON" },
    { n: "Russia", c: "ru", cur: "RUB" }, { n: "Saudi Arabia", c: "sa", cur: "SAR" },
    { n: "Serbia", c: "rs", cur: "RSD" }, { n: "Singapore", c: "sg", cur: "SGD" },
    { n: "Slovakia", c: "sk", cur: "EUR" }, { n: "Slovenia", c: "si", cur: "EUR" },
    { n: "South Africa", c: "za", cur: "ZAR" }, { n: "South Korea", c: "kr", cur: "KRW" },
    { n: "Spain", c: "es", cur: "EUR" }, { n: "Sri Lanka", c: "lk", cur: "LKR" },
    { n: "Sweden", c: "se", cur: "SEK" }, { n: "Switzerland", c: "ch", cur: "CHF" },
    { n: "Taiwan", c: "tw", cur: "TWD" }, { n: "Tanzania", c: "tz", cur: "TZS" },
    { n: "Thailand", c: "th", cur: "THB" }, { n: "Trinidad & Tobago", c: "tt", cur: "TTD" },
    { n: "Tunisia", c: "tn", cur: "TND" }, { n: "Turkey", c: "tr", cur: "TRY" },
    { n: "Uganda", c: "ug", cur: "UGX" }, { n: "Ukraine", c: "ua", cur: "UAH" },
    { n: "United Arab Emirates", c: "ae", cur: "AED" }, { n: "United Kingdom", c: "gb", cur: "GBP" },
    { n: "United States", c: "us", cur: "USD" }, { n: "Uruguay", c: "uy", cur: "UYU" },
    { n: "Uzbekistan", c: "uz", cur: "UZS" }, { n: "Venezuela", c: "ve", cur: "VES" },
    { n: "Vietnam", c: "vn", cur: "VND" }, { n: "Zambia", c: "zm", cur: "ZMW" }
  ];
  var COUNTRY_BY_CC = {};
  COUNTRIES.forEach(function (c) { COUNTRY_BY_CC[c.c.toUpperCase()] = c; });
  var fxRates = null;   // { USD: 0.00025, ... } per 1 COP; null until /api/rates answers

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
      "cur.title": "Elige tu moneda",
      "cur.search": "Buscar moneda…",
      "cur.charged": "Precio de referencia · el cobro se realiza en COP.",
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
      "shop.loadError": "No pudimos cargar el catálogo. Recarga la página o vuelve en un momento.",

      "how.title": "Cómo comprar",
      "how.1.t": "Elige tu talla",
      "how.1.d": "Mira la guía de medidas antes de decidir. Es la razón número uno de cambios.",
      "how.2.t": "Paga seguro",
      "how.2.d": "El pago lo procesa Bold. Nosotros nunca vemos los datos de tu tarjeta.",
      "how.3.t": "Te llega a casa",
      "how.3.d": "Recibes un correo con la confirmación y luego el número de guía.",

      "p.choose": "Elige tu talla",
      "p.guide": "Guía de tallas",
      "p.buy": "Comprar",
      "btn.back": "Volver",
      "p.pickFirst": "Elige",
      "p.soldOut": "Agotado",
      "p.secure": "Pago seguro con Bold · no guardamos tu tarjeta",
      "p.desc": "Descripción",
      "p.materials": "Materiales y cuidado",
      "p.shipping": "Envíos",
      "p.returns": "Cambios y devoluciones",
      "p.guideIntro": "Medidas de la prenda en centímetros. Si estás entre dos tallas, sube una: el corte es holgado.",
      "p.close": "Cerrar",
      "p.notFound": "No encontramos ese producto.",
      "p.also": "También te puede gustar",

      "notify.open": "Avísame en el drop",
      "notify.title": "Avísame en el drop",
      "notify.sub": "Te escribimos apenas caiga, el 15 AGO. Nada de spam.",
      "notify.ph": "tu@correo.com",
      "notify.cta": "Avísame",
      "notify.sending": "Enviando…",
      "notify.ok": "Listo. Te avisamos en el drop ✓",
      "notify.invalid": "Revisa el correo.",
      "notify.err": "No se pudo. Intenta de nuevo.",

      "rec.open": "¿Tu talla?",
      "rec.title": "Encuentra tu talla",
      "rec.sub": "Rápido y aproximado. El corte es holgado; si dudas, sube una.",
      "rec.height": "Altura (cm)",
      "rec.weight": "Peso (kg)",
      "rec.fit": "¿Cómo te gusta?",
      "rec.fit.slim": "Ceñido",
      "rec.fit.reg": "Normal",
      "rec.fit.loose": "Holgado",
      "rec.cta": "Ver mi talla",
      "rec.result": "Te recomendamos",
      "rec.apply": "Usar esta talla",
      "rec.incomplete": "Pon altura y peso.",
      "rec.note": "Estimación; la caída es holgada. Mira la guía de medidas para confirmar.",

      "ship.title": "Envío internacional",
      "ship.sub": "Dinos a dónde lo enviamos.",
      "ship.country": "País",
      "ship.pickCountry": "Elige tu país",
      "ship.name": "Nombre completo",
      "ship.addr": "Dirección",
      "ship.city": "Ciudad",
      "ship.state": "Estado / Región",
      "ship.zip": "Código postal",
      "ship.phone": "Teléfono",
      "ship.email": "Correo",
      "ship.calc": "Calcular envío",
      "ship.shippingLbl": "Envío",
      "ship.totalLbl": "Total",
      "ship.pay": "Ir a pagar",
      "ship.incomplete": "Completa los datos.",
      "ship.unavailable": "Aún no enviamos a ese país.",
      "ship.err": "No pudimos cotizar. Intenta de nuevo.",
      "ship.soon": "Pago internacional en configuración. Muy pronto.",

      "ty.eyebrow": "Pedido confirmado",
      "ty.title": "Gracias",
      "ty.sub": "Tu pedido entró. Te llega un correo con la confirmación en unos minutos.",
      "ty.n1": "Revisa tu correo (mira también en spam).",
      "ty.n2": "Preparamos tu pedido y te enviamos el número de guía.",
      "ty.n3": "¿Algo no cuadra? Escríbenos por Instagram.",
      "ty.next": "Qué sigue",
      "ty.circle.label": "El Círculo",
      "ty.circle.copy": "Esto no es una lista de correo. Acceso y avisos antes que nadie — solo para quienes ya cayeron en un drop.",
      "ty.circle.cta": "Entrar al Círculo",
      "ty.tag.label": "Sal en el feed",
      "ty.tag.copy": "Súbela con #SouthSide y etiquétanos. Reposteamos a los del drop.",
      "ty.tag.hash": "Copiar #SouthSide",
      "ty.tag.copied": "Copiado ✓",
      "ty.tag.cta": "Etiquétanos",
      "nav.gallery": "Galería",
      "nav.about": "Nosotros",
      "about.eyebrow": "Nosotros",
      "about.title": "El origen",
      "about.lead": "LVCK no nació en una tienda. Nació en la calle, en el sur, donde la ropa dice más que las palabras.",
      "about.s1.t": "Cómo empezó",
      "about.s1.p": "Empezó en [año], en [ciudad], con una idea simple y terca: hacer piezas cortas, honestas, que se sientan tuyas. Sin fábrica, sin inversores — solo una visión y ganas.",
      "about.s2.t": "El desarrollo",
      "about.s2.p": "De los primeros bocetos a los primeros drops, cada colección fue un experimento. Aprendimos cortando, cosiendo, fallando y volviendo. La marca creció drop a drop, con la comunidad como espejo.",
      "about.s3.t": "Hacia dónde vamos",
      "about.s3.p": "South Side es el próximo capítulo — de Colombia para el mundo. Producción corta, identidad fuerte, y una promesa: cuando algo se agota, no vuelve.",
      "about.close": "Esto no es solo ropa. Es de dónde venimos.",
      "gallery.eyebrow": "Galería",
      "gallery.title": "El archivo",
      "gallery.lead": "Un vistazo a lo que hemos creado — prendas, identidad, proceso.",
      "gallery.cat1": "Prendas",
      "gallery.cat2": "Identidad",
      "gallery.cat3": "Proceso",
      "gallery.soon": "Archivo en construcción"
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
      "cur.title": "Choose your currency",
      "cur.search": "Search currency…",
      "cur.charged": "Reference price · you are charged in COP.",
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
      "shop.loadError": "We couldn't load the catalog. Refresh the page or check back in a moment.",

      "how.title": "How to buy",
      "how.1.t": "Pick your size",
      "how.1.d": "Check the measurements first. It's the number one reason for exchanges.",
      "how.2.t": "Pay securely",
      "how.2.d": "Bold handles the payment. We never see your card details.",
      "how.3.t": "It ships to you",
      "how.3.d": "You get a confirmation email, then your tracking number.",

      "p.choose": "Choose your size",
      "p.guide": "Size guide",
      "p.buy": "Buy",
      "btn.back": "Back",
      "p.pickFirst": "Pick",
      "p.soldOut": "Sold out",
      "p.secure": "Secure payment via Bold · we never store your card",
      "p.desc": "Description",
      "p.materials": "Materials & care",
      "p.shipping": "Shipping",
      "p.returns": "Returns & exchanges",
      "p.guideIntro": "Garment measurements in centimetres. Between two sizes? Take the larger one — the cut is loose.",
      "p.close": "Close",
      "p.notFound": "We couldn't find that product.",
      "p.also": "You may also like",

      "notify.open": "Notify me at the drop",
      "notify.title": "Notify me at the drop",
      "notify.sub": "We'll email you the moment it drops, AUG 15. No spam.",
      "notify.ph": "you@email.com",
      "notify.cta": "Notify me",
      "notify.sending": "Sending…",
      "notify.ok": "Done. We'll ping you at the drop ✓",
      "notify.invalid": "Check the email.",
      "notify.err": "Couldn't send. Try again.",

      "rec.open": "Your size?",
      "rec.title": "Find your size",
      "rec.sub": "Quick and approximate. The cut is loose; if unsure, size up.",
      "rec.height": "Height (cm)",
      "rec.weight": "Weight (kg)",
      "rec.fit": "How do you like it?",
      "rec.fit.slim": "Fitted",
      "rec.fit.reg": "Regular",
      "rec.fit.loose": "Loose",
      "rec.cta": "See my size",
      "rec.result": "We recommend",
      "rec.apply": "Use this size",
      "rec.incomplete": "Enter height and weight.",
      "rec.note": "An estimate; the cut is loose. Check the size guide to confirm.",

      "ship.title": "International shipping",
      "ship.sub": "Tell us where it's going.",
      "ship.country": "Country",
      "ship.pickCountry": "Choose your country",
      "ship.name": "Full name",
      "ship.addr": "Address",
      "ship.city": "City",
      "ship.state": "State / Region",
      "ship.zip": "Postal code",
      "ship.phone": "Phone",
      "ship.email": "Email",
      "ship.calc": "Get shipping",
      "ship.shippingLbl": "Shipping",
      "ship.totalLbl": "Total",
      "ship.pay": "Go to payment",
      "ship.incomplete": "Complete the fields.",
      "ship.unavailable": "We don't ship to that country yet.",
      "ship.err": "Couldn't get a quote. Try again.",
      "ship.soon": "International payment is being set up. Very soon.",

      "ty.eyebrow": "Order confirmed",
      "ty.title": "Thank you",
      "ty.sub": "Your order went through. A confirmation email is on its way.",
      "ty.n1": "Check your inbox (and your spam folder).",
      "ty.n2": "We prepare your order and send you the tracking number.",
      "ty.n3": "Something off? Message us on Instagram.",
      "ty.next": "What happens next",
      "ty.circle.label": "The Circle",
      "ty.circle.copy": "This isn't a mailing list. Early access and heads-ups before anyone else — only for those who've copped a drop.",
      "ty.circle.cta": "Enter the Circle",
      "ty.tag.label": "Get on the feed",
      "ty.tag.copy": "Post it with #SouthSide and tag us. We repost the drop crew.",
      "ty.tag.hash": "Copy #SouthSide",
      "ty.tag.copied": "Copied ✓",
      "ty.tag.cta": "Tag us",
      "nav.gallery": "Gallery",
      "nav.about": "About",
      "about.eyebrow": "About",
      "about.title": "The origin",
      "about.lead": "LVCK wasn't born in a store. It was born on the street, in the south, where clothes say more than words.",
      "about.s1.t": "How it started",
      "about.s1.p": "It started in [year], in [city], with one stubborn idea: make short runs — honest pieces that feel like yours. No factory, no investors — just a vision and hunger.",
      "about.s2.t": "The development",
      "about.s2.p": "From the first sketches to the first drops, every collection was an experiment. We learned by cutting, sewing, failing and coming back. The brand grew drop by drop, with the community as its mirror.",
      "about.s3.t": "Where we're going",
      "about.s3.p": "South Side is the next chapter — from Colombia to the world. Short production, strong identity, and one promise: when something sells out, it doesn't come back.",
      "about.close": "This isn't just clothing. It's where we come from.",
      "gallery.eyebrow": "Gallery",
      "gallery.title": "The archive",
      "gallery.lead": "A look at what we've made — garments, identity, process.",
      "gallery.cat1": "Garments",
      "gallery.cat2": "Identity",
      "gallery.cat3": "Process",
      "gallery.soon": "Archive in progress"
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
      "cur.title": "Escolha sua moeda",
      "cur.search": "Buscar moeda…",
      "cur.charged": "Preço de referência · a cobrança é feita em COP.",
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
      "shop.loadError": "Não conseguimos carregar o catálogo. Atualize a página ou volte em instantes.",

      "how.title": "Como comprar",
      "how.1.t": "Escolha seu tamanho",
      "how.1.d": "Veja as medidas antes de decidir. É o motivo número um de trocas.",
      "how.2.t": "Pague com segurança",
      "how.2.d": "O pagamento é processado pela Bold. Nunca vemos os dados do seu cartão.",
      "how.3.t": "Chega até você",
      "how.3.d": "Você recebe um e-mail de confirmação e depois o código de rastreio.",

      "p.choose": "Escolha seu tamanho",
      "p.guide": "Guia de tamanhos",
      "p.buy": "Comprar",
      "btn.back": "Voltar",
      "p.pickFirst": "Escolha",
      "p.soldOut": "Esgotado",
      "p.secure": "Pagamento seguro via Bold · não guardamos seu cartão",
      "p.desc": "Descrição",
      "p.materials": "Materiais e cuidados",
      "p.shipping": "Envios",
      "p.returns": "Trocas e devoluções",
      "p.guideIntro": "Medidas da peça em centímetros. Entre dois tamanhos? Pegue o maior — o corte é solto.",
      "p.close": "Fechar",
      "p.notFound": "Não encontramos esse produto.",
      "p.also": "Você também pode gostar",

      "notify.open": "Avise-me no drop",
      "notify.title": "Avise-me no drop",
      "notify.sub": "Mandamos um e-mail assim que cair, 15 AGO. Sem spam.",
      "notify.ph": "voce@email.com",
      "notify.cta": "Avise-me",
      "notify.sending": "Enviando…",
      "notify.ok": "Pronto. Avisamos no drop ✓",
      "notify.invalid": "Confira o e-mail.",
      "notify.err": "Não deu. Tente de novo.",

      "rec.open": "Seu tamanho?",
      "rec.title": "Ache seu tamanho",
      "rec.sub": "Rápido e aproximado. O corte é solto; na dúvida, suba um.",
      "rec.height": "Altura (cm)",
      "rec.weight": "Peso (kg)",
      "rec.fit": "Como você gosta?",
      "rec.fit.slim": "Ajustado",
      "rec.fit.reg": "Normal",
      "rec.fit.loose": "Solto",
      "rec.cta": "Ver meu tamanho",
      "rec.result": "Recomendamos",
      "rec.apply": "Usar este tamanho",
      "rec.incomplete": "Ponha altura e peso.",
      "rec.note": "Estimativa; o corte é solto. Veja o guia de medidas para confirmar.",

      "ship.title": "Envio internacional",
      "ship.sub": "Diga para onde enviamos.",
      "ship.country": "País",
      "ship.pickCountry": "Escolha seu país",
      "ship.name": "Nome completo",
      "ship.addr": "Endereço",
      "ship.city": "Cidade",
      "ship.state": "Estado / Região",
      "ship.zip": "CEP",
      "ship.phone": "Telefone",
      "ship.email": "E-mail",
      "ship.calc": "Calcular envio",
      "ship.shippingLbl": "Envio",
      "ship.totalLbl": "Total",
      "ship.pay": "Ir para o pagamento",
      "ship.incomplete": "Preencha os campos.",
      "ship.unavailable": "Ainda não enviamos para esse país.",
      "ship.err": "Não foi possível cotar. Tente de novo.",
      "ship.soon": "Pagamento internacional em configuração. Em breve.",

      "ty.eyebrow": "Pedido confirmado",
      "ty.title": "Obrigado",
      "ty.sub": "Seu pedido entrou. Um e-mail de confirmação está a caminho.",
      "ty.n1": "Confira seu e-mail (e a caixa de spam).",
      "ty.n2": "Preparamos seu pedido e enviamos o código de rastreio.",
      "ty.n3": "Algo errado? Fale com a gente no Instagram.",
      "ty.next": "O que acontece agora",
      "ty.circle.label": "O Círculo",
      "ty.circle.copy": "Isto não é uma lista de e-mails. Acesso e avisos antes de todos — só para quem já pegou um drop.",
      "ty.circle.cta": "Entrar no Círculo",
      "ty.tag.label": "Apareça no feed",
      "ty.tag.copy": "Poste com #SouthSide e marque a gente. Repostamos quem é do drop.",
      "ty.tag.hash": "Copiar #SouthSide",
      "ty.tag.copied": "Copiado ✓",
      "ty.tag.cta": "Marque a gente",
      "nav.gallery": "Galeria",
      "nav.about": "Sobre",
      "about.eyebrow": "Sobre nós",
      "about.title": "A origem",
      "about.lead": "A LVCK não nasceu numa loja. Nasceu na rua, no sul, onde a roupa diz mais que as palavras.",
      "about.s1.t": "Como começou",
      "about.s1.p": "Começou em [ano], em [cidade], com uma ideia simples e teimosa: fazer peças curtas, honestas, que sintam suas. Sem fábrica, sem investidores — só visão e vontade.",
      "about.s2.t": "O desenvolvimento",
      "about.s2.p": "Dos primeiros rascunhos aos primeiros drops, cada coleção foi um experimento. Aprendemos cortando, costurando, errando e voltando. A marca cresceu drop a drop, com a comunidade como espelho.",
      "about.s3.t": "Para onde vamos",
      "about.s3.p": "South Side é o próximo capítulo — da Colômbia para o mundo. Produção curta, identidade forte, e uma promessa: quando algo esgota, não volta.",
      "about.close": "Isto não é só roupa. É de onde viemos.",
      "gallery.eyebrow": "Galeria",
      "gallery.title": "O arquivo",
      "gallery.lead": "Um olhar sobre o que criamos — peças, identidade, processo.",
      "gallery.cat1": "Peças",
      "gallery.cat2": "Identidade",
      "gallery.cat3": "Processo",
      "gallery.soon": "Arquivo em construção"
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

  /* ---------- country/currency selection + conversion ---------- */
  var DEFAULT_COUNTRY = COUNTRY_BY_CC.CO;   // Colombia (home)
  function getSelectedCountry() {
    var saved = store(CUR_COUNTRY_KEY);
    if (saved && COUNTRY_BY_CC[saved.toUpperCase()]) return COUNTRY_BY_CC[saved.toUpperCase()];
    // not chosen yet: use the detected country if we have a match, else home
    var detected = store(COUNTRY_KEY);
    if (detected && COUNTRY_BY_CC[detected.toUpperCase()]) return COUNTRY_BY_CC[detected.toUpperCase()];
    return DEFAULT_COUNTRY;
  }
  function getCurrency() { return getSelectedCountry().cur; }
  function curSym(cur) { return CUR_SYM[cur] || ""; }
  function countryLabel(co) {
    var sym = curSym(co.cur);
    return co.n + " (" + co.cur + (sym ? " " + sym : "") + ")";
  }
  function flagUrl(cc) { return "https://flagcdn.com/" + cc + ".svg"; }

  function setCountry(cc) {
    var co = COUNTRY_BY_CC[String(cc).toUpperCase()];
    if (!co) return;
    store(CUR_COUNTRY_KEY, co.c.toUpperCase());
    updateCurrencyControl();
    global.dispatchEvent(new CustomEvent("lvck:currency", { detail: { currency: co.cur, country: co.c } }));
  }

  // charm-price a converted amount to a retail 9-ending, per the currency's scale:
  //   2-decimal currencies (USD/EUR/MXN…) -> nearest integer, then .99  (66.99)
  //   0-decimal currencies (JPY/CLP/KRW…) -> nearest step, then trailing 9 (10.199)
  // Returns { value, dp } so the formatter uses the right decimal count.
  function charmPrice(amount, cur, loc) {
    var dp;
    try { dp = new Intl.NumberFormat(loc, { style: "currency", currency: cur }).resolvedOptions().maximumFractionDigits; }
    catch (e) { dp = 2; }
    if (dp >= 2) {
      return { value: Math.max(0.99, Math.round(amount) - 0.01), dp: 2 };   // …N.99
    }
    var step = amount >= 100000 ? 1000 : amount >= 1000 ? 100 : 10;
    return { value: Math.max(step - 1, Math.round(amount / step) * step - 1), dp: 0 };  // …9
  }

  // The reference price shown to the visitor. Home currency (COP) prints EXACT
  // (that's the real charge). Any other currency prints a charm-rounded figure
  // (retail 9-ending) so a shopper abroad reads a familiar, tidy price. The real
  // charge stays COP/USD — stated separately (cur.charged note) so the pretty
  // number is never mistaken for the exact charge.
  function money(cop, lang) {
    var cur = getCurrency();
    var loc = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-CO";
    if (cur === HOME_CURRENCY || !fxRates || !fxRates[cur]) {
      return "$" + Number(cop).toLocaleString(loc) + " COP";
    }
    var amount = Number(cop) * Number(fxRates[cur]);
    var c = charmPrice(amount, cur, loc);
    try {
      return new Intl.NumberFormat(loc, {
        style: "currency", currency: cur,
        minimumFractionDigits: c.dp, maximumFractionDigits: c.dp
      }).format(c.value);
    } catch (e) {
      return c.value.toLocaleString(loc) + " " + cur;
    }
  }

  // Load live rates once; cache in sessionStorage for the session. Falls back to
  // the public API if our function is unreachable; leaves fxRates null on total
  // failure (money() then shows COP). Calls back so callers can re-render prices.
  function loadRates(done) {
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("ss-rates") || "null"); } catch (e) {}
    if (cached && cached.rates) { fxRates = cached.rates; if (done) done(); return; }

    function ok(rates) {
      if (rates) {
        fxRates = rates;
        try { sessionStorage.setItem("ss-rates", JSON.stringify({ rates: rates })); } catch (e) {}
      }
      if (done) done();
    }
    fetch("/api/rates")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.rates) return ok(j.rates);
        // fallback: hit the public API straight from the client
        return fetch("https://open.er-api.com/v6/latest/COP")
          .then(function (r) { return r.json(); })
          .then(function (j2) { ok(j2 && j2.rates ? j2.rates : null); });
      })
      .catch(function () {
        fetch("https://open.er-api.com/v6/latest/COP")
          .then(function (r) { return r.json(); })
          .then(function (j2) { ok(j2 && j2.rates ? j2.rates : null); })
          .catch(function () { if (done) done(); });
      });
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

  /* ---------- country/currency picker (footer dropdown, Shopify-style) ----------
     Lives in the footer, not a popup: a trigger showing "flag Country (CUR sym)"
     and a small menu that slides UP with a searchable list of countries, each with
     a real flag from flagcdn.com. Picking one sets the reference currency. */
  function flagImg(cc, cls) {
    return '<img class="' + (cls || "cur-flag") + '" src="' + flagUrl(cc) + '" alt="" ' +
      'loading="lazy" width="22" height="16" onerror="this.style.visibility=\'hidden\'">';
  }
  function curRowsHtml() {
    return COUNTRIES.map(function (co) {
      return '<button class="cur-btn" type="button" data-set-cur="' + co.c + '">' +
        flagImg(co.c) +
        '<span class="cur-name">' + countryLabel(co) + '</span>' +
      '</button>';
    }).join("");
  }

  // Built once into every page's footer (so no per-page markup edits).
  function initCurrencyControl() {
    var foot = document.querySelector(".site-foot");
    if (!foot || document.getElementById("cur-select")) return;
    var wrap = document.createElement("div");
    wrap.className = "cur-select";
    wrap.id = "cur-select";
    wrap.innerHTML =
      '<button class="cur-trigger" type="button" data-open-currency aria-haspopup="listbox" aria-expanded="false"></button>' +
      '<div class="cur-pop" role="listbox">' +
        '<input class="cur-search" type="text" data-i18n-attr="placeholder:cur.search" aria-label="Buscar">' +
        '<div class="cur-list">' + curRowsHtml() + '</div>' +
      '</div>';
    foot.appendChild(wrap);
    applyI18n(wrap);
    var search = wrap.querySelector(".cur-search");
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      wrap.querySelectorAll(".cur-btn").forEach(function (b) {
        b.style.display = b.textContent.toLowerCase().indexOf(q) === -1 ? "none" : "";
      });
    });
    updateCurrencyControl();
  }
  function updateCurrencyControl() {
    var wrap = document.getElementById("cur-select");
    if (!wrap) return;
    var co = getSelectedCountry();
    wrap.querySelector(".cur-trigger").innerHTML =
      flagImg(co.c, "cur-flag") +
      '<span class="cur-trig-label">' + countryLabel(co) + '</span>' +
      '<svg class="cur-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrap.querySelectorAll(".cur-btn").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-set-cur") === co.c);
    });
  }
  function currencyOpen() {
    var w = document.getElementById("cur-select");
    return w && w.classList.contains("open");
  }
  function openCurrencyMenu() {
    var wrap = document.getElementById("cur-select");
    if (!wrap) return;
    var s = wrap.querySelector(".cur-search");
    if (s) s.value = "";
    wrap.querySelectorAll(".cur-btn").forEach(function (b) { b.style.display = ""; });
    wrap.classList.add("open");
    wrap.querySelector(".cur-trigger").setAttribute("aria-expanded", "true");
    var on = wrap.querySelector(".cur-btn.on"); if (on) on.scrollIntoView({ block: "center" });
    if (s) setTimeout(function () { s.focus(); }, 40);
  }
  function closeCurrencyMenu() {
    var wrap = document.getElementById("cur-select");
    if (!wrap) return;
    wrap.classList.remove("open");
    var t = wrap.querySelector(".cur-trigger"); if (t) t.setAttribute("aria-expanded", "false");
  }
  function toggleCurrencyMenu() { currencyOpen() ? closeCurrencyMenu() : openCurrencyMenu(); }

  document.addEventListener("click", function (e) {
    var setter = e.target.closest && e.target.closest("[data-set-cur]");
    if (setter) { setCountry(setter.getAttribute("data-set-cur")); closeCurrencyMenu(); return; }
    if (e.target.closest && e.target.closest("[data-open-currency]")) { toggleCurrencyMenu(); return; }
    // click anywhere outside the open menu closes it
    if (currencyOpen() && !(e.target.closest && e.target.closest("#cur-select"))) closeCurrencyMenu();
  });

  /* ---------- futuristic nav overlay (hamburger) ----------
     The left-hand word nav moved into a full-screen overlay built once here and
     reused on every storefront page. It sits UNDER the sticky header (z-index),
     so the hamburger — which morphs into an X — stays clickable to close it. */
  function buildNavOverlay() {
    var existing = document.getElementById("nav-overlay");
    if (existing) return existing;
    var o = document.createElement("div");
    o.className = "nav-overlay";
    o.id = "nav-overlay";
    o.innerHTML =
      '<nav class="nav-list" aria-label="Menu">' +
        '<a href="shop.html" data-i18n="nav.shop">Tienda</a>' +
        '<a href="gallery.html" data-i18n="nav.gallery">Galería</a>' +
        '<a href="about.html" data-i18n="nav.about">Nosotros</a>' +
      '</nav>' +
      '<div class="nav-meta">' +
        '<span data-i18n="foot.brand">LVCK · South Side</span>' +
        '<span class="dot">/</span>' +
        '<a href="social-instagram.html">Instagram</a>' +
        '<span class="dot">/</span>' +
        '<span>Est. Bogotá · CO</span>' +
      '</div>';
    document.body.appendChild(o);
    var here = (location.pathname.split("/").pop() || "shop.html").toLowerCase();
    o.querySelectorAll(".nav-list a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      if (href === here || (here === "" && href === "shop.html")) a.setAttribute("aria-current", "page");
    });
    applyI18n(o);
    return o;
  }
  function menuBtn() { return document.querySelector("[data-open-menu]"); }
  function openMenu() {
    var o = buildNavOverlay();
    document.documentElement.classList.add("menu-open");
    void o.offsetWidth;                 // restart the staggered entrance each open
    o.classList.add("open");
    var b = menuBtn(); if (b) b.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    var o = document.getElementById("nav-overlay");
    if (o) o.classList.remove("open");
    document.documentElement.classList.remove("menu-open");
    var b = menuBtn(); if (b) b.setAttribute("aria-expanded", "false");
  }
  function toggleMenu() {
    if (document.documentElement.classList.contains("menu-open")) closeMenu(); else openMenu();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-open-menu]")) { e.preventDefault(); toggleMenu(); return; }
    if (e.target.closest && e.target.closest(".nav-list a")) { closeMenu(); return; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeMenu(); closeLangModal(); closeNotify(); closeCurrencyMenu(); }
  });

  /* ---------- drop notify (email) ----------
     A shared glass modal that drops an email into the same MailerLite list the
     landing uses (/api/subscribe). Built lazily and self-healing on every page,
     opened from any [data-open-notify] trigger. This is the "email now" half of
     the drop alert; a Web Push layer can sit on top later. */
  function buildNotifyModal() {
    var m = document.getElementById("notify-modal");
    if (m) return m;
    m = document.createElement("div");
    m.className = "lang-modal notify-modal";
    m.id = "notify-modal";
    m.innerHTML =
      '<div class="panel">' +
        '<div class="eyebrow" data-i18n="notify.title">Avísame en el drop</div>' +
        '<p class="notify-sub" data-i18n="notify.sub"></p>' +
        '<form class="notify-form" novalidate>' +
          '<input class="notify-input" type="email" inputmode="email" autocomplete="email" required>' +
          '<button class="lang-btn notify-send" type="submit" data-i18n="notify.cta">Avísame</button>' +
        '</form>' +
        '<div class="notify-msg" role="status" aria-live="polite"></div>' +
        '<button class="ig-close" type="button" data-close-notify data-i18n="p.close">Cerrar</button>' +
      '</div>';
    document.body.appendChild(m);
    m.querySelector(".notify-input").setAttribute("placeholder", t("notify.ph"));
    applyI18n(m);
    m.querySelector(".notify-form").addEventListener("submit", submitNotify);
    return m;
  }
  function openNotify() {
    var m = buildNotifyModal();
    m.querySelector(".notify-msg").textContent = "";
    m.classList.add("open");
    setTimeout(function () { var i = m.querySelector(".notify-input"); if (i) i.focus(); }, 60);
  }
  function closeNotify() { var m = document.getElementById("notify-modal"); if (m) m.classList.remove("open"); }

  var notifySending = false;
  function submitNotify(e) {
    e.preventDefault();
    if (notifySending) return;
    var m = document.getElementById("notify-modal");
    var input = m.querySelector(".notify-input");
    var msg = m.querySelector(".notify-msg");
    var email = (input.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = t("notify.invalid"); return; }
    notifySending = true;
    msg.textContent = t("notify.sending");
    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, lang: getLang() || "es", source: "storefront" })
    }).then(function (r) {
      notifySending = false;
      if (r.ok) { msg.textContent = t("notify.ok"); input.value = ""; setTimeout(closeNotify, 1600); }
      else msg.textContent = t("notify.err");
    }).catch(function () { notifySending = false; msg.textContent = t("notify.err"); });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-open-notify]")) { e.preventDefault(); openNotify(); return; }
    if (e.target.closest && e.target.closest("[data-close-notify]")) { closeNotify(); return; }
    if (e.target.id === "notify-modal") closeNotify();
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
    initCurrencyControl();
    // fetch live rates, then re-render any prices already on the page
    loadRates(function () {
      updateCurrencyControl();
      global.dispatchEvent(new CustomEvent("lvck:currency", { detail: { currency: getCurrency() } }));
    });
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
    openNotify: openNotify, closeNotify: closeNotify,
    openMenu: openMenu, closeMenu: closeMenu,
    getCurrency: getCurrency, setCountry: setCountry, getSelectedCountry: getSelectedCountry,
    openCurrencyMenu: openCurrencyMenu,
    getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme
  };
})(window);
