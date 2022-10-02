// @ts-ignore: decorator
import {iovec, struct} from "../../../proc/wasi_snapshot_preview1";

export type char = u8;
export type ptr<T> = usize;
@unsafe
@external("11p", "sys_bind")
export declare function sys_bind(dev: ptr<char>, devLen: usize, path: ptr<char>, pathLen: usize, flags: i32): void

// @ts-ignore: decorator
@unsafe
@external("11p", "sys_fork")
export declare function sys_fork(exec: i32, args: i32, mode:i32): void

// @ts-ignore: decorator
@unsafe
@external("11p", "sys_exec")
export declare function sys_exec(exec: i32, args: i32, mode:i32): void

// @ts-ignore: decorator
@unsafe
@external("11p", "sys_fork")
export declare function sys_fork(path: ptr<char>, pathLen: usize, iovs: ptr<struct<iovec>>, iovs_len: usize): void
