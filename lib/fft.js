module.exports.fft = fft;
module.exports.inverse = inverse;

function zeroFill(arr) {
	var n = arr.length;
	while (n) {
		n--;
		arr[n] = 0;
	}
}

function fft(signal) {
	var length = signal.length;
	var N = Math.pow(2, Math.ceil(Math.logB(2, length)));
	var rex = new Float32Array(N);
	var imx = new Float32Array(N);
	zeroFill(rex);
	zeroFill(imx);
	rex.set(signal);
	_fft(rex, imx);
	return {rex: rex, imx: imx};
}

function inverse(rex, imx) {
	if (!rex.length || !imx.length) {
		throw new Error('Inverse FFT requires data...');
	}
	_inverse(rex, imx);

	return new Float32Array(rex.slice(0));
}

function _fftBase(rex, imx, N) { // DO NOT TRY TO FIND LENGTH OF rex IN HERE, Process.fft sends N/2!
																 // set constants
	var nd2 = N / 2;
	var NM1 = N - 1;
	var m = Math.floor(Math.log(N) / Math.log(2));
	var j = nd2;
	var k = nd2;

	var tr, ti, ur, ui, sr, si;

	// bit reversal sorting
	for (var i = 1; i < NM1; i++) {
		if (i < j) {
			tr = rex[j];
			ti = imx[j];
			rex[j] = rex[i];
			imx[j] = imx[i];
			rex[i] = tr;
			imx[i] = ti;
		}
		k = nd2;
		while (k <= j) {
			j -= k;
			k /= 2;
		}
		j += k;
	}

	for (var l = 1; l <= m; l++) {
		var le = Math.floor(Math.pow(2, l));
		var le2 = le / 2;
		ur = 1;
		ui = 0;
		sr = Math.cos(Math.PI / le2);
		si = -Math.sin(Math.PI / le2);

		for (var j = 1; j <= le2; j++) {
			var jm1 = j - 1;
			for (var i = jm1; i < N; i += le) {
				var ip = i + le2;
				tr = rex[ip] * ur - imx[ip] * ui;
				ti = rex[ip] * ui + imx[ip] * ur;
				rex[ip] = rex[i] - tr;
				imx[ip] = imx[i] - ti;
				rex[i] += tr;
				imx[i] += ti;
			}

			tr = ur;
			ur = tr * sr - ui * si;
			ui = tr * si + ui * sr;
		}
	}
}

function _fft(rex, imx) {
	var N = rex.length;
	var NH = N / 2;
	var NM1 = N - 1;
	var N4 = N / 4;
	var l = Math.floor(Math.log(N) / Math.log(2));
	var le = Math.floor(Math.pow(2, l));
	var le2 = le / 2;
	var jm1, im, ip2, ipm, ip;

	var tr, ti, ur = 1, ui = 0, sr = Math.cos(Math.PI / le2), si = -Math.sin(Math.PI / le2);

	for (var i = 0; i < NH; i++) {
		rex[i] = rex[2 * i];
		imx[i] = rex[2 * i + 1];
	}

	_fftBase(rex, imx, NH);

	for (var i = 1; i < N4; i++) {
		im = NH - i;
		ip2 = i + NH;
		ipm = im + NH;
		rex[ip2] = (imx[i] + imx[im]) * 0.5;
		rex[ipm] = rex[ip2];
		imx[ip2] = -(rex[i] - rex[im]) * 0.5;
		imx[ipm] = -imx[ip2];
		rex[i] = (rex[i] + rex[im]) * 0.5;
		rex[im] = rex[i];
		imx[i] = (imx[i] - imx[im]) * 0.5;
		imx[im] = -imx[i];
	}

	rex[N * 3 / 4] = imx[N4];
	rex[NH] = imx[0];
	imx[N * 3 / 4] = 0;
	imx[NH] = 0;
	imx[N4] = 0;
	imx[0] = 0;

	for (var j = 1; j <= le2; j++) {
		jm1 = j - 1;
		for (var i = jm1; i < NM1; i += le) {
			ip = i + le2;
			tr = rex[ip] * ur - imx[ip] * ui;
			ti = rex[ip] * ui + imx[ip] * ur;
			rex[ip] = rex[i] - tr;
			imx[ip] = imx[i] - ti;
			rex[i] += tr;
			imx[i] += ti;
		}

		tr = ur;
		ur = tr * sr - ui * si;
		ui = tr * si + ui * sr;
	}
}

function _inverse(rex, imx) {
	var N = rex.length;
	for (var n = N / 2 + 1; n < N; n++) {
		rex[n] = rex[N - n];
		imx[n] = -imx[N - n];
	}

	for (var n = 0; n < N; n++) rex[n] += imx[n];

	_fft(rex, imx);

	for (var n = 0; n < N; n++) rex[n] = (rex[n] + imx[n]) / N;
}