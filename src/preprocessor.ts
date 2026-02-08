interface Exports {
    memory: WebAssembly.Memory;
    /** Performs any initializations if needed. */
    init(): void;
    /**
     * Allocates a memory range of length `length`.
     * @param length - size in bytes
     * @returns a pointer to the beginning of the allocated range
     */
    malloc(length: number): number;
    /**
     * Frees a previously allocated memory range.
     * @param ptr - a pointer to the beginning of the range
     * @param length - size of the range in bytes
     */
    free(ptr: number, length: number): void;
    /**
     * Preprocesses the text chunk.
     *
     * The input text should be encoded in UTF-8.  The resulting string is
     * similarly a UTF-8 string.
     *
     * @param inputPtr - a pointer to the beginning of the text in memory
     * @param inputLength - length of the text in bytes
     * @param ptrPtrOut - a reference to a number in memory that will contain
     *                    the address of the result
     * @returns the length of the produced text
     */
    process(inputPtr: number, inputLength: number, ptrPtrOut: number): number;
};

export class Preprocessor {
    private encoder: TextEncoder = new TextEncoder();
    private decoder: TextDecoder = new TextDecoder();
    private exports: Exports;
    private ptrOutOut: number;

    private constructor(instance: WebAssembly.Instance) {
        this.exports = instance.exports as unknown as Exports;
        this.exports.init();
        this.ptrOutOut = this.exports.malloc(4);
    }

    public preprocess(input: string): string {
        const buf = this.encoder.encode(input);
        const ptrIn = this.exports.malloc(buf.length);
        new Uint8Array(this.exports.memory.buffer, ptrIn, buf.length).set(buf);
        const length = this.exports.process(ptrIn, buf.length, this.ptrOutOut);
        const ptrOut = new DataView(this.exports.memory.buffer)
            .getUint32(this.ptrOutOut, true);
        const resultBuf = new Uint8Array(
            this.exports.memory.buffer, ptrOut, length
        );
        const result = this.decoder.decode(resultBuf);
        this.exports.free(ptrIn, buf.length);
        return result;
    }

    public static async fromWasmUrl(url: string): Promise<Preprocessor> {
        const { instance } = await WebAssembly.instantiateStreaming(fetch(url));
        return new Preprocessor(instance);
    }
}
