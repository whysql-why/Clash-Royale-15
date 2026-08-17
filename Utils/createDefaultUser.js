// Utils/createDefaultUser.js

const { generateToken } = require("./TokenGenerator");
const { getConfig } = require("./config");

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOL CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** All available arenas (GlobalId -> minimum trophies) */
const ARENAS = {
  54000000: 0,    // Training Camp
  54000001: 0,    // Goblin Stadium
  54000002: 400,  // Bone Pit
  54000003: 800,  // Barbarian Bowl
  54000004: 1100, // P.E.K.K.A's Playhouse
  54000005: 1400, // Spell Valley
  54000006: 1700, // Builder's Workshop
  54000007: 2000, // Royal Arena
  54000008: 2300, // Frozen Peak
  54000009: 2600, // Jungle Arena
  54000010: 3000, // Hog Mountain
  54000011: 3400, // Electro Valley
  54000012: 4000, // Spooky Town
  54000013: 4600, // Rascal's Hideout
  54000014: 5000, // Serenity Peak
  54000015: 5500, // Royal Crypt
  54000016: 6000, // Legendary Arena
};

/**
 * Player name state (legacy helper kept for reference).
 *
 *  NAME_STATE_UNSET  (6) -> the "choose your name" popup shows on the client
 *  NAME_STATE_SET    (7) -> name shown normally, no popup
 *  NAME_STATE_CLAN   (9) -> name + clan info shown
 *
 * Note: in template mode the popup is driven by which OwnHomeData template is served
 * (unnamed vs named), not by this byte.
 */
