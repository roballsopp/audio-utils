describe('wav.js', function () {
	var wav = require('../lib/wav');
	describe('decode', function () {
		beforeEach(function (done) {
			wav
				.decode('test/files/umbrella_beach.wav')
				.then(function (signal) {
					console.log("HI");
				})
				.then(done)
				.catch(done.fail);
		});
		it('correctly decodes a wav file', function () {
			expect(true).toBe(true);
		});
	});
});
