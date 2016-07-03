var Format = require('./Format');

module.exports = SampleWriter;

function SampleWriter(format) {
	Object.defineProperties(this, {
		bytesPerSample: {value: Math.round(format.bitsPerSample / 8), writable: false, enumerable: true},
		_maxSampleValue: {value: Math.pow(2, format.bitsPerSample) - 1, writable: false, enumerable: false},
		_minSampleValue: {value: -Math.pow(2, format.bitsPerSample), writable: false, enumerable: false},
		_audioFormat: {value: format.audioFormat, writable: false, enumerable: false}
	});
}

SampleWriter.prototype.write = function (buffer, value, writePosition) {
	switch (this._audioFormat) {
		case Format.FMT_PCM: return buffer.writeUIntLE(this._clip(value * this._maxSampleValue), writePosition, this.bytesPerSample);
		case Format.FMT_IEEE: return buffer.writeFloatLE(value, writePosition);
		default: throw new Error('Unsupported audio format.');
	}
};

SampleWriter.prototype._clip = function (sample) {
	if (sample > this._maxSampleValue) return this._maxSampleValue;
	if (sample < this._minSampleValue) return this._minSampleValue;
	return sample;
};
