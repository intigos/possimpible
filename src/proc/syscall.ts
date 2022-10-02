import {sys_bind, sys_fork} from "./11p";
import {args_get, args_sizes_get, fd_write, path_open, proc_exit} from "./wasi_snapshot_preview1";

export interface WASISnapshotPreview1SystemCalls{
    fd_write: typeof fd_write
    args_get: typeof args_get
    args_sizes_get: typeof args_sizes_get
    path_open: typeof path_open
    proc_exit: typeof proc_exit
}

export interface P11SystemCalls{
    sys_bind: typeof sys_bind
    sys_fork: typeof sys_fork
}
