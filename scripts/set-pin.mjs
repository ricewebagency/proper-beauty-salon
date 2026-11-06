// Stelt de pincode voor de boekingskalender in.
// Gebruik: npm run set-pin -- 1234   (zonder cijfers wordt een willekeurige pincode gekozen)
// Het Fillout-ID wordt versleuteld met de pincode; alleen met de juiste pincode is de kalender te laden.
import { webcrypto as crypto } from "node:crypto";
import { writeFileSync } from "node:fs";

const FORM_ID = "7vQk6vWYgBus";
const ITERATIONS = 250000;
const OUT = "src/js/booking-lock.config.js";

const arg = process.argv[2];
const pin = arg ?? String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, "0");

if (!/^\d{4}$/.test(pin)) {
  console.error("De pincode moet uit precies 4 cijfers bestaan. Gebruik: npm run set-pin -- 1234");
  process.exit(1);
}

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const baseKey = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  baseKey,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"]
);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(FORM_ID)));

const b64 = (bytes) => Buffer.from(bytes).toString("base64");

writeFileSync(
  OUT,
  `// Gegenereerd door scripts/set-pin.mjs — niet handmatig aanpassen.\n` +
    `window.PB_BOOKING_LOCK = ${JSON.stringify({ iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) })};\n`
);

console.log(`Pincode ingesteld: ${pin}`);
console.log("Draai nu 'npm run build' en publiceer de site.");
