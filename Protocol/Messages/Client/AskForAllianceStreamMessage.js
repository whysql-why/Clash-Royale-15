const PiranhaMessage = require('../../PiranhaMessage');
const AllianceDataMessage = require('../Server/AllianceDataMessage');

class AskForAllianceStreamMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.client = client;
    this.id = 18856;
  }

  decode() {
    this.clanHighId = this.readInt();
    this.clanLowId = this.readInt();
  }

  async process() {
    let allClans = global.clansDatabase ? global.clansDatabase.getAll() : [];
    let clan = allClans.find(c => c.id.high === this.clanHighId && c.id.low === this.clanLowId);

    if (!clan && allClans.length > 0) clan = allClans[0];

    if (clan) {
      console.log(`Searching for : ${clan.name}`);
      new AllianceDataMessage(this.client, clan).send();
    } else {
      console.log("Clan Not Found");
    }
  }
}

module.exports = AskForAllianceStreamMessage;