const PiranhaMessage = require("../../PiranhaMessage");
const AllianceListMessage = require("../Server/AllianceListMessage");
const LoginFailedMessage = require("../Server/LoginFailedMessage");

class SearchClansMessage extends PiranhaMessage {
  constructor(bytes, client) {
    super(bytes);
    this.id = 19564;
    this.client = client;
    this.version = 1;
  }

  decode() {
    // Skip the parent class offset
    this.readInt();
    this.readInt();
    this.readInt();
    this.readInt();

    // Read the search term
    this.searchTerm = this.readString();
  }

  async process() {
    console.log({ SearchTerm: this.searchTerm });

    // Admin command
    if (this.searchTerm === "/max") {
      new LoginFailedMessage(this.client, {
        reason: "maxxed all cards",
      }).send();
      return;
    }

    let allClans = global.clansDatabase ? global.clansDatabase.getAll() : [];
    let resultClans = [];

    // If the player just opened the tab (empty search)
    if (!this.searchTerm || this.searchTerm === "") {
      // Recommend the first 50 clans
      resultClans = allClans.slice(0, 50);
    } else {
      // If they typed something, filter the existing clans
      let searchLower = this.searchTerm.toLowerCase();

      resultClans = allClans.filter(clan => {
        let clanName = clan.name ? clan.name.toLowerCase() : "";
        let clanDesc = clan.description ? clan.description.toLowerCase() : "";

        // Match on name or description
        return clanName.includes(searchLower) || clanDesc.includes(searchLower);
      });
    }

    // Pass the filtered list to the response packet
    new AllianceListMessage(this.client, resultClans).send();
  }
}

module.exports = SearchClansMessage;