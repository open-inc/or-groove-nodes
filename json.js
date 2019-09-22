module.exports = function(RED) {
  function toJsonNode(config) {
    RED.nodes.createNode(this, config);
    console.log("OD-NODE:", config);
    this.config = config;
    let node = this;
    node.on("input", function(msg) {
      let config = node.config;
      let ts = msg.date || new Date().getTime();
      let id2Use = msg.sensorid || node.config.sensorid;
      let owner2use = msg.owner || node.config.owner;
      let value2send = msg.payload;
      let name2Use = msg.sensorname || node.config.sensorname;
      let meta2Use = msg.meta || {};
      if (!Array.isArray(value2send)) {
        value2send = [value2send];
      }

      if (value2send.length !== config.valueTypes.length) {
        this.status({
          fill: "red",
          shape: "dot",
          text: "Ungültige Werte " + JSON.stringify(value2send)
        });
        node.error(
          "Es wurde eine falsche Anzahl von Werten übergeben. Erhalten: " +
            value2send.length +
            " Erwartet: " +
            config.valueTypes.length,
          msg
        );
        return;
      }

      this.status({
        fill: "green",
        shape: "dot",
        text: "Last Value received: " + JSON.stringify(value2send)
      });

      let json =
        "{" +
        '"id" : "defaultID  ",' +
        '"parent" : [],' +
        '"meta" : {},' +
        '"name" : "default",' +
        '"valueTypes" : [],' +
        '"user" : "defaultUser",' +
        '"values" : []' +
        "}";
      let toSend = JSON.parse(json);
      toSend.valueTypes = config.valueTypes;
      toSend.id = id2Use;
      toSend.user = owner2use;
      toSend.name = name2Use;
      toSend.meta = meta2Use;
      let value = {
        date: ts,
        value: value2send
      };

      toSend.values = [value];

      newmsg = { payload: toSend };
      node.send(newmsg);
      nodeStatus = { fill: "green", shape: "dot" };
    });
    node.on("close", function() {
      //clearInterval(refreshStatusIntervalId);
      nodeStatus = {};
      node.status({});
    });
  }

  RED.nodes.registerType("od-converter-nodered", toJsonNode);
};
