;
export class Preprocessor {
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    exports;
    ptrOutOut;
    constructor(instance) {
        this.exports = instance.exports;
        this.exports.init();
        this.ptrOutOut = this.exports.malloc(4);
    }
    preprocess(input) {
        const buf = this.encoder.encode(input);
        const ptrIn = this.exports.malloc(buf.length);
        new Uint8Array(this.exports.memory.buffer, ptrIn, buf.length).set(buf);
        const length = this.exports.process(ptrIn, buf.length, this.ptrOutOut);
        const ptrOut = new DataView(this.exports.memory.buffer)
            .getUint32(this.ptrOutOut, true);
        const resultBuf = new Uint8Array(this.exports.memory.buffer, ptrOut, length);
        const result = this.decoder.decode(resultBuf);
        this.exports.free(ptrIn, buf.length);
        return result;
    }
    static async fromWasmUrl(url) {
        const { instance } = await WebAssembly.instantiateStreaming(fetch(url));
        return new Preprocessor(instance);
    }
}
