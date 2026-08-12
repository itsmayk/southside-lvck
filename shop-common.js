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

  /* ---------- currency picker (Shopify-style) ----------
     Prices are defined in USD (BASE_CURRENCY). The visitor picks a COUNTRY and
     prices show in that country's currency. USD prints exact (the base); COP is
     the Colombian charge (Bold), converted from USD and rounded to a clean 5/9
     thousands value; every other currency is a charm-rounded reference. Real
     flags come from flagcdn.com. Rates come live from /api/rates (base USD). */
  var BASE_CURRENCY = "USD";
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
      "cur.charged": "Precio de referencia · el cobro se hace en USD (o COP en Colombia).",
      "test.notice": "Modo prueba · ningún pago es real todavía",
      "drop.label": "Lanzamiento",
      "drop.date": "26 AGO 2026",
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
      "notify.sub": "Te escribimos apenas caiga, el 26 AGO. Nada de spam.",
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

      "dom.title": "Datos de envío",
      "dom.sub": "Solo lo básico para despachar. Confirmamos tu dirección exacta por WhatsApp antes de enviar.",
      "dom.whatsapp": "WhatsApp",
      "dom.product": "Producto",
      "dom.incomplete": "Completa nombre, ciudad y WhatsApp.",
      "dom.note": "Te escribimos por WhatsApp para confirmar la dirección exacta.",
      "prod.ship.eta": "3–8 días hábiles",
      "prod.ship.calc": "Envío calculado al finalizar la compra",

      "cart.title": "Tu carrito",
      "cart.open": "Abrir el carrito",
      "cart.empty": "Tu carrito está vacío.",
      "cart.shop": "Ver la tienda",
      "cart.add": "Agregar",
      "cart.added": "Agregado ✓",
      "cart.remove": "Quitar",
      "cart.subtotal": "Subtotal",
      "cart.checkout": "Finalizar compra",
      "cart.paynote": "Pago seguro con Bold · los datos de envío se piden después de pagar.",
      "cart.soon": "El pago se activa en el lanzamiento. Muy pronto.",
      "cart.soldout": "Una talla se agotó. La quitamos del carrito.",
      "cart.err": "No se pudo iniciar el pago. Intenta de nuevo.",

      "set.title": "Completa el set",
      "set.add": "Agregar el set",
      "set.addPartner": "Agregar",
      "set.discountLbl": "Descuento del set",
      "set.priceLbl": "Set",
      "set.save": "Ahorra",
      "set.complete": "Set completo",
      "set.pickPartnerSize": "Elige la talla",
      "cart.setNudge": "Completa tu set",

      "ty.eyebrow": "Pedido confirmado",
      "ty.title": "Gracias",
      "ty.sub": "Tu pedido entró. Te llega un correo con la confirmación en unos minutos.",
      "ty.n1": "Revisa tu correo (mira también en spam).",
      "ty.n2": "Preparamos tu pedido y te enviamos el número de guía.",
      "ty.n3": "¿Algo no cuadra? Escríbenos por Instagram.",
      "ty.ship.title": "Envío",
      "ty.ship.pending": "Estamos preparando tu pedido. Te enviamos el número de guía apenas se despache.",
      "ty.ship.shipped": "Tu pedido va en camino",
      "ty.ship.track": "Rastrear envío",
      "ty.ship.formSub": "Completa tus datos de envío para despachar tu pedido.",
      "ty.ship.fName": "Nombres",
      "ty.ship.fPhone": "Celular",
      "ty.ship.fEmail": "Email",
      "ty.ship.fAddr": "Dirección",
      "ty.ship.fZip": "Código postal",
      "ty.ship.fCity": "Ciudad / País",
      "ty.ship.save": "Guardar datos de envío",
      "ty.ship.saved": "¡Listo! Recibimos tus datos de envío.",
      "ty.ship.saveErr": "No se pudo guardar. Intenta de nuevo.",
      "ty.ship.invalidEmail": "Revisa el correo.",
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
      "cur.charged": "Reference price · you are charged in USD (or COP in Colombia).",
      "test.notice": "Test mode · no payment is real yet",
      "drop.label": "Drop",
      "drop.date": "26 AUG 2026",
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
      "notify.sub": "We'll email you the moment it drops, AUG 26. No spam.",
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

      "dom.title": "Shipping details",
      "dom.sub": "Just the basics to ship. We'll confirm your exact address over WhatsApp before sending.",
      "dom.whatsapp": "WhatsApp",
      "dom.product": "Product",
      "dom.incomplete": "Fill in name, city and WhatsApp.",
      "dom.note": "We'll message you on WhatsApp to confirm the exact address.",
      "prod.ship.eta": "3–8 business days",
      "prod.ship.calc": "Shipping calculated at checkout",

      "cart.title": "Your cart",
      "cart.open": "Open cart",
      "cart.empty": "Your cart is empty.",
      "cart.shop": "Browse the shop",
      "cart.add": "Add",
      "cart.added": "Added ✓",
      "cart.remove": "Remove",
      "cart.subtotal": "Subtotal",
      "cart.checkout": "Checkout",
      "cart.paynote": "Secure Bold payment · shipping details are asked after you pay.",
      "cart.soon": "Checkout goes live at the drop. Very soon.",
      "cart.soldout": "A size just sold out. We removed it from your cart.",
      "cart.err": "Couldn't start the payment. Try again.",

      "set.title": "Complete the set",
      "set.add": "Add the set",
      "set.addPartner": "Add",
      "set.discountLbl": "Set discount",
      "set.priceLbl": "Set",
      "set.save": "Save",
      "set.complete": "Set complete",
      "set.pickPartnerSize": "Pick a size",
      "cart.setNudge": "Complete your set",

      "ty.eyebrow": "Order confirmed",
      "ty.title": "Thank you",
      "ty.sub": "Your order went through. A confirmation email is on its way.",
      "ty.n1": "Check your inbox (and your spam folder).",
      "ty.n2": "We prepare your order and send you the tracking number.",
      "ty.n3": "Something off? Message us on Instagram.",
      "ty.ship.title": "Shipping",
      "ty.ship.pending": "We're preparing your order. We'll send the tracking number as soon as it ships.",
      "ty.ship.shipped": "Your order is on the way",
      "ty.ship.track": "Track shipment",
      "ty.ship.formSub": "Complete your shipping details so we can dispatch your order.",
      "ty.ship.fName": "Full name",
      "ty.ship.fPhone": "Mobile number",
      "ty.ship.fEmail": "Email",
      "ty.ship.fAddr": "Address",
      "ty.ship.fZip": "Postal code",
      "ty.ship.fCity": "City / Country",
      "ty.ship.save": "Save shipping details",
      "ty.ship.saved": "Done! We've got your shipping details.",
      "ty.ship.saveErr": "Couldn't save. Try again.",
      "ty.ship.invalidEmail": "Check the email.",
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
      "cur.charged": "Preço de referência · a cobrança é feita em USD (ou COP na Colômbia).",
      "test.notice": "Modo teste · nenhum pagamento é real ainda",
      "drop.label": "Lançamento",
      "drop.date": "26 AGO 2026",
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
      "notify.sub": "Mandamos um e-mail assim que cair, 26 AGO. Sem spam.",
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

      "dom.title": "Dados de envio",
      "dom.sub": "Só o básico para despachar. Confirmamos seu endereço exato por WhatsApp antes de enviar.",
      "dom.whatsapp": "WhatsApp",
      "dom.product": "Produto",
      "dom.incomplete": "Preencha nome, cidade e WhatsApp.",
      "dom.note": "Vamos te chamar no WhatsApp para confirmar o endereço exato.",
      "prod.ship.eta": "3–8 dias úteis",
      "prod.ship.calc": "Frete calculado no checkout",

      "cart.title": "Seu carrinho",
      "cart.open": "Abrir o carrinho",
      "cart.empty": "Seu carrinho está vazio.",
      "cart.shop": "Ver a loja",
      "cart.add": "Adicionar",
      "cart.added": "Adicionado ✓",
      "cart.remove": "Remover",
      "cart.subtotal": "Subtotal",
      "cart.checkout": "Finalizar compra",
      "cart.paynote": "Pagamento seguro Bold · os dados de envio são pedidos após o pagamento.",
      "cart.soon": "O pagamento abre no lançamento. Em breve.",
      "cart.soldout": "Um tamanho esgotou. Removemos do carrinho.",
      "cart.err": "Não foi possível iniciar o pagamento. Tente de novo.",

      "set.title": "Complete o conjunto",
      "set.add": "Adicionar o conjunto",
      "set.addPartner": "Adicionar",
      "set.discountLbl": "Desconto do conjunto",
      "set.priceLbl": "Conjunto",
      "set.save": "Economize",
      "set.complete": "Conjunto completo",
      "set.pickPartnerSize": "Escolha o tamanho",
      "cart.setNudge": "Complete seu conjunto",

      "ty.eyebrow": "Pedido confirmado",
      "ty.title": "Obrigado",
      "ty.sub": "Seu pedido entrou. Um e-mail de confirmação está a caminho.",
      "ty.n1": "Confira seu e-mail (e a caixa de spam).",
      "ty.n2": "Preparamos seu pedido e enviamos o código de rastreio.",
      "ty.n3": "Algo errado? Fale com a gente no Instagram.",
      "ty.ship.title": "Envio",
      "ty.ship.pending": "Estamos preparando seu pedido. Enviamos o código de rastreio assim que despachar.",
      "ty.ship.shipped": "Seu pedido está a caminho",
      "ty.ship.track": "Rastrear envio",
      "ty.ship.formSub": "Complete seus dados de envio para despacharmos seu pedido.",
      "ty.ship.fName": "Nome completo",
      "ty.ship.fPhone": "Celular",
      "ty.ship.fEmail": "E-mail",
      "ty.ship.fAddr": "Endereço",
      "ty.ship.fZip": "CEP",
      "ty.ship.fCity": "Cidade / País",
      "ty.ship.save": "Salvar dados de envio",
      "ty.ship.saved": "Pronto! Recebemos seus dados de envio.",
      "ty.ship.saveErr": "Não foi possível salvar. Tente de novo.",
      "ty.ship.invalidEmail": "Confira o e-mail.",
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

  // Colombia's COP charge: nearest thousands value ending in 5 or 9, ties -> 5
  // (356000 -> 355000, 358000 -> 359000, 362000 -> 365000). Mirrors lib/fx.js so
  // what a Colombian sees is exactly what Bold charges.
  function roundCOP59(cop) {
    var T = Math.round(cop / 1000);
    var d = Math.floor(T / 10) * 10;
    var cands = [d - 1, d + 5, d + 9, d + 15];
    var best = cands[0], bestDist = Infinity;
    for (var i = 0; i < cands.length; i++) {
      var dist = Math.abs(cands[i] - T);
      if (dist < bestDist - 1e-9 || (Math.abs(dist - bestDist) < 1e-9 && cands[i] % 10 === 5)) {
        best = cands[i]; bestDist = dist;
      }
    }
    return Math.max(0, best) * 1000;
  }

  // Format a value in a currency, showing only the symbol + digits (no letter
  // code): narrowSymbol gives "$89.00" / "€81,99" / "¥13.399", never "US$"/"MXN"/
  // "EUR". Falls back to symbol+number if the engine lacks narrowSymbol.
  function fmtMoney(value, cur, dp, loc) {
    try {
      return new Intl.NumberFormat(loc, {
        style: "currency", currency: cur, currencyDisplay: "narrowSymbol",
        minimumFractionDigits: dp, maximumFractionDigits: dp
      }).format(value);
    } catch (e) {
      var sym = CUR_SYM[cur] || "";
      return sym + value.toLocaleString(loc, { minimumFractionDigits: dp, maximumFractionDigits: dp });
    }
  }

  // The price shown to the visitor. Takes a USD amount (prices are USD-based).
  //   USD  -> exact, 2 decimals ($89.00), it's the base
  //   COP  -> converted, rounded to a clean 5/9 thousands (Colombia's Bold charge)
  //   else -> converted, charm-rounded (retail 9-ending) reference
  // Before rates load (or for an unknown currency) it falls back to the USD price.
  function money(usd, lang) {
    var cur = getCurrency();
    var loc = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-CO";
    var u = Number(usd);

    if (cur === BASE_CURRENCY || !fxRates || !fxRates[cur]) return fmtMoney(u, "USD", 2, loc);

    var amount = u * Number(fxRates[cur]);
    if (cur === "COP") return fmtMoney(roundCOP59(amount), "COP", 0, loc);
    var c = charmPrice(amount, cur, loc);
    return fmtMoney(c.value, cur, c.dp, loc);
  }

  // COP helpers for the Colombia checkout (the real Bold charge is always COP,
  // regardless of the currency the visitor is browsing in).
  //   copFromUsd(usd) -> the rounded 5/9 COP integer, or null before rates load
  //   fmtCOP(cop)     -> that integer formatted as "$355.000" (symbol + digits)
  function copFromUsd(usd) {
    var rate = fxRates && fxRates.COP;
    if (!rate) return null;
    return roundCOP59(Number(usd) * Number(rate));
  }
  function fmtCOP(cop, lang) {
    var loc = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-CO";
    return fmtMoney(Number(cop) || 0, "COP", 0, loc);
  }

  // Load live rates once; cache in sessionStorage for the session. Falls back to
  // the public API if our function is unreachable; leaves fxRates null on total
  // failure (money() then shows COP). Calls back so callers can re-render prices.
  function loadRates(done) {
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem("ss-rates-usd") || "null"); } catch (e) {}
    if (cached && cached.rates) { fxRates = cached.rates; if (done) done(); return; }

    function ok(rates) {
      if (rates) {
        fxRates = rates;
        try { sessionStorage.setItem("ss-rates-usd", JSON.stringify({ rates: rates })); } catch (e) {}
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

  // language -> the flag (flagcdn ISO2) that stands for it: Spain, US, Brazil
  var LANG_FLAG = { es: "es", en: "us", pt: "br" };
  var LANG_CODE = { es: "ES", en: "EN", pt: "PT" };   // short label beside the flag

  function buildLangModal() {
    var modal = document.createElement("div");
    modal.className = "lang-modal";
    modal.id = "lang-modal";
    modal.innerHTML =
      '<div class="panel">' +
        '<div class="eyebrow">Language · Idioma</div>' +
        '<button class="lang-btn" data-set-lang="es">' + flagImg("es", "lang-opt-flag") + '<span>Español</span></button>' +
        '<button class="lang-btn" data-set-lang="en">' + flagImg("us", "lang-opt-flag") + '<span>English</span></button>' +
        '<button class="lang-btn" data-set-lang="pt">' + flagImg("br", "lang-opt-flag") + '<span>Português</span></button>' +
      '</div>';
    document.body.appendChild(modal);
    return modal;
  }

  // Render the header trigger as a little selector: the current language's flag +
  // its code (ES/EN/PT) + a chevron. Runs on boot and on every language change.
  function updateLangTrigger() {
    var lang = getLang() || "es";
    var cc = LANG_FLAG[lang] || "es";
    var code = LANG_CODE[lang] || "ES";
    var label = t("nav.lang");
    document.querySelectorAll("[data-open-lang]").forEach(function (btn) {
      btn.innerHTML = flagImg(cc, "lang-flag") +
        '<span class="lang-code">' + code + '</span>' +
        '<svg class="lang-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
  }
  global.addEventListener("lvck:lang", updateLangTrigger);

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

  // Re-sync the currency when a page that was built earlier is (re)shown with a
  // possibly newer choice: a Speculation-Rules PRERENDER activates (it was built
  // with whatever currency was picked at prerender time), or a bfcache restore.
  // Without this, opening a prerendered product shows the old currency even after
  // you switched. getSelectedCountry() reads localStorage live, so re-emitting
  // lvck:currency re-renders every price with the current choice.
  function syncCurrency() {
    updateCurrencyControl();
    global.dispatchEvent(new CustomEvent("lvck:currency", { detail: { currency: getCurrency() } }));
  }
  document.addEventListener("prerenderingchange", syncCurrency);
  global.addEventListener("pageshow", function (e) { if (e.persisted) syncCurrency(); });

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
    if (e.key === "Escape") { closeMenu(); closeLangModal(); closeNotify(); closeCurrencyMenu(); closeCart(); closeSetSheet(); }
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

  // same instant the landing page counts to: midnight in Colombia, 20 Aug 2026
  var DROP_AT = new Date("2026-08-26T00:00:00-05:00").getTime();

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

  /* ---------- shopping cart ----------
     A cart that lives in localStorage and a glass drawer injected into every
     page (like the currency picker), so you can add several pieces across the
     catalog and check out once. Bold takes a single total, so the whole cart
     becomes ONE payment; the short Colombia step (name + city + WhatsApp) is
     collected inside the drawer before minting the link.

     A line is { product, size, name, sizeLabel }. Prices are NOT stored — they
     are resolved live from shop-config.json at render time, so a launch/
     post-launch price flip is always reflected and nothing goes stale. */
  var CART_KEY = "ss-cart";
  var cartCfg = null, cartCfgP = null;          // shop-config.json (products, postLaunch)
  var cartShip = null, cartShipP = null;        // shipping-config.json
  var cartShipLoaded = false;                   // its fetch has settled (null = none)
  var cartPaying = false;

  function cartRead() {
    try { var v = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function cartSave(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    updateCartCount();
    global.dispatchEvent(new CustomEvent("lvck:cart", { detail: { count: items.length } }));
  }
  function cartCount() { return cartRead().length; }
  function cartItems() { return cartRead(); }

  // Each product+size is a single line (a limited drop has no quantities); adding
  // one that's already in the cart just re-opens the drawer instead of duplicating.
  function cartAdd(item) {
    if (!item || !item.product || !item.size) return false;
    var items = cartRead();
    var dup = items.some(function (i) { return i.product === item.product && i.size === item.size; });
    if (!dup) {
      items.push({
        product: item.product, size: item.size,
        name: item.name || null, sizeLabel: item.sizeLabel || item.size
      });
      cartSave(items);
    }
    return !dup;
  }
  function cartRemove(idx) {
    var items = cartRead();
    if (idx < 0 || idx >= items.length) return;
    items.splice(idx, 1);
    cartSave(items);
    renderCart();
  }
  function cartClear() { cartSave([]); }

  function loadShopCfg() {
    if (cartCfgP) return cartCfgP;
    cartCfgP = fetch("shop-config.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) { cartCfg = c || { products: [] }; return cartCfg; })
      .catch(function () { cartCfg = { products: [] }; return cartCfg; });
    return cartCfgP;
  }
  function loadCartShip() {
    if (cartShipP) return cartShipP;
    cartShipP = fetch("shipping-config.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) { cartShip = c; cartShipLoaded = true; return c; })
      .catch(function () { cartShip = null; cartShipLoaded = true; return null; });
    return cartShipP;
  }

  function cartProduct(slug) {
    var ps = (cartCfg && cartCfg.products) || [];
    for (var i = 0; i < ps.length; i++) if (ps[i].slug === slug) return ps[i];
    return null;
  }
  function cartActiveUsd(p) { return (cartCfg && cartCfg.postLaunch) ? p.priceUSDPost : p.priceUSD; }
  function cartNameOf(p, lang) { var n = p.name; return (n && typeof n === "object") ? (n[lang] || n.es) : n; }

  // Shipping for the selected country — mirrors producto.html's shipCostFor, but
  // reduced to the numbers the cart needs (one shipment per order). CO -> flat COP;
  // a zone country -> that zone's flat USD; otherwise unserved (calculated later).
  function cartZoneFor(cc) {
    var zones = (cartShip && cartShip.zones) || {};
    for (var k in zones) {
      if (!Object.prototype.hasOwnProperty.call(zones, k)) continue;
      if ((zones[k].countries || []).indexOf(cc) !== -1) return zones[k];
    }
    return null;
  }
  function cartShipCost(cc) {
    if (!cartShip) return { served: false };
    cc = String(cc || "CO").toUpperCase();
    if (cc === "CO") return { served: true, kind: "CO", shipCOP: Number(cartShip.domestic && cartShip.domestic.flatCOP) || 0 };
    var z = cartZoneFor(cc);
    if (z && z.flatUSD != null) return { served: true, kind: "USD", shipUSD: Number(z.flatUSD) };
    return { served: false };
  }

  /* ---------- sets (jacket + jean of one colorway) ----------
     A set is defined in shop-config.json (`sets`); when both members are in the
     cart it earns `setDiscountPct`. The discount is computed here for the drawer
     AND recomputed identically in api/checkout.js, so what Bold charges matches. */
  function setDefs() { return (cartCfg && cartCfg.sets) || []; }
  function setDiscountPct() { return Number(cartCfg && cartCfg.setDiscountPct) || 0; }
  function setDefFor(slug) {
    var defs = setDefs();
    for (var i = 0; i < defs.length; i++) if ((defs[i].members || []).indexOf(slug) !== -1) return defs[i];
    return null;
  }
  function setPartnerSlug(slug) {
    var d = setDefFor(slug);
    if (!d) return null;
    var m = d.members || [];
    for (var i = 0; i < m.length; i++) if (m[i] !== slug) return m[i];
    return null;
  }
  // Walk the sets against the cart. A set is complete when every member has ≥1
  // line; k = min(member line counts). Discount = k · pct% of the members' prices.
  // Also flags "half" sets (one member present, the other missing) for the nudge.
  function cartSetSummary() {
    var out = { completeCount: 0, discountUSD: 0, discountCOP: 0, halfSets: [] };
    if (!cartCfg) return out;
    var pct = setDiscountPct();
    if (!pct) return out;
    var counts = {};
    cartRead().forEach(function (it) { counts[it.product] = (counts[it.product] || 0) + 1; });
    setDefs().forEach(function (def) {
      var m = def.members || [];
      if (m.length < 2) return;
      var cA = counts[m[0]] || 0, cB = counts[m[1]] || 0;
      var k = Math.min(cA, cB);
      if (k > 0) {
        var pa = cartProduct(m[0]), pb = cartProduct(m[1]);
        if (pa && pb) {
          var ua = Number(cartActiveUsd(pa)) || 0, ub = Number(cartActiveUsd(pb)) || 0;
          out.completeCount += k;
          out.discountUSD += k * Math.round(pct / 100 * (ua + ub));
          var ca = copFromUsd(ua), cb = copFromUsd(ub);
          if (ca != null && cb != null) out.discountCOP += k * Math.round(pct / 100 * (ca + cb));
        }
      }
      if ((cA > 0) !== (cB > 0)) {   // exactly one member present
        out.halfSets.push({ setId: def.id, presentSlug: cA > 0 ? m[0] : m[1], missingSlug: cA > 0 ? m[1] : m[0] });
      }
    });
    return out;
  }

  function cartIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 5h2l1.2 10.2a1.6 1.6 0 0 0 1.6 1.4h7.8a1.6 1.6 0 0 0 1.6-1.3L20.5 8H6.2"/>' +
      '<circle cx="9.5" cy="20" r="1.1"/><circle cx="17.5" cy="20" r="1.1"/></svg>';
  }

  // update every cart trigger (the floating FAB) and its badge
  function updateCartCount() {
    var n = cartCount();
    document.querySelectorAll(".cart-count").forEach(function (badge) {
      badge.textContent = n; badge.hidden = n === 0;
    });
    document.querySelectorAll("[data-open-cart]").forEach(function (btn) {
      btn.classList.toggle("has-items", n > 0);
      btn.setAttribute("aria-label", t("cart.open") + (n ? " (" + n + ")" : ""));
    });
  }

  // A floating cart button in the bottom-right control cluster, sitting directly
  // above the theme toggle (same frosted-glass treatment). Opens the same drawer.
  function buildCartFab() {
    if (document.getElementById("ss-cart-fab")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "ss-cart-fab";
    b.className = "cart-fab";
    b.setAttribute("data-open-cart", "");
    b.setAttribute("aria-label", t("cart.open"));
    b.innerHTML = cartIcon() + '<span class="cart-count" aria-hidden="true" hidden>0</span>';
    document.body.appendChild(b);
  }

  function buildCartDrawer() {
    var d = document.getElementById("cart-drawer");
    if (d) return d;
    d = document.createElement("div");
    d.className = "cart-drawer";
    d.id = "cart-drawer";
    d.innerHTML =
      '<div class="cart-backdrop" data-close-cart></div>' +
      '<aside class="cart-panel" role="dialog" aria-modal="true" aria-label="' + t("cart.title") + '">' +
        '<div class="cart-head">' +
          '<span class="cart-title" aria-hidden="true">' + cartIcon() + '</span>' +
          '<button type="button" class="cart-x" data-close-cart aria-label="' + t("p.close") + '">&times;</button>' +
        '</div>' +
        '<div class="cart-body"></div>' +
        '<div class="cart-foot"></div>' +
      '</aside>';
    document.body.appendChild(d);
    return d;
  }
  function cartIsOpen() {
    var d = document.getElementById("cart-drawer");
    return d && d.classList.contains("open");
  }

  function domRowCart(box, label, valStr, strong, extraCls) {
    var line = document.createElement("div");
    line.className = "cart-row" + (strong ? " strong" : "") + (extraCls ? " " + extraCls : "");
    var l = document.createElement("span"); l.textContent = label;
    var v = document.createElement("span"); v.textContent = valStr;
    line.appendChild(l); line.appendChild(v);
    box.appendChild(line);
  }

  // how many complete sets the drawer showed last render, so a fresh completion
  // (count goes up) can play the "SET COMPLETO" flourish exactly once
  var cartLastComplete = 0;

  // Price of one line in the currency being shown: COP for Colombia (what Bold
  // charges), otherwise the reference amount in the visitor's currency.
  function cartLinePrice(usd, info, lang) {
    if (info.kind === "CO") { var c = copFromUsd(usd); if (c != null) return fmtCOP(c, lang); }
    return money(usd, lang);
  }

  function renderCart() {
    var d = document.getElementById("cart-drawer");
    if (!d) return;
    var lang = getLang() || "es";
    var body = d.querySelector(".cart-body");
    var foot = d.querySelector(".cart-foot");
    var panel = d.querySelector(".cart-panel");
    if (panel) panel.setAttribute("aria-label", t("cart.title"));
    body.innerHTML = "";
    foot.innerHTML = "";

    var items = cartRead();
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "cart-empty";
      var ep = document.createElement("p"); ep.textContent = t("cart.empty");
      var ea = document.createElement("a"); ea.className = "lang-btn"; ea.href = "shop.html"; ea.textContent = t("cart.shop");
      empty.appendChild(ep); empty.appendChild(ea);
      body.appendChild(empty);
      return;
    }

    // need the catalog for names + prices; fetch then re-render
    if (!cartCfg) {
      var loading = document.createElement("p");
      loading.className = "cart-loading"; loading.textContent = "…";
      body.appendChild(loading);
      loadShopCfg().then(function () { if (cartIsOpen()) renderCart(); });
      return;
    }

    // shipping-config drives the shipping line/total; if its fetch hasn't settled
    // yet, render now with what we have and re-render once it lands (like prices)
    if (!cartShipLoaded) loadCartShip().then(function () { if (cartIsOpen()) renderCart(); });

    // prune any line whose product no longer exists in the catalog
    var valid = items.filter(function (it) { return !!cartProduct(it.product); });
    if (valid.length !== items.length) { cartSave(valid); items = valid; if (!items.length) return renderCart(); }

    var sel = getSelectedCountry();
    var cc = sel ? sel.c : "co";
    var info = cartShipCost(cc);

    var sumUsd = 0, subCOP = 0, copReady = true;
    items.forEach(function (it, idx) {
      var p = cartProduct(it.product);
      var usd = Number(cartActiveUsd(p)) || 0;
      sumUsd += usd;
      var c = copFromUsd(usd);
      if (c == null) copReady = false; else subCOP += c;

      var row = document.createElement("div");
      row.className = "cart-item";

      var ph = (p.photos && p.photos[0] && p.photos[0].src) || null;
      if (ph) {
        var img = new Image();
        img.className = "cart-thumb"; img.src = ph; img.alt = ""; img.loading = "lazy";
        row.appendChild(img);
      }

      var main = document.createElement("div");
      main.className = "cart-item-main";
      var nm = document.createElement("div"); nm.className = "cart-item-name"; nm.textContent = cartNameOf(p, lang);
      var sz = document.createElement("div"); sz.className = "cart-item-size"; sz.textContent = it.sizeLabel || it.size;
      main.appendChild(nm); main.appendChild(sz);
      row.appendChild(main);

      var right = document.createElement("div");
      right.className = "cart-item-right";
      var pr = document.createElement("div"); pr.className = "cart-item-price"; pr.textContent = cartLinePrice(usd, info, lang);
      var rm = document.createElement("button");
      rm.type = "button"; rm.className = "cart-remove"; rm.textContent = t("cart.remove");
      rm.addEventListener("click", function () { cartRemove(idx); });
      right.appendChild(pr); right.appendChild(rm);
      row.appendChild(right);

      body.appendChild(row);
    });

    // ----- set logic: nudge for a half set, discount + badge for a full one -----
    var setSum = cartSetSummary();
    setSum.halfSets.forEach(function (h) {
      var partner = cartProduct(h.missingSlug);
      if (partner) body.appendChild(buildSetNudge(partner, lang, info));
    });

    // ----- totals (mirror the product page: follow the selected country) -----
    var totals = document.createElement("div");
    totals.className = "cart-totals";
    if (info.kind === "CO") {
      var discCOP = (copReady && setSum.completeCount) ? setSum.discountCOP : 0;
      domRowCart(totals, t("cart.subtotal", lang), copReady ? fmtCOP(subCOP, lang) : money(sumUsd, lang));
      if (discCOP) domRowCart(totals, t("set.discountLbl", lang), "−" + fmtCOP(discCOP, lang), false, "cart-row-discount");
      domRowCart(totals, t("ship.shippingLbl", lang), fmtCOP(info.shipCOP, lang));
      domRowCart(totals, t("ship.totalLbl", lang), fmtCOP((copReady ? subCOP : 0) - discCOP + info.shipCOP, lang), true);
    } else if (info.kind === "USD") {
      var discU = setSum.completeCount ? setSum.discountUSD : 0;
      domRowCart(totals, t("cart.subtotal", lang), money(sumUsd, lang));
      if (discU) domRowCart(totals, t("set.discountLbl", lang), "−" + money(discU, lang), false, "cart-row-discount");
      domRowCart(totals, t("ship.shippingLbl", lang), money(info.shipUSD, lang));
      domRowCart(totals, t("ship.totalLbl", lang), money(sumUsd - discU + info.shipUSD, lang), true);
    } else {
      var discX = setSum.completeCount ? setSum.discountUSD : 0;
      domRowCart(totals, t("cart.subtotal", lang), money(sumUsd, lang));
      if (discX) domRowCart(totals, t("set.discountLbl", lang), "−" + money(discX, lang), false, "cart-row-discount");
      domRowCart(totals, t("ship.shippingLbl", lang), t("prod.ship.calc", lang));
    }

    // "SET COMPLETO" badge above the totals; it pops the moment a set is completed
    if (setSum.completeCount > 0) {
      var badge = document.createElement("div");
      badge.className = "set-badge";
      badge.innerHTML = '<span class="set-spark" aria-hidden="true">✦</span><span>' + t("set.complete", lang) + '</span>';
      foot.appendChild(badge);
      if (setSum.completeCount > cartLastComplete) { void badge.offsetWidth; badge.classList.add("pop"); }
    }
    cartLastComplete = setSum.completeCount;

    foot.appendChild(totals);

    // ----- straight to payment (no address here; we collect shipping on the
    // thank-you page after Bold, so nothing stands between the cart and paying) -----
    var warn = document.createElement("p");
    warn.className = "ship-warn cart-warn"; warn.hidden = true;
    foot.appendChild(warn);

    var payBtn = document.createElement("button");
    payBtn.type = "button";
    payBtn.className = "cart-confirm";
    payBtn.textContent = t("cart.checkout", lang);
    payBtn.addEventListener("click", cartCheckout);
    foot.appendChild(payBtn);

    var note = document.createElement("p");
    note.className = "cart-note cart-paynote";
    note.textContent = t("cart.paynote", lang);
    foot.appendChild(note);
  }

  // Mint one Bold link for the whole cart and go straight there. Colombia only
  // for now (intl dormant), charged in COP; the shipping details are collected
  // afterwards on gracias.html. A 503 (Bold not live yet) surfaces a friendly
  // "opens at the drop" message.
  function cartCheckout() {
    if (cartPaying) return;
    var foot = document.querySelector("#cart-drawer .cart-foot");
    if (!foot) return;
    var lang = getLang() || "es";
    var warn = foot.querySelector(".cart-warn");
    var btn = foot.querySelector(".cart-confirm");
    if (warn) warn.hidden = true;

    var items = cartRead().map(function (i) { return { product: i.product, size: i.size }; });
    if (!items.length) return;

    cartPaying = true;
    if (btn) btn.classList.add("is-disabled");
    fetch("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items, country: "CO" })
    }).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body.url) { window.location.href = res.body.url; return; }
        cartPaying = false;
        if (btn) btn.classList.remove("is-disabled");
        if (res.status === 409) {
          // a size sold out between adding and paying — drop it and re-render
          var gone = res.body && res.body.slug;
          if (gone) cartSave(cartRead().filter(function (i) { return i.size !== gone; }));
          renderCart();
          var w2 = document.querySelector("#cart-drawer .cart-warn");
          if (w2) { w2.hidden = false; w2.textContent = t("cart.soldout", lang); }
          return;
        }
        if (warn) {
          warn.hidden = false;
          warn.textContent = res.status === 503 ? t("cart.soon", lang) : t("cart.err", lang);
        }
      })
      .catch(function () {
        cartPaying = false;
        if (btn) btn.classList.remove("is-disabled");
        if (warn) { warn.hidden = false; warn.textContent = t("cart.err", lang); }
      });
  }

  // "Completa tu set" strip shown in the drawer when one half of a set is in the
  // cart. Pick the partner's size, hit Agregar → it joins the cart and the
  // discount + "SET COMPLETO" badge appear on the next render.
  function buildSetNudge(partner, lang, info) {
    var wrap = document.createElement("div");
    wrap.className = "cart-nudge";

    var eb = document.createElement("div");
    eb.className = "cart-nudge-eyebrow";
    eb.textContent = "✦ " + t("cart.setNudge", lang);
    wrap.appendChild(eb);

    var top = document.createElement("div");
    top.className = "cart-nudge-top";
    var ph = (partner.photos && partner.photos[0] && partner.photos[0].src) || null;
    if (ph) { var img = new Image(); img.className = "cart-nudge-thumb"; img.src = ph; img.alt = ""; img.loading = "lazy"; top.appendChild(img); }
    var meta = document.createElement("div"); meta.className = "cart-nudge-meta";
    var nm = document.createElement("div"); nm.className = "cart-nudge-name"; nm.textContent = cartNameOf(partner, lang);
    var pr = document.createElement("div"); pr.className = "cart-nudge-price"; pr.textContent = cartLinePrice(Number(cartActiveUsd(partner)) || 0, info, lang);
    meta.appendChild(nm); meta.appendChild(pr); top.appendChild(meta);
    wrap.appendChild(top);

    var chips = document.createElement("div"); chips.className = "cart-nudge-sizes";
    var chosen = null;
    (partner.sizes || []).forEach(function (s) {
      var b = document.createElement("button"); b.type = "button"; b.className = "size-chip"; b.textContent = s.size;
      b.addEventListener("click", function () {
        chosen = s;
        chips.querySelectorAll(".size-chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on"); wrap.classList.remove("need-size");
      });
      chips.appendChild(b);
    });
    wrap.appendChild(chips);

    var add = document.createElement("button");
    add.type = "button"; add.className = "cart-nudge-add"; add.textContent = t("set.addPartner", lang);
    add.addEventListener("click", function () {
      if (!chosen) { wrap.classList.add("need-size"); return; }
      cartAdd({ product: partner.slug, size: chosen.slug, name: cartNameOf(partner, lang), sizeLabel: chosen.size });
      renderCart();
    });
    wrap.appendChild(add);
    return wrap;
  }

  // Set price in the selected currency: { original, discounted, save }. CO-ness is
  // read straight from the picked country (not from shipping config), so the exact
  // COP path is used even before shipping-config.json has loaded.
  function setPriceStrings(def, lang) {
    var m = def.members || [];
    var pa = cartProduct(m[0]), pb = cartProduct(m[1]);
    if (!pa || !pb) return null;
    var ua = Number(cartActiveUsd(pa)) || 0, ub = Number(cartActiveUsd(pb)) || 0;
    var pct = setDiscountPct();
    var sel = getSelectedCountry();
    if (sel && String(sel.c).toUpperCase() === "CO") {
      var ca = copFromUsd(ua), cb = copFromUsd(ub);
      if (ca != null && cb != null) {
        var o = ca + cb, dc = Math.round(pct / 100 * o);
        return { original: fmtCOP(o, lang), discounted: fmtCOP(o - dc, lang), save: fmtCOP(dc, lang) };
      }
    }
    var oU = ua + ub, dU = Math.round(pct / 100 * oU);
    return { original: money(oU, lang), discounted: money(oU - dU, lang), save: money(dU, lang) };
  }

  // Reusable "add the set" glass sheet (used by shop.html's coverflow "+ Set"):
  // both garments, a size picker each, the discounted set price, one button that
  // drops both into the cart.
  function buildSetSheet(def) {
    var old = document.getElementById("set-sheet"); if (old) old.remove();
    var lang = getLang() || "es";
    var m = def.members || [];
    var pa = cartProduct(m[0]), pb = cartProduct(m[1]);
    if (!pa || !pb) return null;

    var sheet = document.createElement("div");
    sheet.className = "lang-modal set-sheet"; sheet.id = "set-sheet";
    var panel = document.createElement("div"); panel.className = "panel set-panel"; sheet.appendChild(panel);

    var title = document.createElement("div"); title.className = "eyebrow"; title.textContent = t("set.title", lang); panel.appendChild(title);

    var chosen = {};
    var cols = document.createElement("div"); cols.className = "set-cols";
    [pa, pb].forEach(function (p) {
      var col = document.createElement("div"); col.className = "set-col";
      var ph = (p.photos && p.photos[0] && p.photos[0].src) || null;
      if (ph) { var img = new Image(); img.className = "set-col-thumb"; img.src = ph; img.alt = ""; img.loading = "lazy"; col.appendChild(img); }
      var nm = document.createElement("div"); nm.className = "set-col-name"; nm.textContent = cartNameOf(p, lang); col.appendChild(nm);
      var chips = document.createElement("div"); chips.className = "set-col-sizes";
      (p.sizes || []).forEach(function (s) {
        var b = document.createElement("button"); b.type = "button"; b.className = "size-chip"; b.textContent = s.size;
        b.addEventListener("click", function () {
          chosen[p.slug] = s;
          chips.querySelectorAll(".size-chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on"); col.classList.remove("need-size");
        });
        chips.appendChild(b);
      });
      col.appendChild(chips);
      cols.appendChild(col);
    });
    panel.appendChild(cols);

    var priceLine = document.createElement("div"); priceLine.className = "set-price-line"; panel.appendChild(priceLine);
    function renderPrice() {
      var ss = setPriceStrings(def, getLang() || "es");
      if (!ss) { priceLine.textContent = ""; return; }
      priceLine.innerHTML =
        '<span class="set-price-orig">' + ss.original + '</span>' +
        '<span class="set-price-now">' + ss.discounted + '</span>' +
        '<span class="set-price-save">' + t("set.save", getLang() || "es") + ' ' + ss.save + '</span>';
    }
    renderPrice();

    var warn = document.createElement("p"); warn.className = "ship-warn set-warn"; warn.hidden = true; panel.appendChild(warn);

    var add = document.createElement("button"); add.type = "button"; add.className = "cart-confirm set-add-btn"; add.textContent = t("set.add", lang);
    add.addEventListener("click", function () {
      if (!chosen[pa.slug] || !chosen[pb.slug]) {
        warn.hidden = false; warn.textContent = t("set.pickPartnerSize", lang);
        cols.querySelectorAll(".set-col").forEach(function (c, i) { if (!chosen[(i === 0 ? pa : pb).slug]) c.classList.add("need-size"); });
        return;
      }
      cartAdd({ product: pa.slug, size: chosen[pa.slug].slug, name: cartNameOf(pa, lang), sizeLabel: chosen[pa.slug].size });
      cartAdd({ product: pb.slug, size: chosen[pb.slug].slug, name: cartNameOf(pb, lang), sizeLabel: chosen[pb.slug].size });
      closeSetSheet(); openCart();
    });
    panel.appendChild(add);

    var close = document.createElement("button"); close.type = "button"; close.className = "ig-close"; close.setAttribute("data-close-set", ""); close.textContent = t("p.close", lang); panel.appendChild(close);

    sheet._renderPrice = renderPrice;   // re-priced on lvck:currency/lvck:lang while open
    document.body.appendChild(sheet);
    return sheet;
  }
  function openSetSheet(setId) {
    loadShopCfg().then(function () {
      var def = setDefs().filter(function (d) { return d.id === setId; })[0];
      if (!def) return;
      var sheet = buildSetSheet(def);
      if (!sheet) return;
      void sheet.offsetWidth; sheet.classList.add("open");
    });
  }
  function closeSetSheet() { var s = document.getElementById("set-sheet"); if (s) s.classList.remove("open"); }

  function openCart() {
    var d = buildCartDrawer();
    loadShopCfg(); loadCartShip();
    renderCart();
    void d.offsetWidth;
    d.classList.add("open");
    document.documentElement.classList.add("cart-open");
  }
  function closeCart() {
    var d = document.getElementById("cart-drawer");
    if (!d) return;
    d.classList.remove("open");
    document.documentElement.classList.remove("cart-open");
  }

  function initCart() {
    buildCartFab();   // the cart lives in the floating button now, not the header
    updateCartCount();
  }

  function setSheetOpen() { var s = document.getElementById("set-sheet"); return s && s.classList.contains("open"); }
  function repriceSetSheet() { var s = document.getElementById("set-sheet"); if (s && s.classList.contains("open") && s._renderPrice) s._renderPrice(); }

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-open-cart]")) { e.preventDefault(); openCart(); return; }
    if (e.target.closest && e.target.closest("[data-close-cart]")) { closeCart(); return; }
    if (e.target.closest && e.target.closest("[data-close-set]")) { closeSetSheet(); return; }
    if (e.target.id === "set-sheet") { closeSetSheet(); return; }
  });
  global.addEventListener("lvck:cart", updateCartCount);
  global.addEventListener("lvck:currency", function () { if (cartIsOpen()) renderCart(); repriceSetSheet(); });
  global.addEventListener("lvck:lang", function () { updateCartCount(); if (cartIsOpen()) renderCart(); if (setSheetOpen()) repriceSetSheet(); });

  // called by every page once its own markup exists
  function boot(afterLang) {
    initTheme();
    initCountdown();
    initCurrencyControl();
    initCart();
    // fetch live rates, then re-render any prices already on the page
    loadRates(function () {
      updateCurrencyControl();
      global.dispatchEvent(new CustomEvent("lvck:currency", { detail: { currency: getCurrency() } }));
    });
    var lang = getLang();
    applyI18n();
    updateLangTrigger();
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
    copFromUsd: copFromUsd, fmtCOP: fmtCOP,
    openCurrencyMenu: openCurrencyMenu,
    getTheme: getTheme, applyTheme: applyTheme, toggleTheme: toggleTheme,
    cartAdd: cartAdd, cartRemove: cartRemove, cartItems: cartItems,
    cartCount: cartCount, cartClear: cartClear, openCart: openCart, closeCart: closeCart,
    setDefFor: setDefFor, setPartnerSlug: setPartnerSlug, setDiscountPct: setDiscountPct,
    cartSetSummary: cartSetSummary, openSetSheet: openSetSheet
  };
})(window);
