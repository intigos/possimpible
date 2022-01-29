/**
 * A worker sets up the {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API | WebWorker} with the
 * basic API and event handler to be used as process. This code is only used by the WebWorker, not by the kernel.
 *
 * @module worker
 */

import {CreateMode, ISystemCalls, MountType, OpenMode, PError, Status} from "../public/api";
import {
    debug,
    FileDescriptor,
    MessageID,
    MessageType, MPBind, MPChCwd, MPClose, MPCreate, MPDie, MPExec, MPGetCwd, MPMount, MPOpen, MPPipe,
    MPRead, MPReady, MPRemove, MPUnmount, MPWrite, MUCreateRes,
    MUDependency,
    MUError, MUExecRes, MUGetCwdRes, MUOpenRes, MUPipeRes,
    MUReadRes, MURemoveRes,
    MUStart, MUWrite, MUWriteRes,
    peak
} from "../shared/proc";

/**
 * An instance of {@link Process} is created at the start of the worker. This contains helper functions that construct
 * the correct structures to send to the main kernel.
 *
 */
export class Process{
    /**
     * Router containing the identification of each message negotiated with the kernel.
     */
    private router = new Map<MessageID, (message: Uint8Array) => void>();
    /**
     * This process arguments
     */
    public argv?: string[]
    /**
     * Syscalls available to the process
     */
    public sys : ISystemCalls = {
        read: this.sys_read.bind(this),
        write: this.sys_write.bind(this),
        open: this.sys_open.bind(this),
        getcwd: this.sys_getcwd.bind(this),
        remove: this.sys_remove.bind(this),
        close: this.sys_close.bind(this),
        exec: this.sys_exec.bind(this),
        chcwd: this.sys_chcwd.bind(this),
        die: this.sys_die.bind(this),
        bind: this.sys_bind.bind(this),
        mount: this.sys_mount.bind(this),
        unmount: this.sys_unmount.bind(this),
        pipe: this.sys_pipe.bind(this),
        create: this.sys_create.bind(this)
    }

    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    constructor() {
        self.addEventListener("message", ev => this.handleMessage(ev));
        self.postMessage(MPReady(this.uuidv4()))
    }

    private handleMessage(handle: MessageEvent<Uint8Array>){
        let message = handle.data;
        const [type, id] = peak(message);
        console.log(debug(handle.data));
        if (type >= MessageType.READ_RES) {
            if (this.router.has(id)) {
                this.router.get(id)!.call(null, message);
                this.router.delete(id);
            }
        }else if(type == MessageType.DEPENDENCY){
            let [_, name, code] = MUDependency(message)
            eval(code);
        }else if(type == MessageType.START){
            let [_, code, argv] = MUStart(message)
            this.argv = argv;
            eval(code);
        }
    }

    private call(message: Uint8Array){
        self.postMessage(message, [message.buffer]);
    }

    private callWithPromise(message: Uint8Array) : Promise<Uint8Array>{
        const [type, id] = peak(message);
        return new Promise<Uint8Array>((resolve, reject) => {
            this.router.set(id, response => {
                this.router.delete(id);
                if (type != MessageType.ERROR){
                    resolve(response);
                }else{
                    let [_, status] = MUError(message);
                    reject(new PError(status))
                }
            });
            self.postMessage(message, [message.buffer]);
        })
    }

    private async sys_read(fd: FileDescriptor, count: number) : Promise<Uint8Array>{
        const res = await this.callWithPromise(MPRead(this.uuidv4(), fd, count));
        const [_, buf] = MUReadRes(res);
        return buf;
    }

    private async sys_write(fd: FileDescriptor, buf: Uint8Array) : Promise<number>{
        const res = await this.callWithPromise(MPWrite(this.uuidv4(), fd, buf));
        const [_, count] = MUWriteRes(res);
        return count;
    }

    private async sys_open(path: string, flags: OpenMode): Promise<FileDescriptor>{
        const res = await this.callWithPromise(MPOpen(this.uuidv4(), path, flags));
        const [_, fd] = MUOpenRes(res);
        return fd;
    }

    private async sys_close(fd: FileDescriptor) {
        await this.callWithPromise(MPClose(this.uuidv4(), fd));
    }

    private async sys_remove(path: string) : Promise<void>{
        const res = await this.callWithPromise(MPRemove(this.uuidv4(), path));
        const [_, ] = MURemoveRes(res);
        return;
    }

    private async sys_getcwd() : Promise<string>{
        const res = await this.callWithPromise(MPGetCwd(this.uuidv4()));
        const [_, path] = MUGetCwdRes(res);
        return path;
    }

    private async sys_exec(path: string, argv:string[]) : Promise<number>{
        const res = await this.callWithPromise(MPExec(this.uuidv4(), path, argv));
        const [_, pid] = MUExecRes(res);
        return pid;
    }

    private async sys_chcwd(path: string){
        await this.callWithPromise(MPChCwd(this.uuidv4(), path));
    }

    private async sys_die(status: Status){
        await this.callWithPromise(MPDie(this.uuidv4(), status));
    }

    private async sys_mount(fd: FileDescriptor, afd: FileDescriptor|null, old: string, flags?:MountType, aname?: string){
        await this.callWithPromise(MPMount(this.uuidv4(), fd, afd || -1, old, aname || "", flags||0));
    }

    private async sys_bind(name: string, old: string, flags?: MountType){
        await this.callWithPromise(MPBind(this.uuidv4(), name, old, flags || 0));
    }

    private async sys_unmount(path:string){
        await this.callWithPromise(MPUnmount(this.uuidv4(), path));
    }

    private async sys_create(path:string, mode: CreateMode): Promise<FileDescriptor>{
       const res = await this.callWithPromise(MPCreate(this.uuidv4(), path, mode));
       const [_, fd] = MUCreateRes(res);
       return fd;
    }

    private async sys_pipe(): Promise<FileDescriptor[]>{
        const res = await this.callWithPromise(MPPipe(this.uuidv4()));
        const [_, pipefd] = MUPipeRes(res);
        return pipefd;
    }
}
