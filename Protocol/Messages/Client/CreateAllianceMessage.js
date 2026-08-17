const PiranhaMessage = require("../../PiranhaMessage");
const AllianceStreamMessage = require("../Server/AllianceStreamMessage");
const AllianceRoleMessage = require("../Server/AllianceRoleMessage");

class CreateAllianceMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.id = 12696;
    this.client = client;
  }

  decode() {
    this.badgeId = this.readInt();
    this.requiredTrophies = this.readVInt();
    this.name = this.readString();
    this.description = this.readString();
    this.regionId = this.readInt();
    this.type = this.readVInt();
    this.familyType = this.readVInt();
  }

  async process() {
    console.log(`Clan created: "${this.name}" by ${this.client.user.username}`);

    const newClan = global.clansDatabase.create({
      id: { high: 0, low: Math.floor(Math.random() * 1000000) + 100 },
      name: this.name,
      description: this.description,
      badge_id: this.badgeId,
      type: this.type,
      required_trophies: this.requiredTrophies,
      region_id: this.regionId,
      members: [{ id: this.client.user.id, name: this.client.user.username, role: 2, donations: 0 }],
      trophies: 0
    });

    this.client.user.clanId = newClan.id;
    global.database.update(this.client.user._systemid, this.client.user);
    
    new AllianceRoleMessage(this.client, newClan.id, 2).send();
    new AllianceStreamMessage(this.client, newClan).send();
  }
}
module.exports = CreateAllianceMessage;