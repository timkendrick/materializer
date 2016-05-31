'use strict';

var assert = require('assert');
var minimist = require('minimist');

function Cli(options) {
	assert(options.name, 'Missing executable name');
	assert(options.version, 'Missing executable version');
	assert(options.run || options.commands, 'Missing command');

	this.name = options.name;
	this.version = options.version;
	this.description = options.description || null;
	this.options = options.options || null;
	this.input = Boolean(options.input);
	this.multiple = Boolean(options.multiple);
	this.run = options.run || null;
	this.commands = options.commands || null;
	this.global = options.global || null;
}

Cli.prototype.process = function(argv, options) {
	options = options || {};
	var isAsync = Boolean(options.async);
	var hasSubcommands = Boolean(this.commands);
	var args = parseArgs(process.argv, hasSubcommands);
	var commandName = args.command;
	var inputArgs = args.input;
	var commandOptions = args.options;

	var isValidCommand = this.hasCommand(commandName);

	if ((commandOptions.help || (!commandName && !isValidCommand)) && !(commandName && !isValidCommand)) {
		if (commandName) {
			this.showCommandHelp(commandName);
		} else {
			this.showHelp();
		}
		return;
	}

	if (commandOptions.version) {
		this.showVersion();
		return;
	}

	try {
		assert(isValidCommand, 'Invalid command: ' + commandName);
	} catch (error) {
		stderr(error.message);
		this.showHelp();
		throw error;
	}

	var command = this.getCommand(commandName);
	var expandedOptions = expandOptionAliases(command, commandOptions);

	var self = this;
	return tryCatch(
		function() {
			return self.runCommand(commandName, inputArgs, expandedOptions);
		},
		function(error) {
			var isArgumentError = (error.name === 'AssertionError');
			if (isArgumentError) {
				stderr(error.message);
				self.showCommandHelp(commandName);
			} else {
				stderr(error.stack);
			}
			throw error;
		},
		isAsync
	);


	function parseArgs(argv, hasSubcommands) {
		var args = minimist(process.argv.slice(2), { boolean: true });
		var commandName = (hasSubcommands ? args._[0] : null);
		var inputArgs = args._.slice(hasSubcommands ? 1 : 0);
		var optionArgs = Object.keys(args).filter(function(key) {
			return (key !== '_');
		})
		.reduce(function(options, key) {
			options[key] = args[key];
			return options;
		}, {});
		return {
			command: commandName,
			input: inputArgs,
			options: optionArgs
		};
	}

	function expandOptionAliases(command, options) {
		var aliasMappings = command.options.filter(function(option) {
			return Boolean(option.alias);
		}).reduce(function (hash, option) {
			hash[option.alias] = option.name;
			return hash;
		}, {});
		return Object.keys(options).reduce(function(expandedOptions, key) {
			var value = options[key];
			if (key in aliasMappings) {
				var optionName = aliasMappings[key];
				expandedOptions[optionName] = value;
			} else {
				expandedOptions[key] = value;
			}
			return expandedOptions;
		}, {});
	}

	function tryCatch(fn, errorCallback, isAsync) {
		try {
			return isAsync ?
				Promise.resolve(fn())
					.catch(errorCallback)
				: fn();
		} catch(error) {
			return isAsync ?
				Promise.reject(error)
					.catch(errorCallback)
				: errorCallback(error);
		}
	}
}

Cli.prototype.hasCommand = function(commandName) {
	return Boolean(!commandName && this.run) || (commandName in this.commands);
};

Cli.prototype.getCommand = function(commandName) {
	return ((!commandName && this.run ? this : null) || this.commands[commandName] || null);
};

Cli.prototype.runCommand = function(commandName, inputArgs, options) {
	var command = this.getCommand(commandName);
	var globalOptions = this.options;
	var allowedOptions = (command.options || []).concat(globalOptions);
	if (command.input) {
		assert(inputArgs.length > 0, 'Missing input argument');
	}
	validateOptions(options, allowedOptions);

	if (!command.input) {
		return command.run(options);
	} else if (command.multiple) {
		return inputArgs.map(function(inputArg) {
			return command.run(inputArg, options);
		});
	} else {
		return command.run(inputArgs[0], options);
	}


	function validateOptions(options, allowedOptions) {
		var requiredOptions = allowedOptions.filter(function(option) {
			return option.required;
		});
		requiredOptions.forEach(function(option) {
			var optionValue = options[option.name];
			assert(optionValue, 'Missing option "' + option.name + '"');
		});
		allowedOptions.forEach(function(option) {
			var optionValue = options[option.name];
			if (optionValue) {
				assert(isValidType(optionValue, option),
					'Invalid value for option "' + option.name + '"'
				);
			}
		});
		var allowedOptionNames = allowedOptions.map(function(option) {
			return option.name
		});
		Object.keys(options).forEach(function(optionName) {
			var optionExists = (allowedOptionNames.indexOf(optionName) !== -1);
			assert(optionExists, 'Invalid option: "' + optionName + '"');
		});


		function isValidType(value, option) {
			var validTypes = (Array.isArray(option.type) ? option.type : [option.type]);
			return validTypes.some(function(type) {
				return valueIsType(value, type);
			});


			function valueIsType(value, type) {
				switch (type) {
					case 'string':
					case 'path':
						return (typeof value === 'string');
					case 'boolean':
						return !value || (typeof value === 'boolean');
				}
			}
		}
	}
};

