const BUFSIZE = 1024;
const HEAD = 8;
type Mode = 0|1

export default class SharedBufferExchange {
    private array: Int32Array;
    private mode: Mode = 1;
    private other: Mode = 0;
    buffer: SharedArrayBuffer;


    constructor(buffer?: SharedArrayBuffer) {
        if (!buffer){
            buffer = new SharedArrayBuffer(BUFSIZE + HEAD);
            this.mode = 0;
            this.other = 1;
        }
        this.buffer = buffer;
        this.array = new Int32Array(this.buffer);
    }

    private async signal(i: Mode, wipe=true){
            // @ts-ignore
            const obj = Atomics.waitAsync(this.array, i, 0);
            if (obj.async) {
                await obj.value;
                if (wipe) {
                    this.array[i] = 0;
                }
            }
    }

    writeSync(array: Uint8Array){
        let length = array.length;
        let offset = 0;
        while(length > 0){
            const dim = (length < BUFSIZE) ? length : BUFSIZE;
            const arr = new Uint8Array(this.buffer, HEAD, dim);
            const orig = new Uint8Array(array.buffer, offset, dim);
            arr.set(orig);
            this.array[this.mode] = length;
            length -= dim;
            offset += dim;
            this.array[this.other] = 0;
            Atomics.notify(this.array, this.mode);
            if(length > 0) Atomics.wait(this.array, this.other, 0);
        }
    }

    async write(array: Uint8Array){
        let length = array.length;
        let offset = 0;
        while(length > 0){
            const dim = (length < BUFSIZE) ? length : BUFSIZE;
            const arr = new Uint8Array(this.buffer, HEAD, dim);
            const orig = new Uint8Array(array.buffer, offset, dim);
            arr.set(orig);
            this.array[this.mode] = length;
            length -= dim;
            offset += dim;
            this.array[this.other] = 0;
            Atomics.notify(this.array, this.mode);
            if(length > 0) await this.signal(this.other);

        }
    }

    async ready(){
        if (this.mode == 1){
            this.array[this.mode] = 1;
            Atomics.notify(this.array, this.mode);
        }else{
            // @ts-ignore
            const obj = Atomics.waitAsync(this.array, this.other, 0);
            if (obj.async) {
                await obj.value;
                this.array[this.other] = 0;
            }
        }
    }

    readSync(): Uint8Array {
        Atomics.wait(this.array, this.other, 0);
        let length = this.array[this.other];
        const result = new Uint8Array(this.array[this.other])
        let offset = 0;
        do {
            const dim = (length < BUFSIZE) ? length : BUFSIZE;
            const arr = new Uint8Array(this.buffer, HEAD, dim);
            const orig = new Uint8Array(result.buffer, offset, dim);
            orig.set(arr);
            length -= dim;
            offset += dim;
            this.array[this.other] = 0;
            if(length > 0) {
                this.array[this.mode] = 1;
                const wake = Atomics.notify(this.array, this.mode);
                Atomics.wait(this.array, this.other, 0);
            }else{
                this.array[this.mode] = 0;
            }
        } while (length > 0);
        return result;
    }

    async read(): Promise<Uint8Array> {
        await this.signal(this.other, false);
        let length = this.array[this.other];
        const result = new Uint8Array(this.array[this.other])
        let offset = 0;
        do {
            const dim = (length < BUFSIZE) ? length : BUFSIZE;
            const arr = new Uint8Array(this.buffer, HEAD, dim);
            const orig = new Uint8Array(result.buffer, offset, dim);
            orig.set(arr);
            length -= dim;
            offset += dim;
            this.array[this.other] = 0;
            if(length > 0) {
                this.array[this.mode] = 1;
                const wake = Atomics.notify(this.array, this.mode);
                await this.signal(this.other, false);
            }else{
                this.array[this.mode] = 0;
            }
        } while (length > 0);
        return result;
    }
}
