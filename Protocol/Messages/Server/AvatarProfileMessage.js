const PiranhaMessage = require("../../PiranhaMessage");

class AvatarProfileMessage extends PiranhaMessage {
  constructor(client, profileUser = null) {
    super();
    this.id = 24334;
    this.client = client;
    this.version = 0;
    
    // If no specific player is requested, show the profile of whoever clicked
    this.profileUser = profileUser || this.client.user;
  }

  async encode() {
    const user = this.profileUser;

    // 1. Player identification
    this.writeInt(user.id.high);
    this.writeInt(user.id.low);

    // 2. Raw hex block (with the 3 leading zeros)
    // No writeVInt() before it, just append the original string
    this.writeHex(
      "00000080840c80840c7f00007f00007f00007f000000000000000000000115000000000000000000000001000000000200000000000000000300000500060300000000004c4b400121ec41000300010000004c4b400121ec44000300020000004c4b400121ec47000300030000004c4b400121ec3d000300040000004c4b400121ec55000300050000004c4b400121ece3000300000000053ec600000000094c696768746e696e670000007f007f00000000053ec60000000007466f7274756e650001007f007f00000000053ec600000000054b696e6773"
    );

    // Clan + end
    this.writeByte(0); // No clan
    this.writeByte(0); // Terminator
  }
}

module.exports = AvatarProfileMessage;