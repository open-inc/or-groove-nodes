module.exports = function(RED) {
  function attachMetadataNode(config) {
    RED.nodes.createNode(this, config);
    this.config = config;

    let node = this;

    node.on("input", function(msg) {
      let payloadLength = 1;
      if (Array.isArray(msg.payload)) {
        payloadLength = msg.payload.length;
      }

      if (payloadLength !== node.config.valueTypes.length) {
        this.status({
          fill: "red",
          shape: "dot",
          text: "Ungültige Werte " + JSON.stringify(payload)
        });
        node.error(
          "Es wurde eine falsche Anzahl von Werten übergeben. Erhalten: " +
            payloadLength +
            " Erwartet: " +
            node.config.valueTypes.length,
          msg
        );
        return;
      }

      msg.sensorid = msg.sensorid || node.config.sensorid;
      msg.sensorname = msg.sensorname || node.config.sensorname;
      msg.valueTypes = node.config.valueTypes || [];

      node.send(msg);
      node.status({
        fill: "green",
        shape: "dot",
        text: "Last Value received: " + JSON.stringify(msg.payload)
      });
    });
    node.on("close", function() {
      node.status({});
      node.done();
    });
  }

  RED.nodes.registerType("od-attach-metadata", attachMetadataNode);
};
