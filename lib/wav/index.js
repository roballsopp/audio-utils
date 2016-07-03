var fs = require('fs');
var Q = require('bluebird');
var readFileQ = Q.promisify(fs.readFile);
var decoder = require('./decoder');

module.exports.decode = decode;

function decode(filepath) {
	return readFileQ(process.cwd() + '/' + filepath)
		.then(function (buffer) {
			var riff = decoder.getRiff(buffer);
			if (riff.id !== 'RIFF') throw new Error('Not a RIFF file.');
			if (riff.format !== 'WAVE') throw new Error('Not a WAVE file.');
			var format = decoder.getFormat(buffer);
			var data = decoder.getData(buffer);

			return decoder.decode(data, format);
		});
}