var fs = require('fs');
var Promise = require('bluebird');
var Signal = require('./Signal');
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
		dataStart: {value: options.dataStart, writable: false, enumerable: true}, // position in bytes of data chunk
		dataSize: {value: options.dataSize, writable: false, enumerable: true}, // size in bytes of data chunk, not including id and size field
		dataEnd: {value: options.dataStart + options.dataSize, writable: false, enumerable: true},
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

Decoder.prototype.readData = function (sampleStart, sampleLength) {
	var bytesPerBlock = this.byteDepth * this.channels;
	var readStart = this.dataStart + (sampleStart * bytesPerBlock);
	var readLength = sampleLength * bytesPerBlock;
	var readEnd = readStart + readLength;

	if (readEnd > this.dataEnd) throw new Error('sample request exceeds available data');

	var fileDescriptor, buffer = new Buffer(readLength);

	return openQ(this.filePath, 'r')
		.then(function (fd) {
			fileDescriptor = fd;
			return readQ(fd, buffer, 0, readLength, readStart);
		})
		.then(function () {
			return closeQ(fileDescriptor);
		})
		.then(function () {
			return buffer;
		});
};

Decoder.prototype.decode = function (sampleStart, sampleLength) {
	var decoderInstance = this;
	sampleStart = sampleStart || 0;
	sampleLength = sampleLength || (decoderInstance.sampPerChan - sampleStart);

	return decoderInstance.readData(sampleStart, sampleLength)
		.then(function (buffer) {
			var signal = new Signal({
				channels: decoderInstance.channels,
				sampleRate: decoderInstance.sampleRate,
				bitDepth: decoderInstance.bitDepth,
				length: sampleLength
			});

			var readPosition = 0;

			for (var n = 0; n < sampleLength; n++) {
				for (var chan = 0; chan < decoderInstance.channels; chan++) {
					signal.data[chan][n] = decoderInstance.getSampleAt(buffer, readPosition);
					readPosition += decoderInstance.byteDepth;
				}
			}

			return signal;
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
		.then(function (dataStart) {
			decoderOptions.dataStart = dataStart;
			return readDataChunk(fileDescriptor, dataStart);
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

function readDataChunk(fileDescriptor, dataStart) {
	return readQ(fileDescriptor, new Buffer(8), 0, 8, dataStart)
		.spread(function (bytesRead, buffer) {
			return {
				id: buffer.toString('ascii', 0, 4),
				size: buffer.readUInt32LE(4)
			};
		});
}