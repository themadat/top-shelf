(function () {
  "use strict";

  const FORMAT = "top-shelf-lzw16-v1";
  const LIMIT = 32768;
  const RESET = 256;
  // Bounded LZW over UTF-8 bytes. Codes use JSON-safe, non-surrogate UTF-16
  // characters, reducing localStorage's UTF-16 footprint without losing text.
  function encode(json) {
    const bytes = new TextEncoder().encode(json);
    const dictionary = new Map(), codes = [];
    let next = RESET + 1, word = "";
    function code(value) { return value.length === 1 ? value.charCodeAt(0) : dictionary.get(value); }
    for (const byte of bytes) {
      const letter = String.fromCharCode(byte), combined = word + letter;
      if (!word || dictionary.has(combined)) { word = combined; continue; }
      codes.push(String.fromCharCode(code(word) + 256));
      if (next < LIMIT) dictionary.set(combined, next++);
      else {
        codes.push(String.fromCharCode(RESET + 256));
        dictionary.clear(); next = RESET + 1;
      }
      word = letter;
    }
    if (word) codes.push(String.fromCharCode(code(word) + 256));
    return JSON.stringify({ storageEncoding: FORMAT, byteLength: bytes.length, data: codes.join("") });
  }

  function parse(raw) {
    const envelope = JSON.parse(raw);
    if (envelope.storageEncoding !== FORMAT) return envelope;
    const { data, byteLength } = envelope;
    if (typeof data !== "string" || !Number.isSafeInteger(byteLength) || byteLength < 0) throw new Error("Invalid compact library.");
    const dictionary = [], parts = [];
    let next = RESET + 1, prior = "", length = 0;
    for (let index = 0; index < data.length; index += 1) {
      const code = data.charCodeAt(index) - 256;
      if (code === RESET) { dictionary.length = 0; next = RESET + 1; prior = ""; continue; }
      let word;
      if (code >= 0 && code < RESET) word = String.fromCharCode(code);
      else if (code < next && dictionary[code]) word = dictionary[code];
      else if (code === next && prior && next < LIMIT) word = prior + prior[0];
      else throw new Error("Unreadable compact library.");
      length += word.length;
      if (length > byteLength) throw new Error("Invalid compact library length.");
      parts.push(word);
      if (prior && next < LIMIT) dictionary[next++] = prior + word[0];
      prior = word;
    }
    if (length !== byteLength) throw new Error("Incomplete compact library.");
    const binary = parts.join(""), bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) bytes[index] = binary.charCodeAt(index);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }

  window.LocalApp.storageCodec = { encode: encode, parse: parse, format: FORMAT };
})();
