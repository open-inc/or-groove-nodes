var i2c = require('i2c-bus')
var INITIAL_REGISTER_VALUES = require('./InitialRegisterValues')

function GestureSensor() {
  this.SENSOR_ID = 0x73;
  this.GESTURE_ENTRY_TIME = 800; // ms
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
}

GestureSensor.prototype.init = function() {
  var byte0 = this.readByte(0);
  var byte1 = this.readByte(1);

  // Select register bank 0
	this.writeByte(0xEF, 0);
	this.writeByte(0xEF, 0);

  if (byte0 == 0x20 && byte1 == 0x76) {
    console.log("Gesture sensor wake-up finished");
  } else {
    // TODO: Throw real error?
    console.log("Error with gesture sensor");
    console.log("Byte 0: ", byte0);
    console.log("Byte 1: ", byte1);
  }

  for (var register in this.INITIAL_REGISTER_VALUES) {
    this.writeByte(register, this.INITIAL_REGISTER_VALUES[register]);
  }

  // Select register bank 0
	this.writeByte(0xEF, 0);
}

GestureSensor.prototype.writeWord = function(addr, word) {
  var bus = i2c.openSync(1);
  bus.writeWordSync(this.SENSOR_ID, addr, word);
  bus.closeSync();
}

GestureSensor.prototype.readWord = function(addr) {
  var bus = i2c.openSync(1);
  var res = bus.readWordSync(this.SENSOR_ID, addr);
  bus.closeSync();
  return res;
}

GestureSensor.prototype.writeByte = function(addr, byte) {
  var bus = i2c.openSync(1);
  bus.writeByteSync(this.SENSOR_ID, addr, byte);
  bus.closeSync();
}

GestureSensor.prototype.readByte = function(addr) {
  var bus = i2c.openSync(1);
  var res = bus.readByteSync(this.SENSOR_ID, addr);
  bus.closeSync();
  return res;
}

GestureSensor.prototype.readGesture = function(cb) {
  var data = this.readByte(0x43, 1)
  console.log("Data1:", data);
  if ((data & this.WAIT_ENTRY_MASK) != 0) {
    setTimeout(() => {
      var data2 = this.readByte(0x43, 1);
      console.log("Data2:", data2);
      if ((data2 & this.ENTRY_MASK) != 0) {
        cb(this.GESTURE_LOOKUP[data2])
      } else {
        cb(this.GESTURE_LOOKUP[data])
      }
    }, this.GESTURE_ENTRY_TIME);
  } else if ((data & this.OUTPUT_MASK) != 0) {
    cb(this.GESTURE_LOOKUP[data])
  } else if (this.readByte(0x44, 1) == 1) {
    cb("wave")
  } else {
    cb(null)
  }
}

module.exports = GestureSensor;
