var rpio = require('rpio');

/*
 * Magic numbers to initialise the i2c display device and write output,
 * cribbed from various python drivers.
 */
var init = Buffer.from([0x03, 0x03, 0x03, 0x02, 0x28, 0x0c, 0x01, 0x06]);
var LCD_LINE1 = 0x80, LCD_LINE2 = 0xc0, LCD_LINE3 = 0x94, LCD_LINE4 = 0xd4;
var LCD_ENABLE = 0x04, LCD_BACKLIGHT = 0x08;
var LCD_ADDRESS = 0x3F;

/*
 * Data is written 4 bits at a time with the lower 4 bits containing the mode.
 */
function lcdwrite4(data)
{
	rpio.i2cWrite(Buffer.from([(data | LCD_BACKLIGHT)]));
	rpio.i2cWrite(Buffer.from([(data | LCD_ENABLE | LCD_BACKLIGHT)]));
	rpio.i2cWrite(Buffer.from([((data & ~LCD_ENABLE) | LCD_BACKLIGHT)]));
}

function lcdwrite(data, mode)
{
	lcdwrite4(mode | (data & 0xF0));
	lcdwrite4(mode | ((data << 4) & 0xF0));
}

/*
 * Write a string to the specified LCD line.
 */
function lineout(str, addr)
{
	lcdwrite(addr, 0);

	str.split('').forEach(function (c) {
		lcdwrite(c.charCodeAt(0), 1);
	});
}

/*
 * We can now start the program, talking to the i2c LCD at address 0x27.
 */
rpio.i2cBegin();
rpio.i2cSetSlaveAddress(LCD_ADDRESS);
rpio.i2cSetBaudRate(10000);

for (var i = 0; i < init.length; i++)
	lcdwrite(init[i], 0);

lineout('node.js i2c LCD!', LCD_LINE1);
lineout('test8', LCD_LINE2);
lineout('abc', LCD_LINE3);
lineout('def', LCD_LINE4);
rpio.i2cEnd();