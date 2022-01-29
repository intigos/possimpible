import {v4 as UUID} from 'uuid';
import {IContainer} from "./orchestrator";
import {IDynaLib, IPEXF} from "../../shared/pexf";
// import {IProcFSEntry, procCreate, procMkdir, procRemove} from "../fs/procfs/module";
import {IPath} from "../vfs/path";
import {System} from "../system";
import {IChannel} from "../vfs/channel";
import {INSProxy} from "../ns/ns";
import {Lookup} from "../vfs/namei";
import {OpenMode, PError, Status} from "../../public/api";
import {
    FileDescriptor,
    MessageType, MPBindRes, MPChCwdRes, MPClose, MPCloseRes, MPCreateRes,
    MPDependency, MPError, MPExecRes, MPGetCwdRes, MPOpenRes, MPPipeRes,
    MPReadRes, MPRemoveRes, MPWriteRes, MUBind, MUChCwd, MUClose, MUCreate, MUExec,
    MUGetCwd, MUOpen, MUPipe,
    MURead, MURemove,
    MUWrite, peak
} from "../../shared/proc";

type pid = number;

export interface ITaskOperations {
    getParent: (task: ITask) => ITask|null
}

export enum ITaskStatus {
    PENDING,
    RUNNGING,
    STOP
}

export interface IFile {
    position: number;
    channel: IChannel;
}

function mkfile(c: IChannel): IFile{
    return { position: 0, channel: c };
}

export interface ITaskFiles {
    fileDescriptors: (IFile | null)[]
}

export interface IProtoTask{
    pid?: number,
    uid?: number,
    gid?: number,
    ns: INSProxy;
    root: IPath;
    pwd: IPath;
}

export interface ITask extends IProtoTask{
    status: ITaskStatus,
    pid: number,
    uid: number,
    gid: number,
    sys: any,
    pwd: IPath;
    root: IPath;
    waits: ((value: (string | PromiseLike<string>)) => void)[];
    files: ITaskFiles
    parent?: pid
    operations: ITaskOperations
}


export interface IProcess {
    container: IContainer,
    task: ITask
}

export class ProcessManager {
    private lastId = 0;
    public pool: Map<pid, IProcess> = new Map<pid, IProcess>();
    public containers: Map<UUID, IProcess> = new Map<UUID, IProcess>();
    private system: System;

    constructor(kernel: System) {
        this.system = kernel;
    }

    taskOperations: ITaskOperations = {
        getParent: this.getParent
    }

    private genID(): number {
        this.lastId++;
        return this.lastId;
    }

    getParent(task: ITask): ITask|null {
        if (task.parent) {
            let c = this.pool.get(task.parent);
            if (c) {
                return c.task;
            }
        }
        return null
    }

