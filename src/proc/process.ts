/**
 * A worker sets up the {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API | WebWorker} with the
 * basic API and event handler to be used as process. This code is only used by the WebWorker, not by the kernel.
 *
 * @module worker
 */

import {CreateMode, ForkMode2, IStat, ISystemCalls, MountType, OpenMode, PError, Status} from "../public/api";
import {
    debug,
    FileDescriptor,
    MessageID,
    MessageType, MPBind, MPChCwd, MPClose, MPCreate, MPDie, MPExec, MPFork, MPGetCwd, MPMount, MPOpen, MPPipe,
    MPRead, MPReady, MPRemove, MPUnmount, MPWrite, MUCreateRes,
    MUDependency, MUExecRes, MUGetCwdRes, MUOpenRes, MUPipeRes,
    MUReadRes, MURemoveRes, MUSignal,
    MUStart, MUWrite, MUWriteRes,
    peak, Signal
} from "../shared/proc";
import {packA, packStat, unpackA, unpackStat} from "../shared/struct";
import {TextEncoder} from "util";
import SharedBufferExchange from "./sbx";
import {VM} from "./wasm";
import {ptr, struct, usize, fd, u32} from "./11p"
import {char, errno, iovec} from "./wasi_snapshot_preview1";

const te = new self.TextEncoder();

/**
 * An instance of {@link Process} is created at the start of the worker. This contains helper functions that construct
 * the correct structures to send to the main kernel.
 *
 */
export class Process {
    public argv?: string[]
    private argvbytes: Uint8Array[] | undefined;
    private argvlen: number = 0;
    private sbx: SharedBufferExchange;
    private vm: VM;


    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    constructor(sab: SharedArrayBuffer) {
        this.sbx = new SharedBufferExchange(sab);
        this.vm = new VM({
            fd_write: (fd: fd, iovs: ptr<struct<iovec>>, iovs_len: usize, nwritten: ptr<usize>): errno => {
                let dv = this.vm.getDataView();
                const arr = this.vm.getiovs(iovs, iovs_len);
                this.sys_write(fd, arr[0]);
                this.vm.writeValue(nwritten, arr.length);
                return errno.SUCCESS;
            },

            args_get: (argv: ptr<ptr<char>>, argv_buf: ptr<char>): errno => {
                this.ensureArgvBytes();
                let p = argv_buf;
                let s = 0;
                for (let i = 0; i < this.argvbytes!.length; i++) {
                    this.vm.writeValue(argv + (s * 4), p);
                    this.vm.write8Data(p, this.argvbytes![i]);
                    p += this.argvbytes![i].byteLength + 1;
                    s++;
                }
                return errno.SUCCESS;
            },

            args_sizes_get: (argc: ptr<usize>, argv_buf_size: ptr<usize>): errno => {
                this.ensureArgvBytes();
                this.vm.writeValue(argc, this.argvbytes!.length)
                this.vm.writeValue(argv_buf_size, this.argvlen)
                return errno.SUCCESS;
            },

            proc_exit: (rval: u32): void => {
                this.sys_die(rval);
            },
            path_open:(dirfd, dirflags, path, path_len, oflags, fs_rights_base, fs_rights_inheriting, fs_flags, fd): errno => {
                const p = this.vm.fetchCString(path, path_len);
                const result = this.sys_open(p, 0x3);
                this.vm.writeValue(fd, result);
                return errno.SUCCESS;
            }
        }, {
            sys_bind: (dev: ptr<char>, devlen: usize, path: ptr<char>, pathlen: usize, flag: number): errno => {
                const d = this.vm.fetchCString(dev, devlen);
                const p = this.vm.fetchCString(path, pathlen);
                this.sys_bind(d, p, flag);
                return errno.SUCCESS
            },

            sys_fork:(path, pathLen, iovs, iovs_len) => {
                const p = this.vm.fetchCString(path, pathLen);
                const arr = this.vm.getiovCString(iovs, iovs_len);
                this.sys_fork(p, arr, 0)
                return errno.SUCCESS;
            }
        });
    }

    private ensureArgvBytes(){
        if(!this.argvbytes) {
            this.argvbytes = this.argv!.map(x => te.encode(x))
            this.argvlen = this.argvbytes!.map(x => x.byteLength + 1).reduce((x, y) => x + y, 0)
        }
    }

