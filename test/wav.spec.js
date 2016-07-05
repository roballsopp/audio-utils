describe('wav.js', function () {
	var Decoder = require('../lib/wav/Decoder');
	fdescribe('decode', function () {
		beforeAll(function (done) {
			var self = this;
			return Decoder.fromFile(process.cwd() + '/test/files/umbrella_beach.wav')
				.then(function (decoder) {
					self.decoder = decoder;
				})
				.then(function () {
					return self.decoder.decode();
				})
				.then(done)
				.catch(done.fail);
		});
		it('has two channels', function () {
			expect(this.decoder.channels).toBe(2);
		});

		it('has a sample rate of 44100', function () {
			expect(this.decoder.sampleRate).toBe(44100);
		});

		it('has a bit depth of 16', function () {
			expect(this.decoder.bitDepth).toBe(16);
		});

		it('has 10268244 samples in each channel', function () {
			expect(this.decoder.sampPerChan).toBe(10268244);
		});
	});

	describe('encode', function () {
		beforeEach(function (done) {
			wav
				.decode('test/files/umbrella_beach.wav')
				.then(function (signal) {
					return wav.encode('test/files/output.wav', signal, new wav.Format({
						audioFormat: wav.Format.FMT_PCM,
						channels: 2,
						sampleRate: 44100,
						bitsPerSample: 16
					}));
				})
				.then(function (msg) {
					console.log('HI', msg);
				})
				.then(done)
				.catch(done.fail);
		});
		it('correctly encodes a wav file', function () {
			expect(true).toBe(true);
		});
	});
});
