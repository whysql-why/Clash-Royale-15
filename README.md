# Clash Royale v15 - Private Server

A lightweight private server for the **Clash Royale v15.535** client. It brings the client
all the way to a fully rendered **home screen** (login + home), lets you **choose a player name**,
and keeps your **name / gold / gems** across logins.

> Educational / reverse-engineering project. Bring your own game client. Not affiliated with Supercell.

---

## What you need

- **Node.js** (https://nodejs.org) - to run the server.
- **A rooted Android device or emulator** (ARM or ARM-translated) with the game client installed
  (package `nullsroyale.rel.free`).
- **adb** (Android platform-tools), in your `PATH` or in the default SDK location.
- The PC and the device on the **same network**; the redirect points the client at the PC.

## How it works

The client encrypts all traffic with NaCl (`crypto_box`) using a hard-coded server public key.
Instead of matching that key, this project uses a **patched `libg.so`** (in `game_files/`) where the
two NaCl functions are turned into a `memcpy` passthrough, so the client talks **plaintext**. The
server then speaks plaintext too (framed mode), and network traffic to the game port is redirected
to the PC.

```
Client (patched libg.so = no crypto, plaintext)
      |  connects to 9339 / 9340
      v
iptables DNAT --> <PC>:9339
      v
Node server (CR_FRAMED=1, plaintext framing)
```

It is a **static file patch** (hot-swap of `libg.so`), **not** runtime injection (Frida is detected
by the client's anti-tamper protection).

## Quick start

1. Connect your rooted device / emulator (`adb devices` should list it).
2. Double-click **`START.bat`**.

The launcher will: install the patched `libg.so` into the game folder, reset the account, apply the
network redirect, start the server in a new window, and launch the client.

Wait ~30-40s. The first run shows the **"choose your name"** popup (new account). Type a name and
confirm - the home loads. If a *"crash report"* popup appears, just dismiss it.

### Manual start

```bat
set CR_FRAMED=1
node index.js
```
Then apply the redirect and patch the client yourself (see `START.bat` / `scripts/cr_redirect.sh`).

## Configuration (gold & gems)

Edit **`config.json`** and reconnect the client (no server restart needed):

```json
{
  "gold": 50000,
  "gems": 10000
}
```

## Project layout

```
Clash Royale v15/
├─ index.js                 server entry point
├─ config.json             gold / gems
├─ package.json
├─ database.json           players (starts empty)
├─ clans.json              clans (starts empty)
├─ Crypto/                 NaCl / framed session
├─ Protocol/               messages (login, home, name, clans, ...)
├─ Utils/                  user factory, config loader
├─ ByteStream/             read/write primitives
├─ node_modules/           dependencies (bundled)
├─ game_files/
│   └─ libg.so             patched client library (crypto-disable)
├─ scripts/
│   └─ cr_redirect.sh      on-device network redirect
└─ START.bat               one-click installer + launcher
```

## Notes / known message IDs (v15.535)

- `10101` Login · `12471` SetPlayerName · `14575` GoHome · `10108` KeepAlive
- `20963` LoginOk · `23245` OwnHomeData · `21685` SetPlayerNameOk (closes the name popup)

The name popup is driven by which OwnHomeData template is served: an account **without** a name gets
the "unnamed" template (popup), and once a name is confirmed the server serves the "named" template
(no popup on the next login).
