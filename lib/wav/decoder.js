var Signal = require('./Signal');
var Format = require('./Format');
var SampleReader = require('./SampleReader');

module.exports.getRiff = getRiff;
module.exports.getFormat = getFormat;
module.exports.getData = getData;
module.exports.decode = decode;

function getRiff(buffer) {
	return {
		id: buffer.toString('ascii', 0, 4),
		size: buffer.readUInt32LE(4),
		format: buffer.toString('ascii', 8, 12)
	};
}

function getFormat(buffer) {
	var offset = buffer.indexOf('fmt ');
	if (offset === -1) throw new Error('Cannot find format chunk.');

	return new Format({
		audioFormat: buffer.readUInt16LE(offset + 8), // 2 bytes, Audio format 1=PCM, 3=IEEE, 6=mulaw,7=alaw, 257=IBM
		channels: buffer.readUInt16LE(offset + 10), // 2 bytes, Number of channels 1=Mono 2=Stereo
		sampleRate: buffer.readUInt32LE(offset + 12), // 4 bytes, Sampling Frequency in Hz
		bytesPerSecond: buffer.readUInt32LE(offset + 16), // 4 bytes, == SampleRate * NumChannels *
		blockAlign: buffer.readUInt16LE(offset + 20), // 2 bytes, == NumChannels * BitsPerSample/8
		bitsPerSample: buffer.readUInt16LE(offset + 22) // 2 bytes, Number of bits per sample
	});
}

function getData(buffer) {
	var offset = buffer.indexOf('data');
	if (offset === -1) throw new Error('Cannot find data chunk.');

	return {
		id: buffer.toString('ascii', offset, 4),
		size: buffer.readUInt32LE(offset + 4),
		buffer: buffer.slice(offset + 8)
	};
}

function decode(data, format) {
	var sampleReader = new SampleReader(format);
	var sampPerChan = data.buffer.length / format.channels / sampleReader.bytesPerSample;

	var signal = new Signal({
		format: format.audioFormat,
		channels: format.channels,
		sampleRate: format.sampleRate,
		bitDepth: format.bitsPerSample,
		length: sampPerChan
	});

	var readPosition = 0;

	for (var n = 0; n < signal.length; n++) {
		for (var chan = 0; chan < signal.channels; chan++) {
			signal.data[chan][n] = sampleReader.read(data.buffer, readPosition);
			readPosition += sampleReader.bytesPerSample;
		}
	}

	return signal;
}
