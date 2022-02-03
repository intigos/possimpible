

type Unpacked<T> = [T, number]
type Unpacker<T> = (s: Uint8Array, p: number) => [T, number]
type Packer<T> = (t: T) => Uint8Array

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function packBytearray(s: Uint8Array){
    const buff = new ArrayBuffer(s.length + 8)
    const dv = new DataView(buff)
    dv.setFloat64(0, s.length);
    const result = new Uint8Array(buff);
    result.set(s, 8)
    return result;
}

export function unpackBytearray(s:Uint8Array, p: number): Unpacked<Uint8Array>{
    const dv = new DataView(s.buffer)
    const l = dv.getFloat64(s.byteOffset + p);
    return [s.subarray(p + 8, p + 8 + l), p + 8 + l];
}

export function packString(s:string): Uint8Array{
    const arr = encoder.encode(s)
    const buff = new ArrayBuffer(arr.length + 8)
    const dv = new DataView(buff)
    dv.setFloat64(0, arr.length);
    const result = new Uint8Array(buff);
    result.set(arr, 8)
    return result;
}

export function unpackString(s:Uint8Array, p: number): Unpacked<string>{
    const dv = new DataView(s.buffer)
    const l = dv.getFloat64(s.byteOffset + p);
    return [decoder.decode(s.subarray(p + 8, p + 8 + l)), p + 8 + l];
}

export function packA<T>(s:T[], packer:Packer<T>): Uint8Array{
    const arrs = s.map(x => packer(x));
    const length = arrs.map(x => x.length).reduce((x, y) => x + y, 0);
    const result = new Uint8Array(8 + length);
    const dv = new DataView(result.buffer);
    dv.setFloat64(0, s.length);
    let p = 8;
    for(const arr of arrs){
        result.set(arr, p);
        p += arr.length;
    }
    return result
}

export function unpackA<T>(unpacker: Unpacker<T>): (s:Uint8Array, p: number) => Unpacked<T[]>{
    return (s:Uint8Array, p: number): Unpacked<T[]> => {
        const dv = new DataView(s.buffer);
        const length = dv.getFloat64(s.byteOffset + p);
        const result: T[] = []
        p += 8;
        for (let i=0; i<length; i++) {
            let [str, off] = unpacker(s, p);
            result.push(str);
            p = off;
        }
        return [result, p];
    }
}

export function packInt8(s:number){
    const arr = new Uint8Array(1);
    const dv = new DataView(arr.buffer);
    dv.setInt8(0, s);
    return arr;
}

export function unpackInt8(s:Uint8Array, p: number): Unpacked<number>{
    return [new DataView(s.buffer).getInt8(s.byteOffset + p), p + 1];
}

export function packUInt8(s:number){
    const arr = new Uint8Array(1);
    const dv = new DataView(arr.buffer);
    dv.setUint8(0, s);
    return arr;
}

export function unpackUInt8(s:Uint8Array, p: number): Unpacked<number>{
    return [new DataView(s.buffer).getUint8(s.byteOffset + p), p + 1];
}

export function packUInt16(s:number){
    const arr = new Uint8Array(2);
    const dv = new DataView(arr.buffer);
    dv.setUint16(0, s);
    return arr;
}

export function unpackUInt16(s:Uint8Array, p: number): Unpacked<number>{
    return [new DataView(s.buffer).getUint16(s.byteOffset + p), p + 2];
}

export function packInt32(s:number){
    const arr = new Uint8Array(4);
    const dv = new DataView(arr.buffer);
    dv.setInt32(0, s);
    return arr;
}

export function unpackInt32(s:Uint8Array, p: number): Unpacked<number>{
    return [new DataView(s.buffer).getInt32(s.byteOffset + p), p + 4];
}

export function packUInt32(s:number){
    const arr = new Uint8Array(4);
    const dv = new DataView(arr.buffer);
    dv.setUint32(0, s);
    return arr;
}

export function unpackUInt32(s:Uint8Array, p: number): Unpacked<number>{
    return [new DataView(s.buffer).getUint32(s.byteOffset + p), p + 4];
}

export function packDouble(s:number){
    const arr = new Uint8Array(8);
    const dv = new DataView(arr.buffer);
    dv.setFloat32(0, s);
    return arr;
}

export function unpackDouble(s:Uint8Array, p: number): Unpacked<number>{
    return [new DataView(s.buffer).getFloat32(s.byteOffset + p), p + 8];
}

export function pack(arrs: Uint8Array[]){
    const length = arrs.map(x => x.length).reduce((x, y) => x + y);
    const result = new Uint8Array(length);
    let p = 0;
    for(const arr of arrs){
        result.set(arr, p);
        p += arr.length;
    }
    return result;
}

export function unpack(arr: Uint8Array, pattern: Unpacker<any>[]): any[]{
    let p = 0;
    const result: any[]  = [];
    for(const pat of pattern){
        const [obj, off] = pat(arr, p);
        result.push(obj);
        p = off;
    }
    return result;
}
