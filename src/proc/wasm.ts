import {P11SystemCalls, WASISnapshotPreview1SystemCalls} from "./syscall";
import {char, ptr, struct, usize} from "./11p";
import {iovec} from "./wasi_snapshot_preview1";




export class VM{
    private module?: WebAssembly.Module;
    private instance?: WebAssembly.Instance;
    public memory?: WebAssembly.Memory;
    private wasi: WASISnapshotPreview1SystemCalls;
    private p11: P11SystemCalls;
    private refs: string[] = [];
    private td: TextDecoder;
    

    constructor(wasi: WASISnapshotPreview1SystemCalls, p11:P11SystemCalls) {
        this.wasi = wasi;
        this.p11 = p11;
        this.td = new TextDecoder();
    }

    async assemble(code: BufferSource) {
        this.module = await WebAssembly.compile(code)
        this.refs = [];
        for (let x of WebAssembly.Module.imports(this.module!)) {
            if (x.module.startsWith("wasi_")) {
                this.refs.push(x.module);
            }
        }
    }
    async run(){
        //this.memory = new WebAssembly.Memory({ initial: 1, });
        const importObject: any = {env : {}};

        for (const ref of this.refs) {
            importObject[ref] = this.wasi;
        }
        importObject["11p"] = this.p11;
        this.instance = await WebAssembly.instantiate(this.module!, importObject);
        // @ts-ignore
        this.instance.exports._start();

    }

    getDataView(){
        return new DataView(this.getMemory().buffer!);
    }

    covertCString(data: Uint8Array){
        const bufferBytes: number[] = [];
        for (var b = 0; b < data.byteLength; b++) {
            bufferBytes.push(data[b]);
        }
        return String.fromCharCode.apply(null, bufferBytes);
    }

    getMemory(){
        return this.instance!.exports.memory as WebAssembly.Memory;
    }

    fetchCString(pos: ptr<char>, len: usize){
        return new TextDecoder().decode(new Uint8Array(this.getMemory().buffer, pos, len));
    }

    getiovs(iovs: ptr<struct<iovec>>, iovsLen: usize) {
        const dv = this.getDataView();

        let buffers = Array.from({length: iovsLen}, (_, i) => {
            const ptr = iovs + i * 8;
            const buf = dv.getUint32(ptr, !0);
            const bufLen = dv.getUint32(ptr + 4, !0);

            return new Uint8Array(this.getMemory().buffer, buf, bufLen);
        });

        return buffers;
    }
    getiovCString(iovs: ptr<struct<iovec>>, iovsLen: usize): string[] {
        return this.getiovs(iovs, iovsLen).map(x => new TextDecoder().decode(x))
    }

    writeValue(pos: ptr<usize>, value: usize){
        const dv = this.getDataView();
        dv.setUint32(pos, value, !0);
    }

    write8Data(pos: ptr<usize>, data: Uint8Array){
        const dv = this.getDataView();
        for (let c = 0; c < data.byteLength; c++) {
            dv.setUint8(pos, data[c]);
            pos++;
        }
        dv.setUint8(pos, 0);
    }
    
    
}
