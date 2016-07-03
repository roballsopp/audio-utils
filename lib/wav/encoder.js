var Format = require('./Format');
var SampleWriter = require('./SampleWriter');

module.exports.buildRiff = buildRiff;
module.exports.buildData = buildData;
module.exports.buildFormat = buildFormat;
module.exports.encode = encode;

function buildRiff(filesize) {
	var buffer = new Buffer(12);
	buffer.write('RIFF', 0, 4, 'ascii');
	buffer.writeUInt32LE(filesize, 4);
	buffer.write('WAVE', 8, 4, 'ascii');
	return buffer;
}

function buildFormat(format) {
	var buffer = new Buffer(24);
	buffer.write('fmt ', 0, 4, 'ascii'); // fmt id
	buffer.writeUInt32LE(16, 4); // fmt size
	buffer.writeUInt16LE(format.audioFormat, 8);
	buffer.writeUInt16LE(format.channels, 10);
	buffer.writeUInt32LE(format.sampleRate, 12);
	buffer.writeUInt32LE(format.bytesPerSecond, 16);
	buffer.writeUInt16LE(format.blockAlign, 20);
	buffer.writeUInt16LE(format.bitsPerSample, 22);
	return buffer;
}

function buildData(dataBuffer) {
	var headerBuffer = new Buffer(8);
	headerBuffer.write('data', 0, 4, 'ascii');
	headerBuffer.writeUInt32LE(dataBuffer.length, 4);
	return Buffer.concat([headerBuffer, dataBuffer]);
}

function encode(signal, format) {
	var sampleWriter = new SampleWriter(format);
	var dataSize = signal.length * format.channels * sampleWriter.bytesPerSample;
	var buffer = new Buffer(dataSize);
	var writePosition = 0;

	for (var n = 0; n < signal.length; n++) {
		for (var chan = 0; chan < format.channels; chan++) {
			sampleWriter.write(buffer, signal.data[chan][n], writePosition);
			writePosition += sampleWriter.bytesPerSample;
		}
	}

	return buffer;
}