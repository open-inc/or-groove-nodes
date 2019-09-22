const amqp = require('amqplib/callback_api');

module.exports = function(RED) {
  function RMQOutput(config) {
    this.exchange = config.exchange;
    this.durable = config.durable;
    this.id = config.id;

    var url = {
      protocol: 'amqp',
      hostname: config.hostname,
      username: config.username,
      password: config.password,
    };

    var node = this;

    function makeDatapoint(msg) {
      const time = msg.date || (new Date()).getTime();
      return {
        id: config.id || "NodeRed",
        name: config.name || "NodeRed",
        user: config.user || "NodeRed",
        values: [{
          date: time,
          value: Array.isArray(msg.payload) ? msg.payload : [msg.payload],
        }],
        valueTypes: msg.valueTypes
      }
    }

    RED.nodes.createNode(this, config);

    amqp.connect(url, (err, conn) => {
      return conn.createChannel((err, channel) => {
        channel.assertExchange(node.exchange, 'topic', {durable: node.durable});

        node.status({fill: "green", shape: "dot", text: "Connected"});
        node.on('input', function(msg) {
          var datapoint = makeDatapoint(msg);
          channel.publish(node.exchange, node.id, Buffer.from(JSON.stringify(datapoint)));
        });
      });
    })
  }
  RED.nodes.registerType("rmq-output", RMQOutput);

  function RMQInput(config) {
    this.exchange = config.exchange;
    this.durable = config.durable;
    this.id = config.id;

    var url = {
      protocol: 'amqp',
      hostname: config.hostname,
      username: config.username,
      password: config.password,
    };

    RED.nodes.createNode(this, config);
    var node = this;

    amqp.connect(url, (err, conn) => {
      return conn.createChannel((err, channel) => {
        channel.assertExchange(node.exchange, 'topic', {durable: node.durable});
        node.status({fill: "green", shape: "dot", text: "Connected"});

        channel.assertQueue('', {exclusive: true}, (err, qok) => {
          let queue = qok.queue;
          channel.bindQueue(queue, node.exchange, '#');
          channel.consume(queue, (data) => {
            var json = JSON.parse(data.content.toString());

            json.values.forEach((value) => {
              var msg = {
                payload: value.value,
                date: value.date,
                valueTypes: json.valueTypes,
              };

              node.send(msg);
            });
          });
        });
      });
    })
  }

  RED.nodes.registerType("rmq-input", RMQInput);
}
