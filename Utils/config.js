const fs = require("fs");
const path = require("path");

// config.json lives in the server root (one level above Utils/)
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

/**
 * Read config.json FRESH on every call, so editing the file takes effect on the next
 * login without restarting the server. Returns {} if it is missing or invalid.
 */
function getConfig() {
  try {
    let raw = fs.readFileSync(CONFIG_PATH, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip UTF-8 BOM if present
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

module.exports = { getConfig };
