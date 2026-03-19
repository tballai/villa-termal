# Villa Termál — Foglalási Weboldal

Statikus foglalási landing page hajdúszoboszlói szálláskiadóknak. Az oldal lehetővé teszi, hogy a vendégek közvetlenül foglaljanak — jutalékmentesen, a Booking.com árnál olcsóbban.

## Tartalom

- [Gyors indítás](#gyors-indítás)
- [Fájlstruktúra](#fájlstruktúra)
- [config.json szerkesztése](#configjson-szerkesztése)
- [Hosting (Deploy)](#hosting-deploy)
- [iCal szinkron beállítása](#ical-szinkron-beállítása)
- [Cloudflare Worker deploy](#cloudflare-worker-deploy)
- [Formspree beállítása](#formspree-beállítása)
- [Google Maps embed](#google-maps-embed)
- [Testreszabás új szálláshely számára](#testreszabás-új-szálláshely-számára)
- [Gyakori kérdések](#gyakori-kérdések)

---

## Gyors indítás

### Előfeltételek
- Egy szövegszerkesztő (pl. [VS Code](https://code.visualstudio.com/), Notepad++)
- Böngésző (Chrome, Firefox, Edge)

### Helyi tesztelés

1. Nyisd meg a `villa-termal` mappát
2. Ha van Node.js telepítve:
   ```bash
   node serve.mjs
   ```
   Majd nyisd meg a böngészőben: `http://localhost:3001`

3. Ha nincs Node.js: telepítsd a [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) VS Code kiterjesztést, és nyisd meg az `index.html`-t

---

## Fájlstruktúra

```
villa-termal/
├── index.html              # Fő oldal (minden benne van: HTML + CSS + JS)
├── config.json             # Konfigurációs fájl — ITT MÓDOSÍTS
├── images/                 # Szoba képek
│   ├── room1.jpg
│   ├── csaladi1.jpg
│   └── ...
├── worker/
│   └── ical-proxy.js       # Cloudflare Worker az iCal szinkronhoz
├── serve.mjs               # Helyi fejlesztői szerver
└── README.md               # Ez a fájl
```

### Képek kezelése

A szoba képeket az `images/` mappába kell tenni:
- **Formátum**: JPG vagy WebP ajánlott
- **Méret**: ~600×400 px elég (az oldal `object-fit: cover`-rel vágja)
- **Optimalizálás**: max 200 KB/kép (használd a [Squoosh](https://squoosh.app/) eszközt)
- **Hivatkozás**: a `config.json`-ban relatív útvonalat adj meg: `"images/room1.jpg"`

---

## config.json szerkesztése

A `config.json` tartalmazza az összes szálláshely-specifikus adatot. Az `index.html` ebből tölti be az összes tartalmat.

### Szálláshely alapadatok (`property`)

```json
{
  "property": {
    "name": "Villa Termál",
    "tagline": "Rövid szlogen",
    "description": "Részletes leírás SEO-hoz",
    "email": "info@example.hu",
    "phone": "+36 52 123 4567",
    "address": "Hajdúszoboszló, Példa utca 1.",
    "coordinates": { "lat": 47.4503, "lng": 21.3942 },
    "socialLinks": {
      "facebook": "https://facebook.com/..."
    }
  }
}
```

### Szobák (`rooms`)

Minden szobatípushoz:

```json
{
  "rooms": [
    {
      "name": "Kétágyas Szoba",
      "description": "Rövid leírás a szobáról",
      "image": "https://placehold.co/600x400",
      "pricePerNight": 18000,
      "bookingPrice": 20000,
      "maxGuests": 2,
      "size": "25 m²",
      "amenities": ["WiFi", "Klíma", "TV"]
    }
  ]
}
```

- `pricePerNight`: A saját oldalon kínált ár (Ft/éj)
- `bookingPrice`: A Booking.com ár (összehasonlításhoz)
- `image`: Kép URL — használj saját képet, vagy `https://placehold.co/600x400` placeholder-t
- `gallery`: Képek tömbje a szoba galériához (opcionális). Ha meg van adva, a szoba kártyán egy "X fotó" jelvény jelenik meg, és kattintásra megnyílik a galéria lightbox.

#### Szoba galéria

A szobakártyákon megjelenik egy fotó jelvény ha több kép van. A képre kattintva lightbox nyílik:
- Bal/jobb nyilakkal navigálható
- Thumbnail sáv az alján
- Billentyűzet: Bal/Jobb nyíl, Escape bezárás
- Mobilon is teljesen működik

```json
{
  "image": "images/room1.jpg",
  "gallery": ["images/room1.jpg", "images/room2.webp", "images/room3.jpg"]
}
```

### Szolgáltatások (`features`)

```json
{
  "features": [
    {
      "icon": "🏊",
      "title": "Medence",
      "description": "Fűtött kültéri medence"
    }
  ]
}
```

### Vélemények (`reviews`)

```json
{
  "reviews": [
    {
      "name": "Kovács Anna",
      "date": "2025-08",
      "rating": 5,
      "text": "Szuper hely!"
    }
  ]
}
```

### Statisztikák (`stats`)

A hero alatti sávban megjelenő számok:

```json
{
  "stats": [
    { "value": "9.4", "label": "Vendég értékelés" }
  ]
}
```

### Távolságok (`distances`)

A helyszín szekcióban megjelenő távolságok:

```json
{
  "distances": [
    { "icon": "🏊", "name": "Gyógyfürdő", "distance": "500 m", "time": "6 perc séta" }
  ]
}
```

### Foglalási beállítások (`booking`)

```json
{
  "booking": {
    "minStay": 2,
    "maxGuests": 6,
    "emailService": "formspree",
    "formspreeEndpoint": "https://formspree.io/f/XXXXXXXX",
    "fallbackEmail": "info@example.hu",
    "whyDirect": [
      "10% kedvezmény a Booking.com árhoz képest",
      "Nincs közvetítői díj"
    ]
  }
}
```

### iCal beállítások (`ical`)

```json
{
  "ical": {
    "enabled": true,
    "feeds": [
      { "name": "Booking.com", "url": "https://admin.booking.com/..." },
      { "name": "Airbnb", "url": "https://www.airbnb.com/calendar/ical/..." }
    ],
    "proxyUrl": "https://your-worker.your-subdomain.workers.dev/ical",
    "fallbackBookedDates": ["2026-03-20", "2026-03-21"]
  }
}
```

### Branding (`branding`)

Ha más színvilágot szeretnél:

```json
{
  "branding": {
    "gold": "#C4975C",
    "goldLight": "#E8D5B5",
    "dark": "#1A1A1A",
    "warmDark": "#2C2520",
    "cream": "#FAF6F1",
    "creamDark": "#EDE4D8"
  }
}
```

---

## Hosting (Deploy)

### GitHub Pages (ingyenes)

1. Hozz létre egy GitHub repót
2. Töltsd fel a `villa-termal` mappa tartalmát
3. Menj a repó **Settings → Pages** oldalra
4. **Source**: Deploy from a branch → `main` → `/ (root)`
5. Néhány perc múlva elérhető lesz: `https://felhasznalonev.github.io/repo-nev/`

### Netlify (ingyenes)

1. Regisztrálj: [netlify.com](https://www.netlify.com/)
2. Kattints az **"Add new site" → "Deploy manually"** gombra
3. Húzd be a `villa-termal` mappát
4. Kész! A Netlify ad egy `.netlify.app` URL-t
5. Opcionálisan állíts be egyedi domaint a **Domain settings** alatt

### Vercel (ingyenes)

1. Regisztrálj: [vercel.com](https://vercel.com/)
2. Kattints az **"Add New Project"** gombra
3. Válaszd a **"Import Git Repository"** opciót (vagy töltsd fel manuálisan)
4. A build beállításoknál: **Framework Preset**: Other, **Output Directory**: `.`

### Saját webhosting

Ha van saját tárhelyed (pl. Rackhost, Tárhely.eu):
1. FTP-vel töltsd fel a `villa-termal` mappa tartalmát a `public_html` mappába
2. Nyisd meg a domain-t böngészőben

---

## iCal szinkron beállítása

### Mi az iCal?

Az iCal egy szabványos naptár formátum (RFC 5545). A Booking.com, Airbnb, és Szállás.hu mindegyike képes exportálni a foglalásokat iCal formátumban. Ez lehetővé teszi, hogy a weboldalon automatikusan megjelenjenek a foglalt napok.

### iCal URL beszerzése

#### Booking.com

1. Lépj be a [Booking.com Extranet](https://admin.booking.com/)-be
2. Menj a **Árak és elérhetőség → Naptár szinkronizáció** oldalra
3. Kattints az **"iCal exportálás"** gombra
4. Másold ki az URL-t (formátum: `https://admin.booking.com/hotel/hoteladmin/ical.html?t=XXXXXXXXX`)

#### Airbnb

1. Lépj be az [Airbnb Hosting](https://www.airbnb.com/hosting)-ra
2. Menj a szálláshely **Naptár** oldalára
3. Kattints a **"Elérhetőség" → "Naptár szinkronizáció"** (jobb oldali fogaskerék)
4. Kattints az **"iCal exportálás"** gombra
5. Másold ki a linket (formátum: `https://www.airbnb.com/calendar/ical/XXXXX.ics`)

#### Szállás.hu

1. Lépj be a [Szállás.hu Extranet](https://szallasadmin.szallas.hu/)-be
2. Menj a **Foglalások → Naptár szinkronizáció** oldalra
3. Kattints az **"Exportálás"** linkre
4. Másold ki az iCal URL-t

### iCal URL beillesztése a config.json-ba

Másold be a kapott URL-eket a `config.json` `ical.feeds` tömbjébe:

```json
{
  "ical": {
    "enabled": true,
    "feeds": [
      {
        "name": "Booking.com",
        "url": "https://admin.booking.com/hotel/hoteladmin/ical.html?t=IDE_MASOLD_A_TOKENT"
      },
      {
        "name": "Airbnb",
        "url": "https://www.airbnb.com/calendar/ical/IDE_MASOLD_AZ_ID-T.ics"
      }
    ],
    "proxyUrl": "https://your-worker.your-subdomain.workers.dev/ical"
  }
}
```

### Fallback (iCal nélkül)

Ha nem használsz iCal szinkront, a foglalt napokat kézzel kell karbantartani a `config.json` `ical.fallbackBookedDates` tömbjében:

```json
{
  "ical": {
    "enabled": false,
    "fallbackBookedDates": [
      "2026-07-01", "2026-07-02", "2026-07-03",
      "2026-07-10", "2026-07-11", "2026-07-12"
    ]
  }
}
```

---

## Cloudflare Worker deploy

A Cloudflare Worker a közvetítő szerver, ami lekéri az iCal feedeket (a böngésző CORS korlátozások miatt nem tudja közvetlenül).

### Előfeltételek

1. [Cloudflare fiók](https://dash.cloudflare.com/sign-up) (ingyenes)
2. Node.js telepítve a gépedre

### Lépések

1. Telepítsd a Wrangler CLI-t:
   ```bash
   npm install -g wrangler
   ```

2. Jelentkezz be:
   ```bash
   wrangler login
   ```

3. Navigálj a `villa-termal` mappába és deployold a worker-t:
   ```bash
   npx wrangler deploy worker/ical-proxy.js --name ical-proxy --compatibility-date 2024-01-01
   ```

4. A Wrangler megadja a worker URL-t, pl.:
   ```
   https://ical-proxy.FELHASZNALONEV.workers.dev
   ```

5. Másold be ezt az URL-t a `config.json`-ba (a `/ical` végződéssel):
   ```json
   {
     "ical": {
       "proxyUrl": "https://ical-proxy.FELHASZNALONEV.workers.dev/ical"
     }
   }
   ```

### wrangler.toml (opcionális)

Ha szeretnéd konfigurációs fájllal kezelni, hozz létre egy `wrangler.toml` fájlt a `worker/` mappában:

```toml
name = "ical-proxy"
main = "ical-proxy.js"
compatibility_date = "2024-01-01"

[triggers]
crons = []
```

### Korlátok

- A Cloudflare Workers ingyenes szintje 100 000 kérés/nap (bőven elég)
- A worker 30 percre cache-eli a válaszokat (Cache-Control header)
- Maximum 10 iCal feed kérdezhető le egyszerre

---

## Formspree beállítása

A Formspree kezeli az email küldést — nincs szükség backend szerverre.

### Lépések

1. Regisztrálj: [formspree.io](https://formspree.io/)
2. Kattints az **"+ New Form"** gombra
3. Add meg az email címedet (ide érkeznek a foglalási kérelmek)
4. A Formspree ad egy endpoint URL-t, pl.:
   ```
   https://formspree.io/f/xyzabcde
   ```
5. Másold be a `config.json`-ba:
   ```json
   {
     "booking": {
       "emailService": "formspree",
       "formspreeEndpoint": "https://formspree.io/f/xyzabcde"
     }
   }
   ```

### Ingyenes szint

- 50 email/hó (elegendő kis szálláshelyekhez)
- Ha több kell: Formspree Gold $10/hó (1000 email/hó)

### Formspree nélkül (mailto fallback)

Ha nem állítasz be Formspree-t, az oldal automatikusan `mailto:` linket használ, ami a vendég email kliensét nyitja meg az előre kitöltött foglalási adatokkal. Ez mindig működik, de kevésbé kényelmes.

---

## Google Maps embed

### Embed URL generálása

1. Nyisd meg a [Google Maps](https://www.google.com/maps)-et
2. Keresd meg a szálláshely címét
3. Kattints a **"Megosztás"** gombra (Share)
4. Válaszd a **"Térkép beágyazása"** (Embed a map) fület
5. Másold ki az iframe `src` attribútumát (a `https://www.google.com/maps/embed?...` részt)
6. Illeszd be a `config.json`-ba:

```json
{
  "property": {
    "mapEmbed": "https://www.google.com/maps/embed?pb=!1m18!1m12!..."
  }
}
```

### Alternatív: koordináták alapján

Ha nem akarsz embed URL-t generálni, az oldal automatikusan generál egyet a `config.json`-ban lévő koordináták alapján:

```json
{
  "property": {
    "coordinates": { "lat": 47.4503, "lng": 21.3942 }
  }
}
```

---

## Testreszabás új szálláshely számára

1. **Másold le a teljes `villa-termal` mappát** az új szálláshely nevére (pl. `apartman-napfeny`)
2. **Szerkeszd a `config.json`-t** az új szálláshely adataival:
   - Módosítsd a `property` szekciót (név, cím, email, telefon, koordináták)
   - Módosítsd a `rooms` tömböt (szobák, árak)
   - Módosítsd a `features`, `reviews`, `stats`, `distances` szekciókat
   - Frissítsd az `ical` URL-eket
   - Frissítsd a `branding` színeket ha kell
3. **Cseréld le a képeket** (saját képekre vagy placehold.co URL-ekre)
4. **Deployold** az új szálláshely oldalát

### Színek testreszabása

A `branding` szekció CSS változókat definiál. Ha más színvilágot szeretnél:

```json
{
  "branding": {
    "gold": "#8B7355",
    "goldLight": "#C4B396",
    "dark": "#1A1A2E",
    "warmDark": "#16213E",
    "cream": "#F5F5F5",
    "creamDark": "#E8E8E8"
  }
}
```

---

## Gyakori kérdések

### Mennyibe kerül az üzemeltetés?
- **Hosting**: Ingyenes (GitHub Pages / Netlify / Vercel)
- **Domain**: ~3 000 Ft/év (opcionális)
- **Cloudflare Worker**: Ingyenes (100 000 kérés/nap)
- **Formspree**: Ingyenes (50 email/hó)
- **Összesen**: 0–3 000 Ft/év

### Az oldal működik mobiltelefonon?
Igen, teljesen reszponzív. Tesztelve: 360px (mobil), 768px (tablet), 1440px (desktop).

### Hogyan frissítsem a foglalt napokat?
- **iCal szinkronnal**: Automatikusan frissül 30 percenként a Booking.com/Airbnb foglalásaiból
- **iCal nélkül**: Szerkeszd a `config.json` `ical.fallbackBookedDates` tömbjét

### Hogyan adjak hozzá új szobatípust?
Adj hozzá egy új objektumot a `config.json` `rooms` tömbjébe a meglévő szobák mintájára.

### Mi történik ha a Formspree nem működik?
Az oldal automatikusan `mailto:` linkre vált, ami a vendég email kliensében nyitja meg az előre kitöltött foglalási kérelmet.

### Az oldal biztonságos?
- Nincs backend szerver — nem lehet feltörni
- Nincs adatbázis — nincs adatszivárgási kockázat
- A Formspree HTTPS-en kommunikál
- A Cloudflare Worker HTTPS-t használ

### Kell hozzá programozási tudás?
A `config.json` szerkesztéséhez nem kell programozni — egyszerű szövegfájl. A deploy-hoz a fenti lépéseket kell követni.

---

## Technikai részletek

- **Egyetlen HTML fájl**: Minden CSS és JS beágyazva — nincs külső függőség (csak Google Fonts)
- **Vanilla JavaScript**: Nincs React, Vue, vagy más keretrendszer
- **Progressive Enhancement**: Az oldal alapszinten JavaScript nélkül is működik
- **SEO optimalizált**: Meta tagek, JSON-LD strukturált adat, semantic HTML
- **Lighthouse**: 90+ score célzott

---

## Licensz

Szabadon felhasználható hajdúszoboszlói szálláskiadók számára.
