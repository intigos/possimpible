import {errno, iovec} from "./wasi_snapshot_preview1";

export type usize = number;
export type u8 = number;
export type u16 = number;
export type u32 = number;
export type u64 = number;
export type i64 = number;
export type char = u8;
export type ptr<T> = usize; // all pointers are usize'd
export type struct<T> = T;  // structs are references already in AS
export type fd = u32;

export declare function sys_bind(dev: ptr<char>, devlen: usize, path: ptr<char>, pathlen: usize, flag: number): errno;
export declare function sys_fork(path: ptr<char>, pathLen: usize, iovs: ptr<struct<iovec>>, iovs_len: usize): errno
