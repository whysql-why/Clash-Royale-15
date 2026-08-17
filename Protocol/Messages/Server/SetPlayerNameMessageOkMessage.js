const PiranhaMessage = require("../../PiranhaMessage");

function isValidString(str) {
  if (typeof str !== "string") return false;

  // Allow:
  // Letters (A-Z, a-z)
  // Numbers (0-9)
  // Space
  // / , . - _ ( ) < >
  const regex = /^[A-Za-z0-9\/,\.\-_()<> ]+$/;

  return regex.test(str);
}

class SetPlayerNameMessageOkMessage extends PiranhaMessage {
  constructor(client, newName) {
    super();
    // v15.535.x: id 21685 (was 27551 in v13). Confirmed by live capture:
    // after SetPlayerName(12471), the server replies with 21685 and THAT closes the name popup.
    this.id = 21685;
    this.client = client;
    this.version = 0;
    this.newName = newName;
  }

  async encode() {
    let badwords = ["dsc.", "discord.", "dsc/"];
    for (let i = 0; i < badwords.length; i++) {
      const badWord = badwords[i];
      if (this.newName.includes(badWord)) {
        this.client.destroy();
      }
    }

    if (!isValidString(this.newName)) {
      this.client.destroy();
    }

    this.client.user.username = this.newName;
    // Exact payload captured from the real server (15B): writeString(name) + 2 bytes 0x00 0x00.
    //   00 00 00 09 "TestName1" 00 00  ->  [int32BE len][name][00][00]
    this.writeString(this.newName);
    this.writeByte(0);
    this.writeByte(0);
  }
}

module.exports = SetPlayerNameMessageOkMessage;
