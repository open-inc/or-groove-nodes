var GrovePi = require('node-grovepi').GrovePi;
var Board = GrovePi.board

var GestureSensor = require('./lib/GestureSensor');

var board = new Board({
  debug: true,
  onError: function(err) {
    console.log('Error with the grovePi board: ', err)
    console.log(err)
  },
  onInit: function(res) {
    if (res) {
      var sensor = new GestureSensor();
      sensor.init();

      setInterval(() => {
        sensor.readGesture((gesture) => {
          console.log(gesture);
        });
      }, 1000);
    }
  }
})

board.init()