    async handleProcess(type: MessageType, message: Uint8Array, container: IContainer) {
        const process = this.containers.get(container.id)!;
        this.system.current = process.task;
        try{
            switch (type) {
                case MessageType.WRITE: {
                    let [id, fd, buf] = MUWrite(message);
                    const file = process.task.files.fileDescriptors[fd];
                    if (file) {
                        const channel = file.channel;
                        if (channel.operations.write) {
                            await channel.operations.write(channel, buf, file.position);
                            container.operations.send(container, MPWriteRes(id, 0))
                        } else {
                            throw new PError(Status.EPERM);
                        }
                    } else {
                        throw new PError(Status.EBADFD);
                    }
                    break;
                }
                case MessageType.READ: {
                    let [id, fd, count] = MURead(message);
                    const file = process.task.files.fileDescriptors[fd];
                    if (file) {
                        let buf;
                        const channel = file.channel;
                        if(channel.operations.read){
                            buf = await channel.operations.read(channel, count, file.position);
                        }else{
                            throw new PError(Status.EINVAL);
                        }
                        container.operations.send(container, MPReadRes(id, buf))
                    } else {
                        throw new PError(Status.EBADFD);
                    }
                    break;
                }
                case MessageType.GETCWD: {
                    let [id] = MUGetCwd(message);
                    container.operations.send(container, MPGetCwdRes(id, this.system.vfs.path(process.task.pwd, process.task)))
                    break;
                }

                case MessageType.OPEN: {
                    let [id, path, mode] = MUOpen(message);
                    let cwd = process.task.pwd;
                    let entry = await this.system.vfs.lookup(path, process.task)!;
                    let file = await this.system.vfs.open(entry, mode);

                    let fd = process.task.files.fileDescriptors.push(file) - 1;
                    container.operations.send(container, MPOpenRes(id, fd))
                    break;
                }

                case MessageType.CREATE: {
                    let [id, path, mode] = MUCreate(message);
                    const task = process.task;
                    let file: IFile;

                    const nd = await this.system.vfs.namei.pathLookup(path, Lookup.PARENT, process.task);
                    file = await this.system.vfs.create(nd.path, nd.last, mode);

                    let fd = process.task.files.fileDescriptors.push(file) - 1;
                    container.operations.send(container, MPCreateRes(id, fd))

                    break;
                }


                case MessageType.CLOSE: {
                    let [id, fd] = MUClose(message);
                    if(!process.task.files.fileDescriptors){
                        throw new PError(Status.EBADFD);
                    }
                    process.task.files.fileDescriptors[fd] = null;
                    container.operations.send(container, MPCloseRes(id))
                    break;
                }

                case MessageType.BIND: {
                    let [id, name, old, flags] = MUBind(message);
                    let cwd = process.task.pwd;
                    const mountpoint = await this.system.vfs.lookup(old, process.task)!;
                    let dev: IChannel;

                    if (name[0] == "#"){
                        dev = await this.system.dev.getDevice(name.substring(1)).operations.attach!("", this.system)
                    }else{
                        const path = await this.system.vfs.lookup(name, process.task);
                        dev = path.entry;
                    }

                    await this.system.vfs.cmount(dev, mountpoint.entry, flags, mountpoint.mount, this.system.current.ns.mnt)
                    container.operations.send(container, MPBindRes(id))
                    break;
                }

                // case MessageType.MOUNT: {
                //     let mount = message as IProcMount;
                //     let cwd = process.task.pwd;
                //     const mountpoint = await this.system.vfs.lookup(mount.old, process.task)!;
                //     this.system.vfs.cmount()
                //     await this.system.vfs.mount(mount.device, mount.options, mountpoint.mount, mountpoint.entry, this.system.vfs.getFS(mount.fstype));
                //
                //     const res: IProcMountRes = {
                //         type: MessageType.MOUNT_RES,
                //         id: message.id,
                //     }
                //     container.operations.send(container, res)
                //     break;
                // }

                // case MessageType.UNMOUNT: {
                //     let unmount = message as IProcUnmount;
                //     let cwd = process.task.pwd;
                //     const mountpoint = this.system.vfs.lookup(unmount.path, process.task)!;
                //     await this.system.vfs.unmount(mountpoint.mount!, mountpoint.entry);
                //
                //     const res: IProcUnmountRes = {
                //         type: MessageType.UNMOUNT_RES,
                //         id: message.id,
                //     }
                //     container.operations.send(container, res)
                //     break;
                // }

                case MessageType.EXEC: {
                    let [id, path, argv] = MUExec(message);
                    let task = await this.createProcess(path, argv, process.task);
                    container.operations.send(container, MPExecRes(id, task.pid))
                    break;
                }

                // case MessageType.FORK: {
                //     let exec = message as IProcFork;
                //     let task = await this.createProcess(exec.path, exec.argv, process.task);
                //
                //     const res: IProcExecRes = {
                //         type: MessageType.EXEC_RES,
                //         id: message.id,
                //         pid: task.pid
                //     }
                //     container.operations.send(container, res)
                //     break;
                // }

                case MessageType.CHCWD: {
                    let [id, path] = MUChCwd(message);
                    let task = process.task;

                    const p = await this.system.vfs.lookup(path, process.task)!;
                    this.chcwd(task, p);
                    container.operations.send(container, MPChCwdRes(id))
                    break;
                }

                case MessageType.DIE: {
                    this.system.proc.killProcess(process);
                    break;
                }

                case MessageType.REMOVE: {
                    let [id, path] = MURemove(message);
                    let task = process.task;

                    let entry = await this.system.vfs.lookup(path, task)!;
                    if(entry.entry.operations.remove){
                        await entry.entry.operations.remove(entry.entry)
                    }else{
                        throw new PError(Status.EPERM);
                    }
                    container.operations.send(container, MPRemoveRes(id))
                    break;
                }

                case MessageType.PIPE: {
                    let [id] = MUPipe(message);
                    let task = process.task;

                    const dev = await this.system.dev.getDevice("|").operations.attach?.("", this.system)
                    const data = await this.system.vfs.lookup("/data", task, dev);
                    const data1 = await this.system.vfs.lookup("/data1", task, dev);
                    const file = await this.system.vfs.open(data, OpenMode.READ);
                    const file1 = await this.system.vfs.open(data1, OpenMode.WRITE);
                    const pipefd = [this.openFile(task, file), this.openFile(task, file1)]

                    container.operations.send(container, MPPipeRes(id, pipefd))
                    break;
                }
            }
        }catch (e) {
            if(e instanceof PError){
                let [_, id] = peak(message);
                container.operations.send(container, MPError(id, e.code));
            }
        }
    }

