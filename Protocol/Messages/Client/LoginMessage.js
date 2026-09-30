const PiranhaMessage = require("../../PiranhaMessage");
const LoginFailedMessage = require("../Server/LoginFailedMessage");
const LoginOkMessage = require("../Server/LoginOkMessage");
const OwnHomeDataMessage = require("../Server/OwnHomeDataMessage");
const AvatarNameChangeMessage = require("../Server/AvatarNameChangeMessage");
const SetPlayerNameMessageOkMessage = require("../Server/SetPlayerNameMessageOkMessage");
const AllianceRoleMessage = require("../Server/AllianceRoleMessage");
// Path from Protocol/Messages/Client/ to Utils/
const { createDefaultUser, getAllCardIds } = require("../../../Utils/createDefaultUser");

class LoginMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.client = client;
    this.id = 10101;
    this.version = 1;
  }

  async decode() {
    this.data = {};
    this.data.HighID = this.readInt();
    this.data.LowID = this.readInt();
    this.data.Token = this.readString();
    this.data.Major = this.readVInt();
    this.data.Build = this.readVInt();
    this.data.Content = this.readVInt();
    this.data.resourceSha = this.readString();
    console.log("[LoginMessage] Decoded:", this.data);
  }

  async process() {
    if (this.data.Content === 377) {
      this.client.flagged = true;
    }

    let databaseuser = null;
    let allPlayers = global.database.getAll();

    for (let i = 0; i < allPlayers.length; i++) {
      let plr = allPlayers[i];
      if (plr.id && plr.id.high === this.data.HighID && plr.id.low === this.data.LowID) {
        databaseuser = plr;
        break;
      }
    }

    // New / persistent player
    if (this.data.HighID === 0 && this.data.LowID === 0) {
      // FRAMED mode (crypto-disable): the login arrives as a fabricated 0/0 id. To KEEP
      // PROGRESS we reuse a single persistent user (the same one every login) instead of
      // creating a new one, so changes (name, gold, gems...) persist in the database.
      const framed = this.client.crypto && this.client.crypto.framed;
      if (framed) {
        databaseuser = global.database.getAll().find((u) => u._persist === true);
        if (!databaseuser) {
          const newUser = createDefaultUser(global.newUserId++);
          newUser._persist = true;
          databaseuser = global.database.create(newUser);
          console.log(`[LoginMessage] PERSISTENT user created: ID=${databaseuser.id.low}`);
        } else {
          console.log(`[LoginMessage] Reusing PERSISTENT user: ID=${databaseuser.id.low} name='${databaseuser.username || ""}' gold=${databaseuser.gold}`);
        }
      } else {
        const newUser = createDefaultUser(global.newUserId++);
        databaseuser = global.database.create(newUser);
        console.log(`[LoginMessage] New player created: ID=${databaseuser.id.low}, Token=${databaseuser.token}`);
      }
    } else {
      // Existing player: verify the token
      if (!databaseuser || databaseuser.token !== this.data.Token) {
        // Send error immediately without delay
        new LoginFailedMessage(this.client, {
          reason: "Invalid credentials, please clear app data",
        }).send();
        return;
      }

      // Migrate the old format if needed
      databaseuser = this.migrateUserIfNeeded(databaseuser);
    }

    this.client.user = databaseuser;
    console.log(`[LoginMessage] Player logged in: ${databaseuser.username || "(no name)"} (ID: ${databaseuser.id.low})`);

    // FIX: Send responses IMMEDIATELY without setTimeout delay
    // This prevents packet ordering issues and client timeout
    try {
      await new LoginOkMessage(this.client).send();
      console.log(`[LoginMessage] LoginOkMessage sent successfully`);
      
      await new OwnHomeDataMessage(this.client).send();
      console.log(`[LoginMessage] OwnHomeDataMessage sent successfully`);

      if (this.client.user.clanId && this.client.user.clanId.low > 0) {
        await new AllianceRoleMessage(this.client, this.client.user.clanId, 2).send();
        console.log(`[LoginMessage] AllianceRoleMessage sent successfully`);
      }
    } catch (e) {
      console.error(`[LoginMessage] Error sending login responses:`, e);
      this.client.destroy();
    }
  }

  /**
   * Migrate a player from the old format to the new one.
   */
  migrateUserIfNeeded(user) {
    let needsSave = false;

    // Migrate cards: array -> object
    if (Array.isArray(user.cards)) {
      console.log(`[Migration] Converting cards array to object for user ${user.id.low}`);
      const allCardIds = getAllCardIds();
      const cardsObj = {};

      for (const cardId of allCardIds) {
        cardsObj[String(cardId)] = {
          level: 0,
          count: 0,
          starLevel: 0,
          isUnlocked: false,
        };
      }

      for (const card of user.cards) {
        cardsObj[String(card.id)] = {
          level: card.level || 0,
          count: card.count || 0,
          starLevel: card.starLevel || 0,
          isUnlocked: true,
        };
      }

      user.cards = cardsObj;
      needsSave = true;
    }

    // Add missing fields
    const defaults = {
      nameSet: user.username && user.username !== "" ? 1 : 0,
      xpLevel: 54000002,
      trophies: 0,
      highestTrophies: 0,
      starPoints: 0,
      clanName: "",
      clanRole: 0,
      clanBadge: 0,
      arena: 1,
      nameChangeState: 0,
      discordLink: "",
      showDiscord: 6,
      heroes: {},
      evolutions: {},
      cosmetics: {
        towerSkins: [0],
        activeTowerSkin: 0,
        playerBadge: 0,
        activeBanner: 0,
        unlockedEmotes: [],
      },
    };

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (user[key] === undefined) {
        user[key] = defaultValue;
        needsSave = true;
      }
    }

    // Migrate clanId: number -> object
    if (typeof user.clanId === "number") {
      user.clanId = { high: 0, low: user.clanId };
      needsSave = true;
    }

    if (needsSave) {
      global.database.save(user);
      console.log(`[Migration] User ${user.id.low} migrated successfully`);
    }

    return user;
  }
}

module.exports = LoginMessage;
