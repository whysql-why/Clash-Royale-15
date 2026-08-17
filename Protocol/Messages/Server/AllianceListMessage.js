const PiranhaMessage = require("../../PiranhaMessage");

class AllianceListMessage extends PiranhaMessage {
  // Expects to receive an array of clans ready to be displayed
  constructor(client, clans = []) {
    super();
    this.id = 23288;
    this.client = client;
    this.version = 0;
    // Safety: make sure it is actually an array
    this.clans = Array.isArray(clans) ? clans : [];
  }

  async encode() {
    this.writeByte(1);
    this.writeByte(this.clans.length); // The actual number of clans found
    this.writeByte(1);

    for (let clan of this.clans) {
      // Guards to avoid a crash if the database is incomplete
      let highId = (clan.id && clan.id.high) ? clan.id.high : 0;
      let lowId = (clan.id && clan.id.low) ? clan.id.low : 1;
      let name = clan.name || "Unknown clan";
      // Count the number of members in the array
      let memberCount = clan.members ? clan.members.length : (clan.memberCount || 1);
      let badgeId = clan.badge_id || clan.badgeId || 57000007;

      this.writeLong(highId, lowId);
      this.writeString(name);
      
      this.writeHex("00f4243d01");
      this.writeByte(memberCount);
      this.writeHex("b766");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("000000");
      
      this.writeInt(badgeId);

      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00");
      this.writeHex("00000001");
    }
    
    this.writeByte(0x00);
  }
}

module.exports = AllianceListMessage;