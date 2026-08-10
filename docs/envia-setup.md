# Configurar Envia.com (guías + tracking automáticos)

Envia.com es el **agregador de paqueteo**: una sola cuenta y una sola API te dan tarifas y
guías de **varias transportadoras** — a nivel **nacional en Colombia** (Servientrega,
Coordinadora, etc.) e **internacional** (DHL, FedEx, UPS). El sitio ya trae toda la
integración montada; solo falta la cuenta y la llave para que funcione. Mientras no exista la
llave, todo el flujo sigue **exactamente igual** (Colombia → Bold, tarifa plana de envío).

> Nota: la generación de guía **solo dispara con la dirección completa** (calle). En Colombia
> pedimos un paso corto (nombre + ciudad + WhatsApp) y confirmamos la dirección exacta por
> WhatsApp; hasta que esa dirección exista, no se genera guía automática (el pedido queda como
> "pendiente" en la página de gracias).

---

## 1. Crear la cuenta

1. Entra a **https://envia.com** y crea una cuenta (elige Colombia como país).
2. Verifica el correo y completa los datos del negocio.

## 2. Obtener la API key (token Bearer)

1. En el panel de Envia, ve a la sección de **desarrolladores / API** (Integraciones → API /
   Tokens).
2. Genera un **token**. Envia maneja **dos entornos**, cada uno con su token:
   - **Sandbox / test** → base `https://api-test.envia.com` (para probar sin cobrar/enviar de verdad).
   - **Producción** → base `https://api.envia.com` (guías reales).
3. Copia el token. Se usa como `Authorization: Bearer <token>` en cada llamada (ya lo hace
   `lib/envia.js` por ti).

## 3. Poner la llave en Vercel

En el proyecto de Vercel → **Settings → Environment Variables**, agrega:

| Variable | Valor | Entornos |
|---|---|---|
| `ENVIA_API_KEY` | tu token de Envia | Production (y Preview para probar) |

Con eso, `envia.isConfigured()` pasa a `true` y el sitio empieza a cotizar/generar con Envia.
(Redeploy para que tome la variable.)

## 4. Completar el origen y el paquete en `shipping-config.json`

Envia necesita **desde dónde** sale el paquete y **cuánto pesa/mide**. Edita
`shipping-config.json`:

```jsonc
"origin": {
  "name": "LVCK · South Side",
  "country": "CO",
  "state": "Bogotá D.C.",
  "city": "Bogotá",
  "postalCode": "110111",          // ← poner el real
  "address1": "Calle 00 # 00-00",  // ← dirección de recogida (se mapea a `street`)
  "phone": "3000000000",           // ← teléfono real
  "email": "michael8080rt@gmail.com"
},
"parcelDefaults": { "weightKg": 0.7, "lengthCm": 32, "widthCm": 26, "heightCm": 8 }
```

- **`postalCode`, `address1`, `phone`** son los que hoy dicen `PENDIENTE` → ponlos reales.
- **`parcelDefaults`**: pesa y mide **una prenda empacada** (bolsa/caja lista para enviar) y
  ajusta los valores. Si las dos prendas del drop pesan/miden distinto, usa un promedio o el
  mayor (es el paquete por defecto que se cotiza).

## 5. Probar la cotización

Con la llave puesta y desplegado, prueba el endpoint de cotización (no toca inventario ni
cobra). Requiere `intlEnabled: true` en `shipping-config.json` para el flujo internacional:

```bash
curl -X POST https://southside-lvck.vercel.app/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "product": "boxi-fit",
    "country": "US",
    "lang": "es",
    "address": { "name": "Test", "street": "123 Main St", "city": "Miami",
                 "state": "FL", "country": "US", "postalCode": "33101", "phone": "3050000000" }
  }'
```

Respuesta esperada (con Envia activo): `{ "zone":"US", "currency":"USD", "shipping": <num>,
"carrier":"...", "etaDays":"...", "source":"envia" }`. Si Envia no responde, cae con gracia a la
**tarifa plana** de la zona (`source:"flat"`).

Para **Colombia** el `/api/quote` devuelve directamente la tarifa plana doméstica
(`shipping-config.json → domestic.flatCOP`, hoy **$8.000**) — Colombia no usa cotización en vivo
en el checkout, va fija por Bold.

---

## Cómo encaja con el resto

- **Cotización** (`/api/quote`, `lib/envia.js#quote`) — antes de pagar, para mostrar el costo de
  envío internacional. Usa `POST /ship/rate/`, toma la tarifa más barata de `data[]`.
- **Guía + tracking** (`lib/envia.js#createShipment`, `POST /ship/generate/`) — se dispara
  **después** de confirmar el pago, desde los webhooks (`api/webhook.js` para Bold nacional,
  `api/paypal-webhook.js` para internacional). Guarda el tracking en la orden
  (`lib/store.js#saveTracking`), y `gracias.html` lo muestra al comprador.

## Checklist para activar

- [ ] Cuenta Envia creada.
- [ ] `ENVIA_API_KEY` en Vercel (Production).
- [ ] `origin` real en `shipping-config.json` (postalCode, address1, phone).
- [ ] `parcelDefaults` con peso/medidas reales de la prenda empacada.
- [ ] `curl /api/quote` responde `source:"envia"`.
- [ ] (Internacional) además: cuenta PayPal + `PAYPAL_*` en Vercel y `intlEnabled:true`.

## Referencias
- Doc general: <https://docs.envia.com/>
- Cotización (rates): <https://docs.envia.com/reference/shipping-rates>
- Base producción `https://api.envia.com` · sandbox `https://api-test.envia.com` · auth
  `Authorization: Bearer <token>`.
