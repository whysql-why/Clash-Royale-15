const PiranhaMessage = require("../../PiranhaMessage");

class LogoutMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.id = 10208;
    this.client = client;
  }

  async decode() { }

  async process() {
    const playerName = this.client.user.username || "Player";
    
    this.client.log(`${playerName} disconnected`);
    
    this.client.destroy();
  }
}

module.exports = LogoutMessage;