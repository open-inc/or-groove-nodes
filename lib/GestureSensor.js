var i2c = require('i2c-bus')
var INITIAL_REGISTER_VALUES = require('./InitialRegisterValues')

// Based on
// - https://github.com/Seeed-Studio/Gesture_PAJ7620/
// - https://github.com/DexterInd/GrovePi/blob/master/Software/Python/grove_gesture_sensor/grove_gesture_sensor.py
function GestureSensor() {
  this.SENSOR_ID = 0x73;

  // Minimum time to way between reading gestures
  this.GESTURE_DELAY_TIME = 100; // ms
  // Delay when entering a gesture
  this.GESTURE_ENTRY_TIME = 400; // ms
  // Delay when exiting a gesture
  this.GESTURE_QUIT_TIME = 600; // ms

  this.GESTURE_LOOKUP = {
    [1 << 0]: "right",
    [1 << 1]: "left",
    [1 << 2]: "up",
    [1 << 3]: "down",
    [1 << 4]: "forward",
    [1 << 5]: "backward",
    [1 << 6]: "clockwise",
    [1 << 7]: "counterclockwise",
  }

  // right, left, up, down
  this.WAIT_ENTRY_MASK = 0b00001111;

  // forward, backward
  this.ENTRY_MASK = 0b00110000;

  // every gesture besides "wave"
  this.OUTPUT_MASK = 0b11111111;

  // Set to false when the sensor is closed, used inside the polling
  // loop to determine when to stop reading gestures
  this.active = true;
  this.bus = i2c.openSync(1);
}

GestureSensor.prototype.init = function() {
  var byte0 = this.bus.readByteSync(this.SENSOR_ID, 0);
  var byte1 = this.bus.readByteSync(this.SENSOR_ID, 1);

  // Select register bank 0
  this.bus.writeByteSync(this.SENSOR_ID, 0xEF, 0);
  this.bus.writeByteSync(this.SENSOR_ID, 0xEF, 0);

  if (byte0 != 0x20 || byte1 != 0x76) {
    // TODO: Throw real error
    console.error("Error with gesture sensor");
  }

  INITIAL_REGISTER_VALUES.forEach((v) => {
    this.bus.writeByteSync(this.SENSOR_ID, v[0], v[1]);
  });

  // Select register bank 0
  this.bus.writeByteSync(this.SENSOR_ID, 0xEF, 0);
}

GestureSensor.prototype.close = function() {
  this.active = false;
  this.bus.closeSync();
}

// Read a gesture, callback with the gesture that was read,
// then continue reading.
//
// Depending on the gesture that was detected,
// wait GESTURE_QUIT_TIME before reading the next gesture.
GestureSensor.prototype.readGestures = function(cb) {
  if (this.active) {
    var data = this.bus.readByteSync(this.SENSOR_ID, 0x43, 1);

    if ((data & this.WAIT_ENTRY_MASK) != 0) {
      setTimeout(() => {
        var data2 = this.bus.readByteSync(this.SENSOR_ID, 0x43, 1);
        if ((data2 & this.ENTRY_MASK) != 0) {
          cb(this.GESTURE_LOOKUP[data2]);
          setTimeout(() => this.readGestures(cb), this.GESTURE_QUIT_TIME);
        } else {
          cb(this.GESTURE_LOOKUP[data]);
          this.readGestures(cb);
        }
      }, this.GESTURE_ENTRY_TIME);
    } else if ((data & this.OUTPUT_MASK) != 0) {
      if ((data & this.ENTRY_MASK) != 0) {
        cb(this.GESTURE_LOOKUP[data]);
        setTimeout(() => this.readGestures(cb), this.GESTURE_QUIT_TIME);
      } else {
        cb(this.GESTURE_LOOKUP[data]);
        setTimeout(() => this.readGestures(cb), this.GESTURE_DELAY_TIME);
      }
    } else if (this.bus.readByteSync(this.SENSOR_ID, 0x44, 1) == 1) {
      cb("wave")
      setTimeout(() => this.readGestures(cb), this.GESTURE_DELAY_TIME);
    } else {
      setTimeout(() => this.readGestures(cb), this.GESTURE_DELAY_TIME);
    }
  }
}

module.exports = GestureSensor;
