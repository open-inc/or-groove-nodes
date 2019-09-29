/**
 * This file was copied from the git repository at
 * https://github.com/O-Hahn/node-red-contrib-grovepi/ by Olaf Hahn.
 *
 * Major changes have been made to nearly every function / every part
 * of the code.
 *
 * Included below is the original copyright notice of the file.
 *
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * Authors:
 *    - Olaf Hahn
 *    - Leon Rische
 **/


var GrovePi = require('node-grovepi').GrovePi;
var AnalogSensor = GrovePi.sensors.base.Analog;
var DigitalSensor = GrovePi.sensors.base.Digital;
var UltrasonicSensor = GrovePi.sensors.UltrasonicDigital;
var DHTSensor = GrovePi.sensors.DHTDigital;

var GrovePiWrapper = require('./lib/GrovePiWrapper');
var GestureSensor = require('./lib/GestureSensor');

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
      wrapper.analogOutput(node.pin, msg.payload);
      setStatusValue(node, msg.payload);
    });

    this.on('close', function(done) {
      node.sensor(done);
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
      wrapper.digitalOutput(node.pin, msg.payload);
      setStatusValue(node, msg.payload);
    });

    this.on('close', function(done) {
      node.sensor(done);
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
      wrapper.LCDOutput(node.pin, msg.payload.text, msg.payload.color);
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
        var valueType = msg.valueTypes[i] || { name: 'unknown', unit: ''}
        var line = `${valueType.name}: `;

        // If the number is a floating point value, truncate it to two decimal places
        if (typeof value === 'number') {
            if (value % 1.0 == 0.0) {
              line += value;
            } else {
              line += value.toFixed(2);
            }
        } else {
          line += value;
        }

        if (valueType.unit) {
          line += valueType.unit;
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
    this.sensor = new DigitalSensor(this.pin);
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
    this.sensor = new DigitalSensor(this.pin);
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
    this.sensor = new AnalogSensor(this.pin);
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

  function AirQuality(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.repeat = parseSamplingRate(config);
    this.sensor = new AnalogSensor(this.pin);
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "Raw",
        type: "Number",
      },
      {
        name: "Pollution",
        type: "String",
      }
    ];

    var node = this;
    node.interval = setInterval(function() {
      var value = node.sensor.read();
      var rating = "none";
      if (value > 600) {
        rating = "high";
      } else if (value > 300) {
        rating = "medium";
      } else if (value > 100) {
        rating = "low";
      }

      var msg = {
        payload: [value, rating],
        valueTypes: node.valueTypes,
      };

      setStatusValue(node, value);
      node.send(msg);
    }, node.repeat);

    node.on('close', function(done) {
      clearInterval(node.interval);
      setStatusDone(node);
      done();
    });
  }
  RED.nodes.registerType("grovepi-air-quality", AirQuality);

  function GasSensor(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.repeat = parseSamplingRate(config);
    this.sensor = new AnalogSensor(this.pin);
    this.lastValue = undefined;
    this.valueTypes = [
      {
        name: "density",
        type: "Number",
      },
    ];
    setupSensorNode(this);
  }
  RED.nodes.registerType("grovepi-gas-sensor", GasSensor);

  function HeartRateBPM(config) {
    RED.nodes.createNode(this, config);
    this.pin = config.pin;
    this.repeat = parseSamplingRate(config);
    this.sensor = new DigitalSensor(this.pin);

    this.valueTypes = [
      {
        name: "Rate",
        unit: "BPM",
        type: "Number",
      },
    ];

    this.history = [];
    this.lastReading = undefined;
    this.lastDebounceTime = Date.now();
    this.lastRiseTime = undefined;

    this.value = undefined;
    this.lastValue = undefined;

    this.ringBuffer = [];
    this.ringBufferIndex = 0;
    this.ringBufferSize = 10;

    var node = this;
    setStatusConnected(node);

    node.interval = setInterval(function() {
      var reading = node.sensor.read();
      console.log("Reading", reading);

      var now = Date.now();
      node.lastValue = node.value;
      node.value = reading;

      // Detect rises from 0 to 1
      if (node.lastValue === 0 && node.value === 1) {
        if (node.lastRiseTime) {
          var delta = now - node.lastRiseTime;

          // Add delta between rises to ring buffer
          node.ringBuffer[node.ringBufferIndex] = delta;
          node.ringBufferIndex = (node.ringBufferIndex + 1) % node.ringBufferSize;

          // Average milliseconds between heartbeats
          var average = 0.0;
          node.ringBuffer.forEach(e => average += e);
          average /= node.ringBuffer.length;

          var bpm = 60000 / average;

          var msg = {
            payload: bpm,
            valueTypes: node.valueTypes,
          };

          setStatusValue(node, bpm);
          node.send(msg);
        }
        node.lastRiseTime = now;
      }

      node.lastReading = reading;
    }, 50);

    node.on('close', function(done) {
      clearInterval(node.interval);
      setStatusDone(node);
      done();
    });
  }
  RED.nodes.registerType("grovepi-heart-rate-bpm", HeartRateBPM);
}
