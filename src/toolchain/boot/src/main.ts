import "wasi";
import {debug, sys_bind} from "./11p";
import { fd_write, path_open, args_sizes_get, args_get } from "@assemblyscript/wasi-shim/assembly/bindings/wasi_snapshot_preview1.ts";
import {yellow} from "../../../sys/colors";


type aisize = i32;

function ss(s: string): usize[]{
    let s_buf = String.UTF8.encode(s);
    let s_len: usize = s_buf.byteLength;
    let p = changetype<usize>(s_buf);
    return [p, s_len]
}

function bind(dev: string, path: string): void {
    let deva = ss(dev);
    let patha = ss(path);
    sys_bind(deva[0], deva[1], patha[0], patha[1], 0);
}

function open(path: string, flags: u32): void {
    let patha = ss(path);
    let fd: u32 = 0;
    let res = changetype<usize>(fd);
    path_open(0,0,patha[0],patha[1],0,0,0,0,res);
    return res;
}

function write(fd: u32, s: string): void {
    let s_utf8_buf = String.UTF8.encode(s);
    let s_utf8_len: usize = s_utf8_buf.byteLength;
    let iov = memory.data(16);
    store<u32>(iov, changetype<usize>(s_utf8_buf));
    store<u32>(iov, s_utf8_len, sizeof<usize>());

    let written_ptr = memory.data(8);
    fd_write(fd, iov, 1, written_ptr);
}

function fromCString(cstring: usize): string {
    let size = 0;
    while (load<u8>(cstring + size) !== 0) {
        size++;
    }
    return String.UTF8.decodeUnsafe(cstring, size);
}

let args: string[] = [];
memory.grow(2);
let count_and_size = memory.data(16);
let ret = args_sizes_get(count_and_size, count_and_size + 4);
let count = load<usize>(count_and_size, 0);
let size = load<usize>(count_and_size, sizeof<usize>());
let x = new ArrayBuffer((count as aisize + 1) * sizeof<usize>())
let env_ptrs = changetype<usize>(x);
let y = new ArrayBuffer(size as aisize);
let buf = changetype<usize>(y);
args_get(env_ptrs, buf);

for (let i: usize = 0; i < count; i++) {
    let env_ptr = load<usize>(env_ptrs + i * sizeof<usize>());
    let arg = fromCString(env_ptr);
    args.push(arg);
}

const options = new Map<string, string>();
args.slice(1).forEach(x =>{
    const values = x.split("=");
    options.set(values[0], values[1]);
})

bind("#c", "/dev");
bind("#b", "/dev");
bind("#s", "/srv");
bind("#e", "/env");
bind("#⌨️", "/dev");

bind(options.get("serial"), "/dev/cons");
bind(options.get("serial"), "/dev/scancode");

open("/dev/scancode", 0);
open("/dev/cons", 0);
open("/dev/cons", 0);

write(1, `Booting System...\n\r${yellow("Command line")}: `);
const list = options.keys();
for (let i=0; i<list.length; i++){
    write(1, list[i] + "=" + options.get(list[i]) + " ");
}
write(1, "\n\r\n\r");

write(0, "Starting " + options.get("filesrv") + " of " + options.get("initrd") + "\n\r");
fork("/boot/" + options.get("filesrv"), [options.get("initrd")!, "/srv/initrd"], 0);
