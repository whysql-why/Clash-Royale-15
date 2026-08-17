const PiranhaMessage = require("../../PiranhaMessage");
const SetPlayerNameMessageOkMessage = require("../Server/SetPlayerNameMessageOkMessage");
const fs = require("fs");

class SetPlayerNameMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.client = client;
    this.id = 12471; // v15.535.x (was 16334 in v13) - confirmed by live capture (payload carries the name)
    this.version = 0;
  }

  async decode() {
    this.readByte();
    this.newName = this.readString();
  }

  async process() {
    this.client.user.username = this.newName;
    this.client.user.nameSet = 1;
    this.client.user.nameChangeState = 0;

    try {
      let allPlayers = global.database.getAll();
      for (let i = 0; i < allPlayers.length; i++) {
        if (allPlayers[i].id.high === this.client.user.id.high && allPlayers[i].id.low === this.client.user.id.low) {
          allPlayers[i].username = this.newName;
          allPlayers[i].nameSet = 1;
          break;
        }
      }
      fs.writeFileSync("./database.json", JSON.stringify(allPlayers, null, 2));
      console.log(`[SERVER] >> Player name saved: ${this.newName}`);
    } catch (e) {
      console.error("[SERVER] >> Error while saving the player name:", e);
    }

    // v15: a SINGLE message, id 21685 (writeString(name) + 00 00), closes the name popup.
    // (the v13 ids 27551/24111 do NOT exist in v15 and crash the client -> removed)
    await new SetPlayerNameMessageOkMessage(this.client, this.newName).send();
  }
}

module.exports = SetPlayerNameMessage;