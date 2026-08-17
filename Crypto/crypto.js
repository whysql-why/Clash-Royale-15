const crypto = require("crypto");
const nacl = require("tweetnacl");

/* =========================
   🔁 Helper Functions
========================= */

function blake2b(data, outLen) {
  return crypto.createHash("blake2b512").update(data).digest().slice(0, outLen);
}

function incrementNonceLE(buf) {
  let n = BigInt("0x" + Buffer.from(buf).reverse().toString("hex"));
  n += 2n;
  return Buffer.from(
    n.toString(16).padStart(buf.length * 2, "0"),
    "hex",
  ).reverse();
}

/* =========================
   🔢 Nonce Class
========================= */

class Nonce {
  constructor(nonce = null, clientKey = null, serverKey = null) {
    if (!clientKey) {
      this._nonce = nonce ? Buffer.from(nonce) : crypto.randomBytes(24);
    } else {
      const parts = [];
      if (nonce) parts.push(Buffer.from(nonce));
      parts.push(Buffer.from(clientKey));
      parts.push(Buffer.from(serverKey));
      this._nonce = blake2b(Buffer.concat(parts), 24);
    }
  }

  toBuffer() {
    return this._nonce;
  }

  increment() {
    this._nonce = incrementNonceLE(this._nonce);
  }
}

/* =========================
   🔐 Crypto Class (SERVER)
========================= */

class CryptographyError extends Error {}

class Crypto {
  constructor() {
    this.authenticated = false;

    // 🔴 CHANGE THESE (SERVER KEYS MUST BE CONSTANT)
    // Valid keypair (private -> public are correct). The client must use the PUBLIC key.
    this.server_private_key = Buffer.from(
      "6ed6a7271894cc0b68195beb5d4fbbb296f63eedfc67e64cdcafa41ac16134f4",
      "hex",
    );
    this.server_public_key = Buffer.from(
      "73e1abc5d04c63cc3e2cb53bfeacbec0040dd2cf1870e693670d54274b4bc623",
      "hex",
    );

    // 🟢 Set during handshake
    this.client_public_key = null;
    this.shared_key = null;

    this.decryptNonce = null;
    this.encryptNonce = new Nonce();
    this.session_key = null;

    // Client crypto-disable mode (secretbox memcpy'd in libg): the NaCl framing leaves
    // a 16-byte gap (BOXZEROBYTES) in front of every payload. Enable with CR_FRAMED=1.
    this.framed = process.env.CR_FRAMED === "1";
  }

  // Framed mode = the client uses a neutralized secretbox (memcpy passthrough):
  //   10101 Login -> clientPub(32) || 16-gap || decryptNonce(24) || encryptNonce(24) || loginPayload
  //   session     -> 16-gap || payload  (we strip the 16). When sending: we prepend 16 zeros.
  _decryptFramed(packetId, payload) {
    if (packetId === 10100) return payload;
    if (packetId === 10101) {
      // The login is still ENCRYPTED (crypto_box inlined, not the standalone secretbox we
      // neutralized). We don't decrypt it: we FABRICATE a fresh-account session instead.
      // The session (LoginOk/OwnHomeData) goes out framed as plaintext and the client
      // (session-decrypt memcpy'd) reads it.
      this.client_public_key = payload.slice(0, 32);
      this.shared_key = Buffer.alloc(32);
      this.authenticated = true;
      const ByteStream = require("../ByteStream");
      const bs = new ByteStream();
      bs.writeInt(0); // HighID = 0 -> new account
      bs.writeInt(0); // LowID = 0
      bs.writeString(""); // Token
      bs.writeVInt(15); // Major
      bs.writeVInt(535); // Build
      bs.writeVInt(13); // Content (!= 377)
      bs.writeString(""); // resourceSha
      console.log("[crypto] fabricated login (new account); framed plaintext session");
      return bs.buffer.slice(0, bs.offset);
    }
    if (!this.authenticated) return payload;
    // The client strips 16 bytes before sending: wire = [16][payload]. Remove them.
    if (payload.length < 16) return payload;
    return payload.slice(16);
  }

  decrypt(packetId, payload) {
    payload = Buffer.from(payload);

    if (this.framed) return this._decryptFramed(packetId, payload);

    // 🟢 Unencrypted packets
    if (packetId === 10100) return payload;

    if (packetId === 10101) {
      // 1️⃣ read client public key (plain)
      this.client_public_key = payload.slice(0, 32);
      console.log("CLIENTPUB " + this.client_public_key.toString("hex"));
      console.log("LOGINRAW " + payload.toString("hex")); // clientpub(32)+box, to verify serverPub offline

      const encrypted = payload.slice(32);

      // 2️⃣ derive shared key
      this.shared_key = Buffer.from(
        nacl.box.before(this.client_public_key, this.server_private_key),
      );

      // 3️⃣ derive LOGIN NONCE (DO NOT CHANGE THIS)
      const loginNonce = new Nonce(
        null,
        this.client_public_key,
        this.server_public_key,
      );

      console.log("SHARED", this.shared_key.toString("hex"));
      console.log("LOGIN NONCE", loginNonce.toBuffer().toString("hex"));

      // 4️⃣ decrypt login payload
      const opened = nacl.secretbox.open(
        encrypted,
        loginNonce.toBuffer(),
        this.shared_key,
      );

      if (!opened) {
        throw new Error("Login decryption failed (nonce/key mismatch)");
      }

      const decrypted = Buffer.from(opened);

      // 5️⃣ extract session values
      this.decryptNonce = new Nonce(decrypted.slice(0, 24));
      this.encryptNonce = new Nonce(decrypted.slice(24, 48));

      this.authenticated = true;

      return decrypted.slice(48);
    }

    // 🟢 Still not encrypted yet
    if (!this.decryptNonce) return payload;

    if (!this.authenticated) {
      throw new CryptographyError("Not authenticated");
    }

    this.decryptNonce.increment();

    return Buffer.from(
      nacl.secretbox.open(
        payload,
        this.decryptNonce.toBuffer(),
        this.shared_key,
      ),
    );
  }

  encrypt(packetId, payload) {
    payload = Buffer.from(payload);

    if (this.framed) {
      // Pre-login (ServerHello) goes out as plaintext with no frame; after login the
      // passthrough client expects a 16-byte gap in front of the payload.
      if (!this.authenticated) return payload;
      // The client prepends 16 (BOXZEROBYTES) before crypto_box_open and reads the payload
      // at m[32:]. Since the wire does NOT carry the 16 boxzero bytes, we prepend ONLY 16
      // (where the MAC would go): wire=[16][body] -> client prepends 16 -> m[32:]=body.
      return Buffer.concat([Buffer.alloc(16), payload]);
    }

    // 🟢 No encryption yet
    if (!this.authenticated) return payload;

    this.encryptNonce.increment();

    return Buffer.from(
      nacl.secretbox(payload, this.encryptNonce.toBuffer(), this.shared_key),
    );
  }

  getEncryptionOverhead() {
    return 16;
  }
}

module.exports = {
  Crypto,
  Nonce,
  CryptographyError,
};
