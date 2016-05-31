var parseColor = require('parse-color');
var colorDiff = require('color-diff');
var materialColors = require('material-colors');

module.exports = function(color) {
	var rgbValues = parseInputColor(color).rgb;
	var palette = getPaletteColors(materialColors);
	var closestPaletteColor = getClosestColor(rgbValues, palette);
	return closestPaletteColor;


	function parseInputColor(color) {
		var UNPREFIXED_HEX_COLOR_REGEXP = /^([0-9a-fA-F]){3}(([0-9a-fA-F]){3})?$/;
		if (UNPREFIXED_HEX_COLOR_REGEXP.test(color)) {
			color = '#' + color;
		}
		return parseColor(color);
	}

	function getClosestColor(rgbValues, palette) {
		var closestColor = colorDiff.closest({
			R: rgbValues[0],
			G: rgbValues[1],
			B: rgbValues[2]
		}, palette.map(function(color) {
			return { R: color.r, G: color.g, B: color.b };
		}));
		var paletteColor = palette.filter(function(color) {
			return (
				(closestColor.R === color.r) &&
				(closestColor.G === color.g) &&
				(closestColor.B === color.b)
			);
		})[0];
		return paletteColor;
	}

	function getPaletteColors(colors) {
		return Object.keys(colors).map(function(groupName) {
			var colorGroup = colors[groupName];
			if (typeof colorGroup === 'string') {
				var hex = colorGroup;
				var shadeName = null;
				return [
					createPaletteColor(groupName, shadeName, hex)
				];
			}
			return Object.keys(colorGroup).map(function(shadeName) {
				var hex = colorGroup[shadeName];
				return createPaletteColor(groupName, shadeName, hex);
			});
		})
		.reduce(function(flattenedItems, items) {
			return flattenedItems.concat(items);
		}, []);


		function createPaletteColor(groupName, shadeName, hex) {
			var parsedColor = parseColor(hex);
			var name = capitalize(splitCamelCase(groupName)) +
				(shadeName ? ' ' + capitalize(shadeName) : '');
			return {
				name: name,
				r: parsedColor.rgb[0],
				g: parsedColor.rgb[1],
				b: parsedColor.rgb[2],
				h: parsedColor.hsl[0],
				s: parsedColor.hsl[1],
				l: parsedColor.hsl[2],
				hex: parsedColor.hex,
				rgb: 'rgb(' +
					parsedColor.rgb[0] + ',' +
					parsedColor.rgb[1] + ',' +
					parsedColor.rgb[2] +
				')',
				hsl: 'hsl(' +
					parsedColor.hsl[0] + ',' +
					parsedColor.hsl[1] + ',' +
					parsedColor.hsl[2] +
				')'
			};

			function capitalize(string) {
				return string.replace(/\b[a-z]/g, function(match) {
					return match.toUpperCase();
				});
			}

			function splitCamelCase(string) {
				return string.replace(/[A-Z]/g, function(match) {
					return ' ' + match.toLowerCase();
				})
			}
		}
	}
};
