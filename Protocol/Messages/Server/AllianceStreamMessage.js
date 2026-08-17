const PiranhaMessage = require("../../PiranhaMessage");

class AllianceStreamMessage extends PiranhaMessage {
  constructor(client, clan) {
    super();
    this.id = 28278;
    this.client = client;
    this.version = 0;
    this.clan = clan || {}; 
  }

  async encode() {
    this.writeBoolean(true); 

    let highId = (this.clan.id && this.clan.id.high) ? this.clan.id.high : 0;
    let lowId = (this.clan.id && this.clan.id.low) ? this.clan.id.low : 1;
    let name = this.clan.name || "Clan";
    let badgeId = this.clan.badge_id || 57000006;
    let type = this.clan.type || 1;
    let reqTrophies = this.clan.required_trophies || 0;
    let trophies = this.clan.trophies || 0;
    let regionId = this.clan.region_id || 16000016;

    this.writeLong(highId, lowId); 
    this.writeString(name); 
    
    this.writeDataReference(16, regionId % 1000000);

    this.writeVInt(type); 
    this.writeVInt(0); // 0 members to avoid the freeze
    this.writeVInt(trophies); 
    this.writeVInt(reqTrophies); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 

    this.writeDataReference(0, 0); 
    this.writeDataReference(57, badgeId % 1000000);

    this.writeBoolean(false); 
    this.writeVInt(0);
    this.writeVInt(0);
    this.writeVInt(0);
    this.writeBoolean(false);
    this.writeBoolean(false);
    this.writeBoolean(false);
    this.writeBoolean(false);
    this.writeVInt(0);
    this.writeBoolean(false);
    this.writeVInt(0);

    let desc = this.clan.description || "Chat!";
    this.writeString(desc);

    this.writeVInt(0); // 0 messages in the chat
    this.writeVInt(0);

    this.writeBoolean(false);
    this.writeBoolean(false);
  }
}
module.exports = AllianceStreamMessage;