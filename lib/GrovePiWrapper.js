/**
 * This file was copied from the git repository at
 * https://github.com/O-Hahn/node-red-contrib-grovepi/ by Olaf Hahn.
 *
 * Mayor changes have been made to nearly every function / every part
 * of the code.
 *
 * Included below is the original copyright notice included in the files.
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
var i2c = require('i2c-bus');
var sleep = require('sleep');

var CssColors = require('./CssColors');

var Board = GrovePi.board;
var Commands = GrovePi.commands;

var GrovePiWrapper = function() {
  if (this.board) {
    this.board = this.init.apply(this);
  }
};

GrovePiWrapper.prototype.init = function() {
  var board = new Board({
    debug: true,
    onError: function(err) {
      if (err != "Error: GrovePI is already initialized") {
        console.error('Unable to initialize GrovePI board:', err);
      }
    },
    onInit: function(res) {}
  });

  board.init();
  return board;
};

// Support different types of input values, boolean and numeric
GrovePiWrapper.prototype.digitalOutput = function(pin, value){
  if (value === 0 || value === 1 || value === true || value === false) {
    this.board.writeBytes(Commands.dWrite.concat([pin, value, Commands.unused]));
  } else {
    console.error('Invalid digital value', value);
  }
};

GrovePiWrapper.prototype.analogOutput = function(pin, value) {
  if (0 <= value && value <= 255) {
    value = Math.round(value);
    this.board.writeBytes(Commands.aWrite.concat([pin, value, Commands.unused]));
  } else {
    console.error('Invalid analog out value:', value);
  }
};

GrovePiWrapper.prototype.LCDOutput = function(pin, text, color) {
  // Default to a bright green
  var rgbColor = [0, 255, 0];
  if (typeof color === 'string' && CssColors[color]) {
    rgbColor = CssColors[color]
  } else if (Array.isArray(color) && color.length === 3) {
    rgbColor = color;
  } else if (color) {
    console.error("Invalid RGB color:", color);
  }

  // Make sure text is a string
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }

  // Split text into lines, either based on newlines or based on line length
  var lines = text.split('\n');
  var line1 = lines[0].slice(0, 16);
  var line2 = "";

  if (lines[0].length > 16) {
    line2 = lines[0].slice(16, 32);
  } else if (lines.length >= 2) {
    line2 = lines[1].slice(0, 16);
  }

  // Set background color
  var i2c1 = i2c.openSync(1);
  i2c1.writeByteSync(0x62, 0x00, 0)
  i2c1.writeByteSync(0x62, 0x01, 0)
  i2c1.writeByteSync(0x62, 0x08, 0xAA)
  i2c1.writeByteSync(0x62, 0x04, rgbColor[0])
  i2c1.writeByteSync(0x62, 0x03, rgbColor[1])
  i2c1.writeByteSync(0x62, 0x02, rgbColor[2])

  // Clear display
  i2c1.writeByteSync(0x3e, 0x80, 0x01);
  sleep.usleep(50000);

  // Display on, no cursor
  i2c1.writeByteSync(0x3e, 0x80, 0x08 | 0x04);

  // Two lines
  i2c1.writeByteSync(0x3e, 0x80, 0x28);
  sleep.usleep(50000);

  // Write first line
  for (var i = 0; i < line1.length; i++) {
    i2c1.writeByteSync(0x3e, 0x40, line1.charCodeAt(i));
  }

  // Move to second line
  i2c1.writeByteSync(0x3e, 0x80, 0xC0);

  // Write first line
  for (var i = 0; i < line2.length; i++) {
    i2c1.writeByteSync(0x3e, 0x40, line2.charCodeAt(i));
  }

  i2c1.closeSync();
};

module.exports = GrovePiWrapper;
