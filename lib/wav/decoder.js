var fs = require('fs');
var Promise = require('bluebird');
var util = require('../util');
var openQ = Promise.promisify(fs.open);
var readQ = Promise.promisify(fs.read, {multiArgs: true});
var closeQ = Promise.promisify(fs.close);

const FMT_PCM = 1;
const FMT_IEEE = 3;

module.exports = Decoder;

function Decoder(options) {
	var byteDepth = Math.round(options.bitDepth / 8);
	Object.defineProperties(this, {
		filePath: {value: options.filePath, writable: false, enumerable: true}, // absolute
		fileType: {value: options.fileType, writable: false, enumerable: true}, // RIFF or RIFX
		format: {value: options.format, writable: false, enumerable: true}, // 1 = PCM, 3 = IEEE Float
		channels: {value: options.channels, writable: false, enumerable: true}, // 1 or 2
		sampleRate: {value: options.sampleRate, writable: false, enumerable: true}, // 44100, 48000, 88200, 96000
		bitDepth: {value: options.bitDepth, writable: false, enumerable: true}, // 16 or 24
		byteDepth: {value: byteDepth, writable: false, enumerable: true},
		dataOffset: {value: options.dataOffset, writable: false, enumerable: true}, // position in bytes of data chunk
		dataSize: {value: options.dataSize, writable: false, enumerable: true}, // size in bytes of data chunk, not including id and size field
		sampPerChan: {value: options.dataSize / options.channels / byteDepth, writable: false, enumerable: true},
		maxSampleValue: {value: Math.pow(2, options.bitDepth) - 1, writable: false, enumerable: true}
	});
}

Decoder.prototype.getSampleAt = function (buffer, readPosition) {
	switch (this.format) {
		case FMT_PCM: return buffer.readUIntLE(readPosition, this.byteDepth) / this.maxSampleValue;
		case FMT_IEEE: return buffer.readFloatLE(readPosition);
		default: throw new Error('Unsupported audio format.');
	}
};

Decoder.prototype.sampleToFilePosition = function (samplePosition) {
	var filePosition = this.dataOffset + (samplePosition * this.byteDepth * this.channels);
	if (filePosition > (this.dataOffset + this.dataSize)) throw new Error('sample position exceeds available data');
	return filePosition;
};

Decoder.prototype.getDataReader = function (sampleStart, sampleEnd) {
	if (sampleStart > sampleEnd) throw new Error('sample end must be after sample start');

	var streamStart = this.sampleToFilePosition(sampleStart);
	var streamEnd = this.sampleToFilePosition(sampleEnd);

	return fs.createReadStream(this.filePath, {start: streamStart, end: streamEnd});
};

Decoder.prototype.decode = function (sampleStart, sampleEnd) {
	var decoderInstance = this;
	return new Promise(function (resolve, reject) {
		sampleStart = sampleStart || 0;
		sampleEnd = sampleEnd || (decoderInstance.sampPerChan - sampleStart);
		var readStream = decoderInstance.getDataReader(sampleStart, sampleEnd);
		var sampleLength = sampleEnd - sampleStart;
		var readSize = decoderInstance.byteDepth * decoderInstance.sampleRate; // always read a multiple of the sample size
		var channelData = [];

		for (var chan = 0; chan < decoderInstance.channels; chan++) {
			channelData[chan] = new Float32Array(sampleLength);
		}

		var samplePosition = 0;
		readStream.on('readable', () => {
			var buffer;
			while ((samplePosition < sampleLength) && (buffer = readStream.read(readSize))) {
				var bufferPosition = 0;
				while ((bufferPosition + decoderInstance.byteDepth) < buffer.length) {
					for (var chan = 0; chan < decoderInstance.channels; chan++) {
						channelData[chan][samplePosition] = decoderInstance.getSampleAt(buffer, bufferPosition);
						bufferPosition += decoderInstance.byteDepth;
					}
					samplePosition++;
				}
			}
		});
		readStream.on('error', reject);
		readStream.on('end', () => {
			resolve(channelData);
		});
	});
};

Decoder.fromFile = function (filePath) {
	var decoderOptions = {filePath: filePath};
	var fileDescriptor;
	return openQ(filePath, 'r')
		.then(function (fd) {
			fileDescriptor = fd;
			return readFileChunk(fileDescriptor);
		})
		.then(function (fileChunk) {
			if (fileChunk.id !== 'RIFF') throw new Error('Not a RIFF file.');
			if (fileChunk.format !== 'WAVE') throw new Error('Not a WAVE file.');

			decoderOptions.fileType = fileChunk.id;
			return readFormatChunk(fileDescriptor);
		})
		.then(function (formatChunk) {
			if (formatChunk.id !== 'fmt ') throw new Error('Cannot find format chunk.');

			decoderOptions.format = formatChunk.audioFormat;
			decoderOptions.channels = formatChunk.channels;
			decoderOptions.sampleRate = formatChunk.sampleRate;
			decoderOptions.bitDepth = formatChunk.bitsPerSample;

			return util.findInFile(filePath, 'data');
		})
		.then(function (dataOffset) {
			decoderOptions.dataOffset = dataOffset;
			return readDataChunk(fileDescriptor, dataOffset);
		})
		.then(function (dataChunk) {
			decoderOptions.dataSize = dataChunk.size;
			return closeQ(fileDescriptor);
		})
		.then(function () {
			return new Decoder(decoderOptions);
		});
};

function readFileChunk(fileDescriptor) {
	return readQ(fileDescriptor, new Buffer(12), 0, 12, 0)
		.spread(function (bytesRead, buffer) {
			return {
				id: buffer.toString('ascii', 0, 4),
				size: buffer.readUInt32LE(4),
				format: buffer.toString('ascii', 8, 12)
			};
		});
}

function readFormatChunk(fileDescriptor) {
	return readQ(fileDescriptor, new Buffer(24), 0, 24, 12)
		.spread(function (bytesRead, buffer) {
			return {
				id: buffer.toString('ascii', 0, 4),
				size: buffer.readUInt32LE(4),
				audioFormat: buffer.readUInt16LE(8), // 2 bytes, Audio format 1=PCM, 3=IEEE, 6=mulaw,7=alaw, 257=IBM
				channels: buffer.readUInt16LE(10), // 2 bytes, Number of channels 1=Mono 2=Stereo
				sampleRate: buffer.readUInt32LE(12), // 4 bytes, Sampling Frequency in Hz
				bytesPerSecond: buffer.readUInt32LE(16), // 4 bytes, == SampleRate * NumChannels *
				blockAlign: buffer.readUInt16LE(20), // 2 bytes, == NumChannels * BitsPerSample/8
				bitsPerSample: buffer.readUInt16LE(22) // 2 bytes, Number of bits per sample
			};
		});
}

function readDataChunk(fileDescriptor, dataOffset) {
	return readQ(fileDescriptor, new Buffer(8), 0, 8, dataOffset)
		.spread(function (bytesRead, buffer) {
			return {
				id: buffer.toString('ascii', 0, 4),
				size: buffer.readUInt32LE(4)
			};
		});
}