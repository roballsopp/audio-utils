var Format = require('./Format');

module.exports = SampleReader;

function SampleReader(format) {
	Object.defineProperties(this, {
		bytesPerSample: {value: Math.round(format.bitsPerSample / 8), writable: false, enumerable: true},
		_maxSampleValue: {value: Math.pow(2, format.bitsPerSample) - 1, writable: false, enumerable: false},
		_audioFormat: {value: format.audioFormat, writable: false, enumerable: false}
	});
}

SampleReader.prototype.read = function (buffer, readPosition) {
	switch (this._audioFormat) {
		case Format.FMT_PCM: return buffer.readUIntLE(readPosition, this.bytesPerSample) / this._maxSampleValue;
		case Format.FMT_IEEE: return buffer.readFloatLE(readPosition);
		default: throw new Error('Unsupported audio format.');
	}
};