Cli.prototype.showHelp = function() {
	var executableName = this.name;
	var executableDescription = this.description;
	var commands = this.commands;
	var hasDefaultCommand = Boolean(this.run);
	var options = (hasDefaultCommand ? this.options : null)
	var globalOptions = this.global;

	showHelpPage({
		usage: executableName +
			(commands ? ' [command]' : '') +
			' [options]' +
			(this.input ?
				' <input>' + (this.multiple ? ' [...input]' : '')
				: ''
			),
		description: executableDescription,
		commands: commands ? Object.keys(commands).sort().map(function(commandName) {
			var command = commands[commandName];
			return {
				name: commandName,
				description: command.description
			};
		}) : null,
		options: options,
		global: globalOptions
	});
};

Cli.prototype.showCommandHelp = function(commandName) {
	var executableName = this.name;
	var command = this.getCommand(commandName);
	var requiredOptionsUsage = getRequiredOptionsUsage(command.options);

	showHelpPage({
		usage: executableName +
			(commandName ? ' ' + commandName : '') +
			(requiredOptionsUsage ? ' ' + requiredOptionsUsage : '') +
			' [options]' +
			(command.input ?
				' <input>' + (command.multiple ? ' [...input]' : '')
				: ''
			),
		description: command.description,
		options: command.options,
		global: this.global
	});


	function getRequiredOptionsUsage(options) {
		return options.filter(function(option) {
			return option.required;
		})
		.map(function(option) {
			var exampleValue = getExampleValue(option);
			return '--' + option.name +
				(exampleValue ? '=' + exampleValue : '');
		})
		.join(' ');

		function getExampleValue(option) {
			switch (option.type) {
				case 'boolean':
					return null;
				case 'string':
					return '<value>';
				case 'path':
					return '<path>';
				default:
					throw new Error('Invalid option type: ' + option.type);
			}
		}
	}
};

Cli.prototype.showVersion = function() {
	stdout(this.version);
};

module.exports = Cli;


function showHelpPage(help, isError) {
	stdout('');
	if (help.usage) {
		stdout('  Usage: ' + help.usage + '\n');
	}
	if (help.description) {
		stdout('  ' + help.description + '\n');
	}
	if (help.commands) {
		stdout('  Commands:' + '\n');
		stdout(getDescriptionTable(help.commands) + '\n');
	}
	if (help.options) {
		stdout('  Options:' + '\n');
		stdout(getDescriptionTable(help.options.map(function(option) {
			return {
				name: '--' + option.name + (option.alias ? ', -' + option.alias : ''),
				description: option.description
			};
		})) + '\n');
	}
	if (help.global) {
		stdout('  Global options:' + '\n');
		stdout(getDescriptionTable(help.global.map(function(option) {
			return {
				name: '--' + option.name + (option.alias ? ', -' + option.alias : ''),
				description: option.description
			};
		})) + '\n');
	}


	function getDescriptionTable(items) {
		var itemNames = items.map(function(item) {
			return item.name;
		});
		var maxNameLength = getMaxLength(itemNames);
		return items.map(function(item) {
			return '    ' + rightPad(item.name, maxNameLength) +
				'    ' + item.description
		}).join('\n');
	}

	function getMaxLength(strings) {
		return strings.reduce(function(max, string) {
			return Math.max(max, string.length);
		}, 0);
	}

	function rightPad(string, length) {
		while (string.length < length) { string += ' '; }
		return string;
	}
}

function stdout(message) {
	process.stdout.write(message + '\n');
}

function stderr(message) {
	process.stderr.write(formatErrorString(message) + '\n');

	function formatErrorString(string) {
		return '\u001b[31m' + string + '\u001b[39m';
	}
}
