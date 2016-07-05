var fs = require('fs');
var Q = require('bluebird');
var readFileQ = Q.promisify(fs.readFile);
var writeFileQ = Q.promisify(fs.writeFile);
var Decoder = require('./Decoder');
var encoder = require('./encoder');
var Format = require('./Format');
var Signal = require('./Signal');

module.exports.decode = decode;
module.exports.encode = encode;
module.exports.Format = Format;
module.exports.Signal = Signal;

function decode(filePath) {
	return Decoder
		.fromFile(filePath)
		.then(function (decoder) {
			return decoder.decode();
		});
}

function encode(outputpath, signal, format) {
	if (!(signal instanceof Signal)) throw new Error('signal param must be an instance of Signal.');
	if (!(format instanceof Format)) throw new Error('format param must be an instance of Format.');
	
	var dataBuffer = encoder.encode(signal, format);
	var dataChunk = encoder.buildData(dataBuffer);
	var formatChunk = encoder.buildFormat(format);
	var riffChunk = encoder.buildRiff(4 + formatChunk.length + dataChunk.length);
	var fileBuffer = Buffer.concat([riffChunk, formatChunk, dataChunk]);

	return writeFileQ(process.cwd() + '/' + outputpath, fileBuffer);
}