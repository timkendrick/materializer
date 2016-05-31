# materializer
[![npm version](https://img.shields.io/npm/v/materializer.svg)](https://www.npmjs.com/package/materializer)

> Convert colors to Material Design palette

## Installation

Install `materializer` globally via npm:

```bash
npm install -g materializer
```

This will make the `materializer` command globally available.

## Usage

Convert a color to its closest Material Design palette equivalent:

```bash
materializer ffcc00
# Outputs: #ffca28
```

Note that if specifying a hex color with the leading `#` character, the `#` must be escaped:

```bash
materializer \#ffcc00
# Outputs: #ffca28
```

By default, `materializer` will attempt to return the output color in the same format as the input color. You can optionally specify different output formats using the `--format` option:

```bash
materializer ffcc00 --format=hex
# Outputs: #ffca28

materializer ffcc00 --format=rgb
# Outputs: rgb(255,202,40)

materializer ffcc00 --format=hsl
# Outputs: hsl(45,100,58)

materializer ffcc00 --format=name
# Outputs: Amber 400
```

You can also specify the format using the `-f` shorthand option:

```bash
materializer ffcc00 -f rgb
# Outputs: rgb(255,202,40)
```

Multiple colors can be converted by specifying multiple input arguments:

```bash
bin/materializer ffcc00 00ccff ff00cc --format=name
# Outputs:
#  Amber 400
#  Light Blue 300
#  Purple A200
```

Command line help is available by passing the `--help` option:

```bash
materializer --help
```

## API usage

To use `materializer` programmatically within an npm project, install it locally:

```bash
npm install materializer
```

You can then convert colors from within your project using the `materializer` API:

```javascript
var materializer = require('materializer');

var convertedColor = materializer('#ffcc00');

console.log(convertedColor);
/*
Output:
{
	name: 'Amber 400',
	r: 255,
	g: 202,
	b: 40,
	h: 45,
	s: 100,
	l: 58,
	hex: '#ffca28',
	rgb: 'rgb(255,202,40)',
	hsl: 'hsl(45,100,58)'
}
*/

console.log(convertedColor.hex); // Output: #ffca28
```

The `materializer` accepts all valid CSS color strings, and returns an object containing multiple color formats as shown above.
