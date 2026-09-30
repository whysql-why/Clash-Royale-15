/**
 * PacketDebugger - Utility for logging and analyzing packets
 * Helps identify crypto, framing, and serialization issues
 */

class PacketDebugger {
  /**
   * Log a packet received from client
   */
  static logReceivedPacket(client, packetId, payload, decrypted = null) {
    const ip = client.remoteAddress ? client.remoteAddress.replace(/^::ffff:/, "") : "unknown";
    const raw = Buffer.from(payload || []);
    const payloadHex = raw.slice(0, 32).toString("hex");
    const payloadLen = raw.length;

    console.log(`[PACKET_RX] ${ip} | ID: ${packetId} | Len: ${payloadLen} | Hex: ${payloadHex}${payloadLen > 32 ? "..." : ""}`);

    if (decrypted) {
      const dec = Buffer.from(decrypted || []);
      const decHex = dec.slice(0, 32).toString("hex");
      const decLen = dec.length;
      console.log(`[PACKET_RX] ^^ Decrypted | Len: ${decLen} | Hex: ${decHex}${decLen > 32 ? "..." : ""}`);
    }
  }

  /**
   * Log a packet sent to client
   */
  static logSentPacket(client, packetId, payload, encrypted = null) {
    const ip = client.remoteAddress ? client.remoteAddress.replace(/^::ffff:/, "") : "unknown";
    const raw = Buffer.from(payload || []);
    const payloadHex = raw.slice(0, 32).toString("hex");
    const payloadLen = raw.length;

    console.log(`[PACKET_TX] ${ip} | ID: ${packetId} | Len: ${payloadLen} | Hex: ${payloadHex}${payloadLen > 32 ? "..." : ""}`);

    if (encrypted) {
      const enc = Buffer.from(encrypted || []);
      const encHex = enc.slice(0, 32).toString("hex");
      const encLen = enc.length;
      console.log(`[PACKET_TX] ^^ Encrypted | Len: ${encLen} | Hex: ${encHex}${encLen > 32 ? "..." : ""}`);
    }
  }

  /**
   * Log crypto state at key points
   */
  static logCryptoState(client, label) {
    const ip = client.remoteAddress ? client.remoteAddress.replace(/^::ffff:/, "") : "unknown";
    const crypto = client.crypto || {};

    console.log(`[CRYPTO] ${ip} | ${label}`);
    console.log(`  Authenticated: ${!!crypto.authenticated}`);
    console.log(`  Framed: ${!!crypto.framed}`);
    console.log(`  ClientPub: ${crypto.client_public_key ? crypto.client_public_key.slice(0, 16).toString("hex") + "..." : "null"}`);
    console.log(`  SharedKey: ${crypto.shared_key ? crypto.shared_key.slice(0, 16).toString("hex") + "..." : "null"}`);
    console.log(`  EncNonce: ${crypto.encryptNonce && crypto.encryptNonce.toBuffer ? crypto.encryptNonce.toBuffer().slice(0, 16).toString("hex") + "..." : "null"}`);
    console.log(`  DecNonce: ${crypto.decryptNonce && crypto.decryptNonce.toBuffer ? crypto.decryptNonce.toBuffer().slice(0, 16).toString("hex") + "..." : "null"}`);
  }

  /**
   * Log packet processing error
   */
  static logError(client, packetId, error, context = {}) {
    const ip = client.remoteAddress ? client.remoteAddress.replace(/^::ffff:/, "") : "unknown";
    console.error(`[ERROR] ${ip} | Packet ${packetId} failed`);
    console.error(`  Message: ${error && error.message ? error.message : String(error)}`);
    console.error(`  Stack: ${error && error.stack ? error.stack.split("\n")[1] || "(no stack)" : "(no stack)"}`);
    console.error(`  Context:`, context);
  }
}

module.exports = PacketDebugger;
