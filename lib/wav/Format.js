module.exports = Format;

function Format(options) {
	Object.defineProperties(this, {
		audioFormat: {value: options.audioFormat, writable: false, enumerable: true}, // 2 bytes, Audio format 1=PCM, 3=IEEE, 6=mulaw,7=alaw, 257=IBM
		channels: {value: options.channels, writable: false, enumerable: true}, // 2 bytes, Number of channels 1=Mono 2=Stereo
		sampleRate: {value: options.sampleRate, writable: false, enumerable: true}, // 4 bytes, Sampling Frequency in Hz
		bytesPerSecond: {value: options.channels * options.sampleRate * (options.bitsPerSample / 8), writable: false, enumerable: true}, // 4 bytes, == SampleRate * NumChannels *
		blockAlign: {value: options.channels * (options.bitsPerSample / 8), writable: false, enumerable: true}, // 2 bytes, == NumChannels * BitsPerSample/8
		bitsPerSample: {value: options.bitsPerSample, writable: false, enumerable: true} // 2 bytes, Number of bits per sample
	});
}

Format.FMT_PCM = 1;
Format.FMT_IEEE = 3;