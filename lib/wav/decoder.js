var Signal = require('./Signal');

var FMT_PCM = 1;
var FMT_IEEE = 3;

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

	return {
		id: buffer.toString('ascii', offset, 4),
		size: buffer.readUInt32LE(offset + 4),
		audioFormat: buffer.readUInt16LE(offset + 8), // 2 bytes, Audio format 1=PCM, 3=IEEE, 6=mulaw,7=alaw, 257=IBM
		channels: buffer.readUInt16LE(offset + 10), // 2 bytes, Number of channels 1=Mono 2=Stereo
		sampleRate: buffer.readUInt32LE(offset + 12), // 4 bytes, Sampling Frequency in Hz
		bytesPerSecond: buffer.readUInt32LE(offset + 16), // 4 bytes, == SampleRate * NumChannels *
		blockAlign: buffer.readUInt16LE(offset + 20), // 2 bytes, == NumChannels * BitsPerSample/8
		bitsPerSample: buffer.readUInt16LE(offset + 22) // 2 bytes, Number of bits per sample
	};
}

function getData(buffer) {
	var offset = buffer.indexOf('data');
	if (offset === -1) throw new Error('Cannot find data chunk.');

	return {
		id: buffer.toString('ascii', offset, 4),
		size: buffer.readUInt16LE(offset + 4),
		buffer: buffer.slice(offset + 8)
	};
}

function decode(data, format) {
	var sampleReader = new SampleReader(data.buffer, format);
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
			signal.data[chan][n] = sampleReader.read(readPosition);
			readPosition += sampleReader.bytesPerSample;
		}
	}

	return signal;
}

function SampleReader(buffer, format) {
	Object.defineProperties(this, {
		bytesPerSample: {value: Math.round(format.bitsPerSample / 8), writable: false, enumerable: true},
		_maxSampleValue: {value: Math.pow(2, format.bitsPerSample) - 1, writable: false, enumerable: false},
		_audioFormat: {value: format.audioFormat, writable: false, enumerable: false},
		_buffer: {value: buffer, writable: false, enumerable: false}
	});
}

SampleReader.prototype.read = function (readPosition) {
	switch (this._audioFormat) {
		case FMT_PCM: return this._buffer.readUIntLE(readPosition, this.bytesPerSample) / this._maxSampleValue;
		case FMT_IEEE: return this._buffer.readFloatLE(readPosition);
		default: throw new Error('Unsupported audio format.');
	}
};