    async run() {
        await this.sbx.ready();
        await this.sbx.write(MPReady(this.uuidv4()));

        let message = await this.sbx.read();
        const [type, id] = peak(message);

        if (type == MessageType.START) {
            let [_, code, argv] = MUStart(message)
            this.argv = argv;
            await this.vm.assemble(code);
            await this.vm.run();
            this.sys_die(0);
        } else {
            // throw error;
        }
    }

    private callWithPromise(message: Uint8Array): Uint8Array {
        let [type, id] = peak(message);
        this.sbx.writeSync(message);
        const response = this.sbx.readSync();
        [type, id] = peak(response);
        if (type != MessageType.SIGNAL) {
            return response;
        } else {
            let [_, signal, arg] = MUSignal(response);
            if (signal == Signal.ERROR) {
                throw new PError(arg);
            }else{
                throw new PError(Status.EXDEV);
            }
        }
    }

    private async sys_read(fd: FileDescriptor, count: number): Promise<Uint8Array> {
        const res = await this.callWithPromise(MPRead(this.uuidv4(), fd, count));
        const [_, buf] = MUReadRes(res);
        return buf;
    }

    private sys_write(fd: FileDescriptor, buf: Uint8Array): number {
        const res = this.callWithPromise(MPWrite(this.uuidv4(), fd, buf));
        const [_, count] = MUWriteRes(res);
        return count;
    }

    private sys_open(path: string, flags: OpenMode): FileDescriptor {
        const res = this.callWithPromise(MPOpen(this.uuidv4(), path, flags));
        debugger;
        const [_, fd] = MUOpenRes(res);
        return fd;
    }

    private async sys_close(fd: FileDescriptor) {
        await this.callWithPromise(MPClose(this.uuidv4(), fd));
    }

    private async sys_remove(path: string): Promise<void> {
        const res = await this.callWithPromise(MPRemove(this.uuidv4(), path));
        const [_,] = MURemoveRes(res);
        return;
    }

    private async sys_getcwd(): Promise<string> {
        const res = await this.callWithPromise(MPGetCwd(this.uuidv4()));
        const [_, path] = MUGetCwdRes(res);
        return path;
    }

    private async sys_exec(path: string, argv: string[]): Promise<number> {
        const res = await this.callWithPromise(MPExec(this.uuidv4(), path, argv));
        const [_, pid] = MUExecRes(res);
        return pid;
    }

    private sys_fork(path: string, argv: string[], mode: ForkMode2): number {
        const res = this.callWithPromise(MPFork(this.uuidv4(), path, argv, mode));
        const [_, pid] = MUExecRes(res);
        return pid;
    }

    private async sys_chcwd(path: string) {
        await this.callWithPromise(MPChCwd(this.uuidv4(), path));
    }

    private sys_die(status: Status) {
        this.callWithPromise(MPDie(this.uuidv4(), status));
    }

    private async sys_mount(fd: FileDescriptor, afd: FileDescriptor | null, old: string, flags?: MountType, aname?: string) {
        await this.callWithPromise(MPMount(this.uuidv4(), fd, afd || -1, old, aname || "", flags || 0));
    }

    private sys_bind(name: string, old: string, flags?: MountType) {
        this.callWithPromise(MPBind(this.uuidv4(), name, old, flags || 0));
    }

    private async sys_unmount(path: string) {
        await this.callWithPromise(MPUnmount(this.uuidv4(), path));
    }

    private async sys_create(path: string, mode: CreateMode): Promise<FileDescriptor> {
        const res = await this.callWithPromise(MPCreate(this.uuidv4(), path, mode));
        const [_, fd] = MUCreateRes(res);
        return fd;
    }

    private async sys_pipe(): Promise<FileDescriptor[]> {
        const res = await this.callWithPromise(MPPipe(this.uuidv4()));
        const [_, pipefd] = MUPipeRes(res);
        return pipefd;
    }


    public packStat(stat: IStat): Uint8Array {
        return packStat(stat);
    }

    public unpackStat(s: Uint8Array): IStat {
        return unpackStat(s, 0)[0];
    }

    public packAStat(stat: IStat[]): Uint8Array {
        return packA(stat, packStat);
    }

    public unpackAStat(s: Uint8Array): IStat[] {
        return unpackA(unpackStat)(s, 0)[0]
    }
}
