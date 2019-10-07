var GrovePi = require('node-grovepi').GrovePi;
var AnalogSensor = GrovePi.sensors.base.Analog;

//same class can be used for the sound sensor
function LoudnessSensor(pin, samplespersecond) {
  AnalogSensor.apply(this, Array.prototype.slice.call(arguments))
  this.samplespersecond = samplespersecond || 5
  this.results = new Array(this.samplespersecond)
  this.results.fill(0.0)
  this.index = 0
}
LoudnessSensor.prototype = new AnalogSensor()

//returns loudness average and max for values taken since the last time it was called
LoudnessSensor.prototype.readAvgMax = function () {
  let sum = this.results.reduce((acc, cur) => acc + cur, 0)
  let max = this.results.reduce((acc, cur) => Math.max(acc, cur));

  return {
    avg: sum / this.samplespersecond,
    max
  }
}

LoudnessSensor.prototype.init = function () {
  this.interval = setInterval(() => {
    this.results[this.index] = this.read();
    this.index = (this.index + 1) % this.samplespersecond;
  }, 1000 / this.samplespersecond)
}

LoudnessSensor.prototype.stop = function () {
  clearInterval(this.interval)
}

module.exports = LoudnessSensor
