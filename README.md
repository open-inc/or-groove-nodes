# OpenDASH GrovePI Nodes

[Package on npm](https://www.npmjs.com/package/node-red-contrib-od-grovepi)

## Installation

1. `npm install -s node-red-contrib-od-grovepi`
2. `node-red-restart`

## Sensors

The blue sensors are DHT11 humidity & temperature sensors.

## Nodes

See <https://www.dexterindustries.com/GrovePi/engineering/port-description/>

In addition to a node for each of the most common sensors,
there are four “general” nodes.

1. Digital Input, values: 0 or 1
2. Analog Input, values: 0 to 1023
3. Digital Output, values: 0 or 1
4. Analog Output, values: 0 to 255

## `msg` Properties

See <https://nodered.org/docs/user-guide/messages>

Usually, the "value" of a message is stored in its `payload` field.
To make integration with other nodes easy, the payload of a sensor
message only contains its values, all additional information is stored
in other properties.

If a sensor returns multiple values (e.g. temperature and humidity),
`msg.payload` is an array of these values.

In addition to that, `msg.valueTypes` is an array of value type
specifications `{unit: ..., name: ..., type: ...}`.

This additional information is used for displaying sensor values on the LCD
and when sending datapoints to the OpenDash platform.

The `name` and `id` values used in the open.DASH JSON object are
stored in `msg.sensorname` and `msg.sensorid`.

`user` is set by the "RMQ Output" node and uses the "Username" value
entered in the node configuration.

## “Event Mode”

For some sensors, like the button, it might be useful to send an event
only when the sensor value changes.

To do so, set the reading interval to a low value (e.g. 200ms),
then connect the sensor to a "rbe" node.

This node only lets messages through if their payload has changed.
It can be found at the bottom of the "Functions" section.

## Inputs / Sensors

![](images/inputs.jpg)

From left to right:

1. Ultrasonic Ranger
2. DTH22 Temperature & Humidity Sensor
3. Light Sensor
4. Loudness Sensor
5. Button
6. Rotary Angle Sensor
7. Gas Sensor
8. Air Quality Sensor

At the bottom:

1. Heart Rate Sensor

## Outputs / Actuators

![](images/outputs.jpg)

From left to right:

1. LCD RGB-Backlight
2. LED
3. Buzzer
4. Relay

## Sensors

### I2C Sensors

When connecting a I2C sensor, it doesn't matter which pin is used.

### Loudness Sensor

Records 5 samples per second, then sends out the average and the
maximum value.

## Troubleshooting

If a sensor returns `false` instead of a numeric value,
check if the red LED on the GrovePI board is on.

In that case, disconnect all sensors from the board,
detach the GrovePI board and put it back on.

## Credits

There are two existing collections of GrovePI sensor nodes for NodeRed:
- <https://github.com/memetolsen/node-red-grovepi-nodes>
- <https://github.com/O-Hahn/node-red-contrib-grovepi>
- <https://github.com/DexterInd/GrovePi/tree/master/Software/NodeJS>

What makes this package different from the ones listed above is that
each sensor includes some metadata about the values it sends in the
message. This way, sensors can be connected to meaningful OpenDASH
data streams without configuring the value types by hand.
