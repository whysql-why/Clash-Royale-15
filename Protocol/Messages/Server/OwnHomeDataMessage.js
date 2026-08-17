const PiranhaMessage = require("../../PiranhaMessage");
const { getConfig } = require("../../../Utils/config");
const fs = require("fs");
const path = require("path");

// ── Helpers for dynamic patching of the OwnHomeData template ────────────────
// Supercell VInt (same algorithm as ByteStream.writeVInt)
function writeVIntBuf(value) {
  const out = [];
  value = value | 0;
  let temp = (value >> 25) & 0x40;
  let flipped = value ^ (value >> 31);
  temp |= value & 0x3f;
  value >>= 6;
  flipped >>= 6;
  if (flipped === 0) { out.push(temp & 0xff); return Buffer.from(out); }
  out.push((temp | 0x80) & 0xff);
  flipped >>= 7;
  let r = flipped ? 0x80 : 0;
  out.push(((value & 0x7f) | r) & 0xff);
  value >>= 7;
  while (flipped !== 0) {
    flipped >>= 7;
    r = flipped ? 0x80 : 0;
    out.push(((value & 0x7f) | r) & 0xff);
    value >>= 7;
  }
  return Buffer.from(out);
}

// number of bytes of the VInt starting at off (continues while bit 0x80 is set)
function vintLen(buf, off) {
  let n = 0;
  while (off + n < buf.length && (buf[off + n] & 0x80)) n++;
  return n + 1;
}

// replace the VInt right after the marker (hex) with VInt(newVal)
function patchVIntAfterMarker(body, markerHex, newVal, label) {
  const marker = Buffer.from(markerHex, "hex");
  const idx = body.indexOf(marker);
  if (idx < 0) { console.log(`[patch] marker ${markerHex} (${label}) not found`); return body; }
  const voff = idx + marker.length;
  const oldLen = vintLen(body, voff);
  const newV = writeVIntBuf(newVal);
  return Buffer.concat([body.slice(0, voff), newV, body.slice(voff + oldLen)]);
}

// replace the first occurrence of the old VInt bytes (hex) with VInt(newVal)
function patchVInt(body, oldVIntHex, newVal, label) {
  const oldV = Buffer.from(oldVIntHex, "hex");
  const idx = body.indexOf(oldV);
  if (idx < 0) { console.log(`[patch] vint ${oldVIntHex} (${label}) not found`); return body; }
  const newV = writeVIntBuf(newVal);
  return Buffer.concat([body.slice(0, idx), newV, body.slice(idx + oldV.length)]);
}

class OwnHomeDataMessage extends PiranhaMessage {
  constructor(client) {
    super();
    this.id = 23245; // v15.535.22 (confirmed by live capture)
    this.client = client;
    this.version = 0;
  }

  async encode() {
    // Template mode (like CoC HomeBuilder): use the REAL OwnHomeData captured from
    // the live client - byte-identical to what it renders, so the home loads.
    // Two templates:
    //   - unnamed -> shows the "choose your name" popup   (ownhome_body_real.bin)
    //   - named   -> renders the home with NO popup        (ownhome_named_real.bin)
    // The popup is not controlled by just a few avatar bytes, so for named accounts
    // we serve the full real "named" body. Gold/gems are taken from config.json.
    const u = this.client.user || {};
    const hasName = !!(u.username && u.username.trim() !== "");
    const tmplName = hasName ? "ownhome_named_real.bin" : "ownhome_body_real.bin";
    const tmpl = path.join(__dirname, tmplName);

    let body;
    try {
      body = fs.readFileSync(tmpl);
    } catch (e) {
      console.log("[OwnHomeData] template not found:", tmplName, e.message);
      return;
    }

    // In the NAMED template, replace the placeholder name with the user's name.
    if (hasName) {
      const oldName = Buffer.concat([Buffer.from("00000009", "hex"), Buffer.from("Kaptura09", "utf8")]);
      const idx = body.indexOf(oldName);
      if (idx >= 0) {
        const nb = Buffer.from(u.username, "utf8");
        const lb = Buffer.alloc(4); lb.writeUInt32BE(nb.length, 0);
        body = Buffer.concat([body.slice(0, idx), lb, nb, body.slice(idx + oldName.length)]);
        console.log(`[OwnHomeData] NAMED template, name -> '${u.username}'`);
      } else {
        console.log("[OwnHomeData] placeholder name not found in NAMED template");
      }
    }

    // Dynamic resource patching (gold after "00 4c 4b 41", gems "80 89 7a").
    // Priority: config.json (live-editable) > user value > default.
    const cfg = getConfig();
    const goldVal = cfg.gold != null ? cfg.gold : (u.gold != null ? u.gold : 500);
    const gemsVal = cfg.gems != null ? cfg.gems : (u.gems != null ? u.gems : 1000000);
    body = patchVIntAfterMarker(body, "004c4b41", goldVal, "gold");
    body = patchVInt(body, "80897a", gemsVal, "gems");

    this.buffer = Buffer.concat([this.buffer, body]);
    this.offset += body.length;
    console.log(`[OwnHomeData] ${hasName ? "NAMED" : "unnamed"} template ${body.length}B  gold=${goldVal} gems=${gemsVal} name='${u.username || ""}'`);
  }
}

module.exports = OwnHomeDataMessage;
