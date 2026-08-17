const PiranhaMessage = require("../../PiranhaMessage");

class AllianceRoleMessage extends PiranhaMessage {
  constructor(client, clanId, role) {
    super();
    this.id = 24333;
    this.client = client;
    this.version = 0;
    
    this.clanId = clanId;
    this.role = role || 2;
  }

  encode() {
    // Force the client to register its new clan
    this.writeLong(this.clanId.high, this.clanId.low);
    this.writeVInt(this.role);
  }
}

module.exports = AllianceRoleMessage;