const PiranhaMessage = require('../../PiranhaMessage');
const OwnHomeDataMessage = require('../Server/OwnHomeDataMessage');
const AllianceRoleMessage = require('../Server/AllianceRoleMessage');

class GoHomeMessage extends PiranhaMessage {
  constructor (bytes, client) {
    super(bytes);
    this.client = client;
    this.id = 14575;
    this.version = 1;
  }

  async decode () {}

  async process () {
    // 1. Send the big home "box" (OwnHomeData) first. The named/unnamed template
    //    already handles the name, so no separate name message is needed here.
    await new OwnHomeDataMessage(this.client).send();

    let user = this.client.user;

    // 2. If the player is in a clan, update their clan badge
    if (user.clanId && user.clanId.low > 0) {
      await new AllianceRoleMessage(this.client, user.clanId, 2).send();
    }
  }
}

module.exports = GoHomeMessage;