const amqp = require('amqplib/callback_api');

module.exports = function(RED) {
  function RMQOutput(config) {
    RED.nodes.createNode(this, config);

    this.exchange = config.exchange;
    this.username = config.username;
    this.owner = config.owner;

    var url = {
      protocol: 'amqp',
      hostname: config.hostname,
      username: config.username,
      password: config.password,
    };

    var node = this;

    function makeDatapoint(msg) {
      const date = msg.date || (new Date()).getTime();
      return {
        meta: msg.meta || {},
        parent: [],
        id: msg.sensorid || "NodeRedID",
        name: msg.sensorname || "NodeRed",
        user : msg.user || node.owner || "NodeRedUser",
        values: [{
          date,
          value: Array.isArray(msg.payload) ? msg.payload : [msg.payload],
        }],
        valueTypes: msg.valueTypes
      }
    }


    // Only try to connect if everything is configured correctly
    try {
      if (url.hostname && url.username && url.password) {
        amqp.connect(url, (err, conn) => {
          if (conn) {
            return conn.createChannel((err, channel) => {
              channel.assertExchange(node.exchange, 'topic', {durable: true});

              node.status({fill: "green", shape: "dot", text: "Connected"});
              node.on('input', function(msg) {
                var datapoint = makeDatapoint(msg);
                channel.publish(node.exchange, node.sensorid, Buffer.from(JSON.stringify(datapoint)));
              });
            });
          } else {
            node.error("RMQ Output failed to connect");
            node.error(err);
          }
        })
      } else {
        node.error("RMQ Output is not configured");
      }
    } catch (e) {
      node.error(e);
    }
  }
  RED.nodes.registerType("rmq-output", RMQOutput);
}
