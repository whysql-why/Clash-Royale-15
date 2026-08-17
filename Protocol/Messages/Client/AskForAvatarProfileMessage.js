const PiranhaMessage = require("../../PiranhaMessage");
const AvatarProfileMessage = require("../Server/AvatarProfileMessage");

class AskForAvatarProfileMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.client = client;
    this.id = 10454;
    this.version = 0;
  }

  async decode() {
  }

  async process() {
    // The server replies immediately with packet 24334 (AvatarProfileMessage).
    // Pass the client so it can use this.client.user
    new AvatarProfileMessage(this.client).send();
  }
}

module.exports = AskForAvatarProfileMessage;