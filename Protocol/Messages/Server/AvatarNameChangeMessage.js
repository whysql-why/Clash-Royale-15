const PiranhaMessage = require("../../PiranhaMessage");

class AvatarNameChangeMessage extends PiranhaMessage {
  constructor(client, name) {
    super();
    this.id = 24111;
    this.client = client;
    this.version = 0;
    this.name = name;
  }

  encode() {
    this.writeVInt(201); 

    this.writeString(this.name);
    this.writeVInt(1);
    this.writeVInt(0); 
  }
}

module.exports = AvatarNameChangeMessage;