    public async loadDependency(dep: string, container:IContainer, task: IProtoTask) {
        let entry = await this.system.vfs.lookup(`/lib/${dep}.dyna`, task)!;
        let file = await this.system.vfs.open(entry, OpenMode.EXEC | OpenMode.READ);
        let content: string;
        if(file.channel.operations.read){
            content = this.system.decoder.decode(await file.channel.operations.read(file.channel, -1, 0));
        }else{
            throw new PError(Status.EINVAL);
        }

        if (!content.startsWith("dynalib:")) {
            throw new PError(Status.ENOEXEC);
        }
        let dynalibstruct: IDynaLib = JSON.parse(content.substring(8))
        for (let dep of dynalibstruct.dependencies) {
            await this.loadDependency(dep, container, task);
        }
        container.operations.send(container, MPDependency("", dep, dynalibstruct.code));

    }

    public chroot(task: IProtoTask, path: IPath){
        task.root = {
         entry: path.entry,
         mount: path.mount
        }
    }

    public chcwd(task: IProtoTask, path: IPath){
        task.pwd = {
            entry: path.entry,
            mount: path.mount
        }
    }

    private openFile(task: ITask, file: IFile, pos?: FileDescriptor): FileDescriptor {
        if (pos){
            task.files.fileDescriptors[pos] = file;
            return pos;
        }

        for(let i=0; i < task.files.fileDescriptors.length ; i++){
            if (!task.files.fileDescriptors[i]){
                task.files.fileDescriptors[i] = file;
                return i;
            }
        }
        return task.files.fileDescriptors.push(file) - 1;
    }

    private closeFile(task: ITask, fd: FileDescriptor){
        if (task.files.fileDescriptors[fd]){
            this.system.vfs.close(task.files.fileDescriptors[fd]!);
            task.files.fileDescriptors[fd] = null;
        }

        throw new PError(Status.EBADFD);
    }


    async createProcess(path: string, argv: string[], parent: IProtoTask): Promise<ITask> {
        let entry = await this.system.vfs.lookup(path, parent)!;
        let file = await this.system.vfs.open(entry, OpenMode.EXEC | OpenMode.READ);
        let content: string;
        if(file.channel.operations.read){
            content = this.system.decoder.decode(await file.channel.operations.read!(file.channel, -1, 0));
        }else{
            throw new PError(Status.EINVAL);
        }

        if (!content.startsWith("PEXF:")) {
            throw new PError(Status.ENOEXEC);
        }
        let pexfstruct: IPEXF = JSON.parse(content.substring(5));

        let lorch = this.system.orchestrators.getOrchestrator("lorch")!;
        let container = await lorch.getcontainer();

        for (let dep of pexfstruct.dependencies) {
            await this.loadDependency(dep, container, parent)
        }
        let pid = this.genID();

        let waits: ((value: (string | PromiseLike<string>)) => void)[] = [];
        const task: ITask = {
            status: ITaskStatus.RUNNGING,
            operations: this.taskOperations,
            sys: true,
            pid: pid,
            ns: parent.ns,
            uid: parent.uid ? parent.uid : 1,
            gid: parent.gid ? parent.gid : 1,
            waits: waits,

            root: parent.root,
            pwd: parent.pwd,
            files: {fileDescriptors: []},
            parent: parent.pid ? parent.pid : undefined,
        };

        try{
            let stdinp = await this.system.vfs.lookup("/dev/scancode", parent)!;
            let stdin = await this.system.vfs.open(stdinp, OpenMode.READ);
            this.openFile(task, stdin, 0);
        }catch (e) {}

        try{
            let stdoutp = await this.system.vfs.lookup("/dev/cons", parent)!;
            let stdout = await this.system.vfs.open(stdoutp, OpenMode.WRITE);
            this.openFile(task, stdout, 1);
        }catch (e) {}

        try{
            let stderrp = await this.system.vfs.lookup("/dev/cons", parent)!;
            let stderr = await this.system.vfs.open(stderrp, OpenMode.WRITE);
            this.openFile(task, stderr, 2);
        }catch (e) {}

        container.operations.run(container, {
            code: pexfstruct.code,
            argv: [path].concat(argv),
            listener: this.handleProcess.bind(this)
        });

        const process: IProcess = {
            container,
            task,
        }
        console.log(path, container.id);
        this.pool.set(task.pid, process)
        this.containers.set(container.id, process);
        return task;
    }

    killProcess(process: IProcess) {
        process.container.operations.kill(process.container);
        for (let release of process.task.waits) {
            release("CLOSE!");
        }
        this.pool.delete(process.task.pid);
        this.containers.delete(process.task.pid);
    }

    wait(pid: pid): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.pool.get(pid)!.task.waits.push(resolve);
        })
    }
}

