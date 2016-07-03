describe('wav.js', function () {
	var wav = require('../lib/wav');
	describe('decode', function () {
		beforeAll(function (done) {
			var self = this;
			wav
				.decode('test/files/umbrella_beach.wav')
				.then(function (signal) {
					self.signal = signal;
				})
				.then(done)
				.catch(done.fail);
		});
		it('has two channels', function () {
			expect(this.signal.channels).toBe(2);
			expect(this.signal.data.length).toBe(2);
		});

		it('has a sample rate of 44100', function () {
			expect(this.signal.sampleRate).toBe(44100);
		});

		it('has a bit depth of 16', function () {
			expect(this.signal.bitDepth).toBe(16);
		});

		it('has 10268244 samples in each channel', function () {
			var self = this;
			self.signal.data.forEach(function (channelData) {
				expect(channelData.length).toBe(10268244);
			});
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
