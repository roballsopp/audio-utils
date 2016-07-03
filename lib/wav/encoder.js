

function encode(signal, bitDepth_out, id, isLittleEndian) {

	var disassembleInt = function (numBytes, theInt, dataView, offset) {

		var b;

		if (!isLittleEndian) {
			b = numBytes;
			while (b) {
				b--; // if numBytes is 3, we actually want to count down from 2 to 0.				
				dataView.setUint8(offset + b, theInt & 0x000000FF);
				theInt >>= 8;
			} // end byte loop		
		} else {
			b = 0;
			while (b < numBytes) {
				dataView.setUint8(offset + b, theInt & 0x000000FF);
				theInt >>= 8;
				b++;
			} // end byte loop
		}

	};

	var length = signal.X[0].length;
	var bytesPerSample = bitDepth_out / 8;
	var data_size_out = length * signal.channels * bytesPerSample;

	var dataBufferOut = new ArrayBuffer(44 + data_size_out);
	var dataViewOut = new DataView(dataBufferOut);

	dataViewOut.setUint32(0, 1179011410, true);													// byte 00, 4 bytes, RIFF Header
	dataViewOut.setUint32(4, 36 + data_size_out, true);											// byte 04, 4 bytes, RIFF Chunk Size
	dataViewOut.setUint32(8, 1163280727, true);													// byte 08, 4 bytes, WAVE Header
	dataViewOut.setUint32(12, 544501094, true);													// byte 12, 4 bytes, FMT header
	dataViewOut.setUint32(16, 16, true);														// byte 16, 4 bytes, Size of the fmt chunk
	dataViewOut.setUint16(20, 1, true);															// byte 20, 2 bytes, Audio format 1=PCM,6=mulaw,7=alaw, 257=IBM
																																	 // Mu-Law, 258=IBM A-Law, 259=ADPCM 
	dataViewOut.setUint16(22, signal.channels, true);												// byte 22, 2 bytes, Number of channels 1=Mono 2=Sterio
	dataViewOut.setUint32(24, signal.sampleRate, true);											// byte 24, 4 bytes, Sampling Frequency in Hz
	dataViewOut.setUint32(28, signal.sampleRate * signal.channels * ( bitDepth_out / 8 ), true);	// byte 28, 4 bytes, ==
																																																// SampleRate *
																																																// NumChannels *
																																																// BitsPerSample/8
	dataViewOut.setUint16(32, signal.channels * ( bitDepth_out / 8 ), true);						// byte 32, 2 bytes, == NumChannels *
																																											// BitsPerSample/8
	dataViewOut.setUint16(34, bitDepth_out, true);												// byte 34, 2 bytes, Number of bits per sample
	dataViewOut.setUint32(36, 1635017060, true);												// byte 36, 4 bytes, "data"  string   
	dataViewOut.setUint32(40, data_size_out, true);												// byte 40, 4 bytes, data chunk size 

	var sample, clipped, offset;
	var clipHi = Math.pow(2, ( bitDepth_out - 1 )) - 1;
	var clipLo = -Math.pow(2, ( bitDepth_out - 1 ));
	var range = Math.pow(2, bitDepth_out - 1);

	for (var n = 0; n < length; n++) { // for each sample 

		for (var chan = 0; chan < signal.channels; chan++) {

			sample = Math.round(signal.X[chan][n] * range); // increase range to target format

			if (sample > clipHi) {
				clipped = clipHi;
			} else if (sample < clipLo) {
				clipped = clipLo;
			} else {
				clipped = sample;
			}

			offset = 44 + ((n * signal.channels) + chan) * bytesPerSample;

			disassembleInt(bytesPerSample, clipped, dataViewOut, offset);

		}

	}

	return new Blob([dataViewOut], {type: "audio/wav"});

}

