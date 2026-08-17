const PiranhaMessage = require("../../PiranhaMessage");

class AllianceDataMessage extends PiranhaMessage {
  constructor(client, clan) {
    super();
    this.id = 24301;
    this.client = client;
    this.version = 0;
    this.clan = clan || {}; 
  }

  async encode() {
    this.writeBoolean(true); // Say there is a header

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
    
    // Use the real function with category 16
    this.writeDataReference(16, regionId % 1000000);

    this.writeVInt(type);

    // Infinite-loading fix: write 0 members in the header
    this.writeVInt(0);
    
    this.writeVInt(trophies); 
    this.writeVInt(reqTrophies); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 
    this.writeVInt(0); 

    this.writeDataReference(0, 0); 
    
    // Use the real function with category 57
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

    let desc = this.clan.description || "Welcome!";
    this.writeString(desc);

    // Confirm 0 members in the array as well. No more blocking.
    this.writeVInt(0);

    this.writeBoolean(false);
    this.writeBoolean(false);
  }
}
module.exports = AllianceDataMessage;