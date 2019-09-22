var GrovePi = require('node-grovepi').GrovePi;
var AnalogSensor = GrovePi.sensors.base.Analog;
var DigitalSensor = GrovePi.sensors.base.Digital;
var UltrasonicSensor = GrovePi.sensors.UltrasonicDigital;
var DHTSensor = GrovePi.sensors.DHTDigital;

var GrovePiWrapper = require('./lib/GrovePiWrapper');

// Mark a node as connected
function setStatusConnected(node) {
  node.status({fill: "green", shape: "dot", text: "Connected"});
}

// Mark a node as connected
function setStatusValue(node, value) {
  if (Array.isArray(value)) {
    node.status({fill: "green", shape: "dot", text: "Last Value: " + value.join(",  ")});
  } else {
    node.status({fill: "green", shape: "dot", text: "Last Value: " + value});
  }
}

// Mark a node as having an error
function setStatusError(node, message) {
  node.error(message);
  node.status({fill: "red", shape: "ring", text: "Error"});
}

// Mark a node as done
function setStatusDone(node) {
  if (node.done) {
    node.status({});
    node.done();
  } else {
    node.status({fill: "red", shape: "ring", text: "Stopped"});
  }
}

// Code shared between all input / sensor nodes
function setupSensorNode(node) {
  setStatusConnected(node);

  // if (node.mode === "event") {
  //   node.interval = setInterval(function() {
  //     var value = node.sensor.read();

  //     if (value !== node.lastValue) {
  //       node.lastValue = value;
  //       var msg = {
  //         payload: value,
  //         valueTypes: node.valueTypes,
  //       };

  //       setStatusValue(node, value);
  //       node.send(msg);
  //     }
  //   }, 100);
  // } else {
    node.interval = setInterval(function() {
      var value = node.sensor.read();
      var msg = {
        payload: value,
        valueTypes: node.valueTypes,
      };

      setStatusValue(node, value);
      node.send(msg);
    }, node.repeat);
  // }

  node.on('close', function(done) {
    clearInterval(node.interval);
    setStatusDone(node);
    done();
  });
}

function parseSamplingRate(config) {
  var interval = config.interval;
  var unit = config.unit;

  switch (unit) {
  case 'ms':
    return Math.max(50, interval);
  case 's':
    return interval * 1000;
  case 'm':
    return interval * 1000 * 60;
  case 'h':
    return interval * 1000 * 60 * 60;
  default:
    return 1000;
  }
}

module.exports = function(RED) {
  var wrapper = new GrovePiWrapper();
  wrapper.init();

  function UltrasonicRangeSensor(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.sensor = new UltrasonicSensor(config.pin);
    this.repeat = parseSamplingRate(config);
    this.mode = config.mode;
    this.lastValue = undefined;
    this.valueTypes = [{
      name: "Distance",
      unit: "cm",
      type: "Number",
    }];

    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-ultrasonic", UltrasonicRangeSensor);

  function DHT11(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.sensor = new DHTSensor(config.pin, '0');
    this.repeat = parseSamplingRate(config);
    // The DHT11 & DHT22 sensors are not fast enough to be run in event mode
    this.mode = "timer";
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "Temperature",
        unit: "C",
        type: "Number",
      },
      {
        name: "Humidity",
        unit: "%",
        type: "Number",
      },
      {
        name: "Heat Index",
        type: "Number",
      }
    ];

    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-dht11", DHT11);

  function DHT22(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.sensor = new DHTSensor(config.pin, '1');
    this.repeat = parseSamplingRate(config);
    // The DHT11 & DHT22 sensors are not fast enough to be run in event mode
    this.mode = "timer";
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "Temperature",
        unit: "°C",
        type: "Number",
      },
      {
        name: "Humidity",
        unit: "%",
        type: "Number",
      },
      {
        name: "Heat Index",
        type: "Number",
      }
    ];

    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-dht22", DHT22);

  function PWM_LED(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;

    var node = this;
    setStatusConnected(node);

    this.on('input', function(msg) {
      wrapper.analogOutput(this.pin, msg.payload);
      setStatusValue(node, msg.payload);
    });

    this.on('close', function(done) {
      this.sensor(done);
      setStatusDone(node);
    });
  }
  RED.nodes.registerType("grovepi-pwm-led", PWM_LED);


  function DigitalOutput(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;

    var node = this;
    setStatusConnected(node);

    this.on('input', function(msg) {
      wrapper.digitalOutput(this.pin, msg.payload);
      setStatusValue(node, msg.payload);
    });

    this.on('close', function(done) {
      this.sensor(done);
      setStatusDone(node);
    });
  }
  RED.nodes.registerType("grovepi-led", DigitalOutput);
  RED.nodes.registerType("grovepi-relay", DigitalOutput);
  RED.nodes.registerType("grovepi-buzzer", DigitalOutput);

  function RGB_LCD(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;

    var node = this;
    setStatusConnected(node);

    this.on('input', function(msg) {
      wrapper.LCDOutput(this.pin, msg.payload.text, msg.payload.color);
    });

    this.on('close', function(done) {
      setStatusDone(node);
    });
  }
  RED.nodes.registerType("grovepi-rgblcd", RGB_LCD);

  function DatapointLCD(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.lastText = undefined;

    var node = this;
    setStatusConnected(node);

    this.on('input', function(msg) {
      var values = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
      var limit = Math.min(2, values.length);

      var text = '';
      for (var i = 0; i < limit; i++) {
        var value = values[i];
        var line = '';

        // If the number is a floating point value, truncate it to two decimal places
        if (value % 1.0 == 0.0) {
          line += value;
        } else {
          line += value.toFixed(2);
        }

        if (msg.valueTypes && msg.valueTypes.length == values.length) {
          var valueType = msg.valueTypes[i];
          if (valueType.unit) {
            line += `${valueType.unit} ${valueType.name}`;
          } else {
            line += ` ${valueType.name}`;
          }
        }

        // Limit lines to 16 characters
        text += line.slice(0, 16);
        if (i < (limit - 1)) {
          text += '\n';
        }
      }

      // Only update if the text changed
      if (text !== node.lastText) {
        node.lastText = text;
        wrapper.LCDOutput(node.pin, text);
      }
    });

    this.on('close', function(done) {
      setStatusDone(node);
    });
  }
  RED.nodes.registerType("grovepi-datapoint-lcd", DatapointLCD);

  function Button(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.repeat = parseSamplingRate(config);
    this.sensor = new Digital(this.pin);
    this.mode = config.mode;
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "Button State",
        type: "Boolean",
      }
    ];

    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-button", Button);

  function HeartRate(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.repeat = parseSamplingRate(config);
    this.sensor = new Digital(this.pin);
    this.mode = config.mode;
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "Reading",
        type: "Number",
      }
    ];

    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-heart-rate", HeartRate);

  function Rotary(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.repeat = parseSamplingRate(config);
    this.sensor = new Analog(this.pin);
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "Rotation",
        type: "Number",
      }
    ];

    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-rotary", Rotary);
}