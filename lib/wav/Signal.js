module.exports = Signal;

function Signal(options) {
	Object.defineProperties(this, {
		format: {value: options.format, writable: false, enumerable: true},
		channels: {value: options.channels, writable: false, enumerable: true},
		sampleRate: {value: options.sampleRate, writable: false, enumerable: true},
		bitDepth: {value: options.bitDepth, writable: false, enumerable: true},
		length: {value: options.length, writable: false, enumerable: true},
		data: {value: [], writable: false, enumerable: true}
	});

	for (var chan = 0; chan < options.channels; chan++) {
		this.data[chan] = new Float32Array(options.length);
	}
}
