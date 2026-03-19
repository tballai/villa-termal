/**
 * Cloudflare Worker — iCal Proxy
 *
 * Lekéri az iCal feedeket (Booking.com, Airbnb, Szállás.hu),
 * parseolja a VEVENT blokkokat, és JSON-ként visszaadja a foglalt dátumokat.
 *
 * Használat:
 *   GET /ical?feeds=BASE64_ENCODED_JSON
 *
 * A `feeds` query paraméter egy base64-kódolt JSON tömb, ami az iCal URL-eket tartalmazza:
 *   [
 *     {"name": "Booking.com", "url": "https://admin.booking.com/..."},
 *     {"name": "Airbnb", "url": "https://www.airbnb.com/calendar/ical/..."}
 *   ]
 *
 * Válasz:
 *   {
 *     "bookedDates": ["2026-07-01", "2026-07-02", ...],
 *     "lastUpdated": "2026-07-15T10:30:00Z",
 *     "source": "ical"
 *   }
 *
 * Deploy:
 *   npx wrangler deploy worker/ical-proxy.js --name ical-proxy
 */

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Csak GET kéréseket fogadunk
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Csak GET kérések engedélyezettek' }, 405);
    }

    const url = new URL(request.url);
    const feedsParam = url.searchParams.get('feeds');

    if (!feedsParam) {
      return jsonResponse({
        error: 'Hiányzó "feeds" paraméter. Használat: ?feeds=BASE64_ENCODED_JSON',
        example: '?feeds=' + btoa(JSON.stringify([{ name: 'Booking.com', url: 'https://...' }]))
      }, 400);
    }

    let feeds;
    try {
      const decoded = atob(feedsParam);
      feeds = JSON.parse(decoded);
      if (!Array.isArray(feeds) || feeds.length === 0) {
        throw new Error('A feeds paraméter nem érvényes tömb');
      }
    } catch (e) {
      return jsonResponse({ error: 'Érvénytelen feeds paraméter: ' + e.message }, 400);
    }

    // Maximum 10 feed engedélyezett
    if (feeds.length > 10) {
      return jsonResponse({ error: 'Maximum 10 iCal feed engedélyezett' }, 400);
    }

    try {
      const allBookedDates = new Set();

      // Párhuzamosan lekérjük az összes feedet
      const results = await Promise.allSettled(
        feeds.map(feed => fetchAndParseIcal(feed.url, feed.name))
      );

      const errors = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const date of result.value.dates) {
            allBookedDates.add(date);
          }
        } else {
          errors.push(result.reason.message || 'Ismeretlen hiba');
        }
      }

      // Rendezzük a dátumokat
      const sortedDates = Array.from(allBookedDates).sort();

      const response = {
        bookedDates: sortedDates,
        lastUpdated: new Date().toISOString(),
        source: 'ical',
        feedCount: feeds.length,
        successCount: feeds.length - errors.length
      };

      if (errors.length > 0) {
        response.warnings = errors;
      }

      // 30 perces cache
      return jsonResponse(response, 200, {
        'Cache-Control': 'public, max-age=1800, s-maxage=1800'
      });

    } catch (e) {
      return jsonResponse({ error: 'Szerverhiba: ' + e.message }, 500);
    }
  }
};

/**
 * Lekér egy iCal feedet és kiolvassa a foglalt dátumokat
 */
async function fetchAndParseIcal(url, name) {
  if (!url || typeof url !== 'string') {
    throw new Error((name || 'Ismeretlen') + ': Érvénytelen URL');
  }

  // Biztonsági ellenőrzés: csak HTTPS
  if (!url.startsWith('https://')) {
    throw new Error((name || 'Ismeretlen') + ': Csak HTTPS URL-ek engedélyezettek');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'VillaTermal-iCal-Proxy/1.0',
      'Accept': 'text/calendar, text/plain, */*'
    },
    // 10 másodperces timeout
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error((name || url) + ': HTTP ' + response.status);
  }

  const text = await response.text();
  const dates = parseIcalEvents(text);

  return { name, dates };
}

/**
 * Parseolja az iCal szöveget és kiolvassa a VEVENT blokkok dátumait
 *
 * iCal formátum (RFC 5545):
 *   BEGIN:VEVENT
 *   DTSTART;VALUE=DATE:20260701
 *   DTEND;VALUE=DATE:20260704
 *   SUMMARY:Foglalás
 *   END:VEVENT
 *
 * A DTSTART és DTEND közötti napok foglaltak (DTEND nem számít bele,
 * mert az a távozás napja).
 */
function parseIcalEvents(icalText) {
  const dates = new Set();
  const lines = icalText.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r?\n/);

  let inEvent = false;
  let dtstart = null;
  let dtend = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      dtstart = null;
      dtend = null;
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && dtstart) {
        // Ha nincs DTEND, csak a DTSTART napot jelöljük foglaltnak
        if (!dtend) {
          dates.add(dtstart);
        } else {
          // DTSTART-tól DTEND-1-ig foglalt (DTEND = távozás napja)
          addDateRange(dates, dtstart, dtend);
        }
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    // DTSTART parse — támogatjuk a VALUE=DATE és a datetime formátumot is
    if (trimmed.startsWith('DTSTART')) {
      dtstart = extractDate(trimmed);
    }

    // DTEND parse
    if (trimmed.startsWith('DTEND')) {
      dtend = extractDate(trimmed);
    }
  }

  return Array.from(dates);
}

/**
 * Dátum kinyerése iCal sorból
 * Formátumok:
 *   DTSTART;VALUE=DATE:20260701
 *   DTSTART:20260701T140000Z
 *   DTSTART;TZID=Europe/Budapest:20260701T140000
 */
function extractDate(line) {
  const colonIndex = line.lastIndexOf(':');
  if (colonIndex === -1) return null;

  const value = line.substring(colonIndex + 1).trim();

  // DATE formátum: 20260701 (8 karakter)
  // DATETIME formátum: 20260701T140000 vagy 20260701T140000Z
  const dateStr = value.substring(0, 8);

  if (dateStr.length !== 8 || isNaN(parseInt(dateStr))) return null;

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  return year + '-' + month + '-' + day;
}

/**
 * Dátumtartomány hozzáadása (start inclusive, end exclusive)
 */
function addDateRange(dates, startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');

  // Biztonsági limit: max 365 nap
  const maxDays = 365;
  let count = 0;

  const current = new Date(start);
  while (current < end && count < maxDays) {
    const dateStr = current.toISOString().substring(0, 10);
    dates.add(dateStr);
    current.setUTCDate(current.getUTCDate() + 1);
    count++;
  }
}

/**
 * CORS headerek
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * JSON válasz helper
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      ...extraHeaders
    }
  });
}