const NAME_STATE = {
  UNSET: 6, // No name -> popup
  SET:   7, // Name set, no clan
  CLAN:  9, // Name set + in a clan
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all card IDs in the game.
 * 26xxxxxx = Troops/Spells/Buildings  (104 cards)
 * 27xxxxxx = Spells                   (18 cards)
 * 28xxxxxx = Buildings/others         (27 cards)
 */
function getAllCardIds() {
  const allCards = [];
  for (let i = 0; i < 104; i++) allCards.push(26000000 + i);
  for (let i = 0; i < 18; i++)  allCards.push(27000000 + i);
  for (let i = 0; i < 27; i++)  allCards.push(28000000 + i);
  return allCards;
}

/**
 * Return the arena that matches the given trophies.
 * @param {number} trophies
 * @returns {number} arena GlobalId
 */
function getArenaFromTrophies(trophies) {
  let arena = 54000001; // Goblin Stadium by default
  for (const [arenaId, minTrophies] of Object.entries(ARENAS)) {
    if (trophies >= minTrophies) arena = Number(arenaId);
  }
  return arena;
}

/**
 * Compute the name state (legacy helper).
 *
 * Rules:
 *  - nameSet !== 1 OR empty username     -> NAME_STATE.UNSET (6) -> popup
 *  - nameSet === 1 + in a clan           -> NAME_STATE.CLAN  (9)
 *  - nameSet === 1, no clan              -> NAME_STATE.SET   (7)
 *
 * nameSet is persisted by SetPlayerNameMessage as soon as the player confirms
 * their name. It's the source of truth, not the username alone.
 *
 * @param {object} user  the full user object
 * @returns {number}
 */
function resolveNameState(user) {
  if (user.nameSet !== 1 || !user.username || user.username.trim() === "") return NAME_STATE.UNSET;
  if (user.clanInfo && user.clanInfo.name && user.clanInfo.name !== "") return NAME_STATE.CLAN;
  return NAME_STATE.SET;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a default user for a new account.
 * @param {number} lowId  low id (low part of the Long)
 * @returns {object}      user object ready to be persisted in the database
 */
function createDefaultUser(lowId) {
  const cfg = getConfig(); // oro/gemas configurables desde config.json
  const defaultDeck = [
    26000026, 26000015, 26000012, 26000000,
    26000004, 26000005, 26000006, 26000007,
  ];

  // ── CARTES ────────────────────────────────────────────────────────────────
  // All cards are unlocked from the start.
  // Starting-deck cards : level 1, count 1.
  // All others          : level 1, count 0.
  const cards = {};
  for (const cardId of getAllCardIds()) {
    const isInDeck = defaultDeck.includes(cardId);
    cards[String(cardId)] = {
      isUnlocked: true,
      level:      1,
      count:      isInDeck ? 1 : 0,
      starLevel:  0,
      evoShards:  0,
      shardCount: 0,
    };
  }

  // ── CHAMPIONS (v13 slots) ─────────────────────────────────────────────────
  // Order observed in the ByteStream:
  // Golden Knight, Archer Queen, Skeleton King, Mighty Miner, Royal Champion, Monk
  const champions = [
    { cardId: 2223169, slotIndex: 0 },
    { cardId: 2223172, slotIndex: 1 },
    { cardId: 2223175, slotIndex: 2 },
    { cardId: 2223165, slotIndex: 3 },
    { cardId: 2223189, slotIndex: 4 },
    { cardId: 2223331, slotIndex: 5 },
  ];

  // ── BANNERS ───────────────────────────────────────────────────────────────
  const banners = [
    { id: 0x3ec600, name: "Lightning", flagsBefore: [0, 0],         flagsAfter: [-1, 0] },
    { id: 0x3ec600, name: "Fortune",   flagsBefore: [1],            flagsAfter: [-1, 0] },
    { id: 0x3ec600, name: "Kings",     flagsBefore: [0, -1, 2, 0], flagsAfter: [-1, 3] },
  ];

  const trophies = 0;
  const arena    = getArenaFromTrophies(trophies);

  return {
    // ── IDENTITY ──────────────────────────────────────────────────────────────
    id:              { high: 0, low: lowId },
    token:           generateToken(),
    /**
     * username: empty at creation -> unnamed OwnHomeData template -> name popup.
     * Once the player confirms a name (SetPlayerName / 12471) it is saved here and
     * the server switches to the named template (no popup on the next login).
     */
    username:        "",
    nameSet:         0,

    // ── PROGRESSION ──────────────────────────────────────────────────────────
    xpLevel:         0,
    xp:              0,
    arena,           // computed from trophies

    trophies,
    highestTrophies:       0,
    legendTrophies:        0,
    seasonTrophies:        0,
    seasonHighestTrophies: 0,
    starPoints:            0,
    badgeTier:             21,   // 0x15 - badge shown in the avatar

    // ── SEASON ────────────────────────────────────────────────────────────────
    seasonId:      202601,
    loadingScreen: "202601 - Loading Screen",

    // ── ECONOMY (configurable in config.json) ─────────────────────────────────
    gold:  (cfg.gold != null ? cfg.gold : 50000),
    gems:  (cfg.gems != null ? cfg.gems : 10000),

    // ── STATS ────────────────────────────────────────────────────────────────
    wins:           0,
    losses:         0,
    threeCrownWins: 0,

    // ── CLAN ─────────────────────────────────────────────────────────────────
    clanInfo: {
      name:             "",
      tag:              "",
      badgeId:          0,
      role:             0,
      type:             0,
      trophiesRequired: 0,
      membersCount:     0,
    },

    // ── SOCIAL ───────────────────────────────────────────────────────────────
    discordLink: "",

    // ── DECKS ────────────────────────────────────────────────────────────────
    deck:       defaultDeck,
    decks:      [defaultDeck],
    activeDeck: 0,

    // ── CARTES ───────────────────────────────────────────────────────────────
    cards,

    // ── CHAMPIONS ─────────────────────────────────────────────────────────────
    champions,

    // ── COSMETICS ─────────────────────────────────────────────────────────────
    equippedTowerSkin: 0,
    equippedScenery:   0,
    emoteDeck:         [-1, -1, -1, -1, -1, -1, -1, -1],
    emotes:            [],
    towerSkins:        [],
    sceneries:         [],
    chestSlots:        [0, 0, 0, 0],
    banners,
  };
}

module.exports = { createDefaultUser, getAllCardIds, resolveNameState, NAME_STATE, getArenaFromTrophies };