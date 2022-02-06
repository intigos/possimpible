/**
 * A worker sets up the {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API | WebWorker} with the
 * basic API and event handler to be used as process. This code is only used by the WebWorker, not by the kernel.
 *
 * @module worker
 */

import {Perm, ForkMode2, IStat, ISystemCalls, MType, OMode, PError, Status} from "../public/api";
import {
    debug,
    FileDescriptor,
    MessageID,
    MessageType, MPBind, MPChCwd, MPClose, MPCreate, MPDie, MPExec, MPFork, MPGetCwd, MPMount, MPOpen, MPPipe,
    MPRead, MPReady, MPRemove, MPSleep, MPUnmount, MPWait, MPWrite, MUCreateRes,
    MUDependency, MUExecRes, MUGetCwdRes, MUOpenRes, MUPipeRes,
    MUReadRes, MURemoveRes, MUSignal, MUSleepRes,
    MUStart, MUWait, MUWaitRes, MUWrite, MUWriteRes,
    peak, Signal
} from "../shared/proc";
import {packA, packStat, unpackA, unpackStat} from "../shared/struct";

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
        create: this.sys_create.bind(this),
        fork: this.sys_fork.bind(this),
        wait: this.sys_wait.bind(this),
        sleep: this.sys_sleep.bind(this)
    }
    private callsites = new Map<string, (...args: any) => any>()

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

    private async handleMessage(handle: MessageEvent<Uint8Array>) {
        let message = handle.data;
        const [type, id] = peak(message);
        if (type >= MessageType.READ_RES) {
            if (this.router.has(id)) {
                this.router.get(id)!.call(null, message);
                this.router.delete(id);
            }
        } else if (type == MessageType.DEPENDENCY) {
            let [_, name, code] = MUDependency(message);
            (self as any)[name] = null;
            eval(code);
        } else if (type == MessageType.START) {
            let [_, code, argv] = MUStart(message)
            this.argv = argv;
            eval(code);
            const cs = this.callsites.get("__start");
            if (cs) {
                await cs(argv);
                await this.sys_die(0);
            }
        }
    }

    private call(message: Uint8Array){
        self.postMessage(message, [message.buffer]);
    }

    private callWithPromise(message: Uint8Array) : Promise<Uint8Array>{
        const [type, id] = peak(message);
        return new Promise<Uint8Array>((resolve, reject) => {
            this.router.set(id, response => {
                const [type, id] = peak(response);
                this.router.delete(id);
                if (type != MessageType.SIGNAL){
                    resolve(response);
                }else{
                    let [_, signal, arg] = MUSignal(response);
                    if(signal == Signal.ERROR){
                        reject(new PError(arg))
                    }
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

    private async sys_open(path: string, flags: OMode): Promise<FileDescriptor>{
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

    private async sys_fork(path: string, argv:string[], mode: ForkMode2) : Promise<number>{
        const res = await this.callWithPromise(MPFork(this.uuidv4(), path, argv, mode));
        const [_, pid] = MUExecRes(res);
        return pid;
    }

    private async sys_chcwd(path: string){
        await this.callWithPromise(MPChCwd(this.uuidv4(), path));
    }

    private async sys_die(status: Status){
        await this.callWithPromise(MPDie(this.uuidv4(), status));
    }

    private async sys_mount(fd: FileDescriptor, afd: FileDescriptor|null, old: string, flags?:MType, aname?: string){
        await this.callWithPromise(MPMount(this.uuidv4(), fd, afd || -1, old, aname || "", flags||0));
    }

    private async sys_bind(name: string, old: string, flags?: MType){
        await this.callWithPromise(MPBind(this.uuidv4(), name, old, flags || 0));
    }

    private async sys_unmount(path:string){
        await this.callWithPromise(MPUnmount(this.uuidv4(), path));
    }

    private async sys_create(path:string, mode: OMode, perm: Perm): Promise<FileDescriptor>{
       const res = await this.callWithPromise(MPCreate(this.uuidv4(), path, mode, perm));
       const [_, fd] = MUCreateRes(res);
       return fd;
    }

    private async sys_pipe(): Promise<FileDescriptor[]>{
        const res = await this.callWithPromise(MPPipe(this.uuidv4()));
        const [_, pipefd] = MUPipeRes(res);
        return pipefd;
    }

    private async sys_wait(pid: number): Promise<void>{
        const res = await this.callWithPromise(MPWait(this.uuidv4(), pid));
        const [_] = MUWaitRes(res);
        return;
    }

    private async sys_sleep(sleep: number): Promise<void>{
        const res = await this.callWithPromise(MPSleep(this.uuidv4(), sleep));
        const [_] = MUSleepRes(res);
        return;
    }

    public packStat(stat: IStat): Uint8Array{
        return packStat(stat);
    }

    public unpackStat(s: Uint8Array): IStat{
        return unpackStat(s, 0)[0];
    }

    public packAStat(stat: IStat[]): Uint8Array{
        return packA(stat, packStat);
    }

    public unpackAStat(s: Uint8Array): IStat[]{
        return unpackA(unpackStat)(s, 0)[0]
    }

    public async entrypoint(ep: (...args: any) => any, p?: string){
        this.callsites.set(p ? p: "__start" , ep);
    }
}
