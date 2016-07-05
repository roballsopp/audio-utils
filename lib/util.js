var fs = require('fs');

module.exports.logB = logB;
module.exports.fillWith = fillWith;
module.exports.findInFile = findInFile;

function logB(base, x) { // base, followed by number to find log of
	return Math.log(x) / Math.log(base);
}

function fillWith(arr, fillWithValue) {
	var n = arr.length;
	while (n) {
		n--;
		arr[n] = fillWithValue;
	}
}

function findInFile(filePath, searchString) {
	return new Promise(function (resolve, reject) {
		var readStream = fs.createReadStream(filePath);
		var currentPosition = 0;

		function resolveNotFound() {
			return resolve(-1);
		}

		function searchBuffer(buffer) {
			var stringFoundPosition = buffer.indexOf(searchString);

			if (stringFoundPosition !== -1) {
				currentPosition += stringFoundPosition;
				readStream.pause();
				readStream.removeListener('end', resolveNotFound);
				readStream.removeListener('error', reject);
				readStream.removeListener('data', searchBuffer);
				readStream.resume();
				return resolve(currentPosition);
			}

			currentPosition += buffer.length;
		}

		readStream.on('end', resolveNotFound);
		readStream.on('error', reject);
		readStream.on('data', searchBuffer);
	});
}