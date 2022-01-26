import {v4 as UUID} from 'uuid';
import {
    FileDescriptor,
    IDependency,
    IProcBind,
    IProcBindRes,
    IProcChCwd,
    IProcChCwdRes,
    IProcClose, IProcCreate, IProcCreateRes,
    IProcError,
    IProcExec,
    IProcExecRes,
    IProcGetCwdRes,
    IProcMessage,
    IProcOpen,
    IProcOpenRes,
    IProcPipe, IProcPipeRes,
    IProcRead,
    IProcReadRes, IProcRemove,
    IProcRemoveRes,
    IProcWrite,
    MessageType
} from "../../shared/proc";
import {IContainer} from "./orchestrator";
import {IDynaLib, IPEXF} from "../../shared/pexf";
// import {IProcFSEntry, procCreate, procMkdir, procRemove} from "../fs/procfs/module";
import {IPath} from "../vfs/path";
import {System} from "../system";
import {IChannel} from "../vfs/channel";
import {INSProxy} from "../ns/ns";
import {Lookup} from "../vfs/namei";
import {OpenMode, PError, Status, Type} from "../../public/api";

type pid = number;

interface ITaskOperations {
    getParent: (task: ITask) => ITask|null
}

enum ITaskStatus {
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

    async handleProcess(message: IProcMessage, container: IContainer) {
        const process = this.containers.get(container.id)!;
        this.system.current = process.task;
        try{
            switch (message.type) {
                case MessageType.WRITE: {
                    let write = message as IProcWrite;
                    const file = process.task.files.fileDescriptors[write.fd];
                    if (file) {
                        const channel = file.channel;
                        if (channel.operations.write) {
                            await channel.operations.write(channel, write.buf, file.position);
                        } else {
                            throw new PError(Status.EPERM);
                        }
                    } else {
                        throw new PError(Status.EBADFD);
                    }
                    break;
                }
                case MessageType.READ: {
                    let read = message as IProcRead;
                    const file = process.task.files.fileDescriptors[read.fd];
                    if (file) {
                        let buf;
                        const channel = file.channel;
                        if(channel.operations.read){
                            buf = await channel.operations.read(channel, read.count, file.position);
                        }else{
                            throw new PError(Status.EINVAL);
                        }

                        const res: IProcReadRes = {
                            type: MessageType.READ_RES,
                            id: message.id,
                            buf
                        }
                        container.operations.send(container, res)
                    } else {
                        throw new PError(Status.EBADFD);
                    }
                    break;
                }
                case MessageType.GETCWD: {
                    const res: IProcGetCwdRes = {
                        type: MessageType.GETCWD_RES,
                        id: message.id,
                        cwd: this.system.vfs.path(process.task.pwd, process.task)
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.OPEN: {
                    let open = message as IProcOpen;
                    let cwd = process.task.pwd;
                    let entry = await this.system.vfs.lookup(open.path, process.task)!;
                    let file = await this.system.vfs.open(entry, 0);

                    let fd = process.task.files.fileDescriptors.push(file) - 1;
                    const res: IProcOpenRes = {
                        type: MessageType.OPEN_RES,
                        id: message.id,
                        fd
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.CREATE: {
                    let create = message as IProcCreate;
                    const task = process.task;
                    let file: IFile;

                    const nd = await this.system.vfs.namei.pathLookup(create.path, Lookup.PARENT, process.task);
                    file = await this.system.vfs.create(nd.path, nd.last, create.mode);

                    let fd = process.task.files.fileDescriptors.push(file) - 1;
                    const res: IProcCreateRes = {
                        type: MessageType.CREATE_RES,
                        id: message.id,
                        fd
                    }
                    container.operations.send(container, res)

                    break;
                }


                case MessageType.CLOSE: {
                    let close = message as IProcClose;
                    if(!process.task.files.fileDescriptors){
                        throw new PError(Status.EBADFD);
                    }
                    process.task.files.fileDescriptors[close.fd] = null;
                    break;
                }

                case MessageType.BIND: {
                    let mount = message as IProcBind;
                    let cwd = process.task.pwd;
                    const mountpoint = await this.system.vfs.lookup(mount.old, process.task)!;
                    let dev: IChannel;

                    if (mount.name[0] == "#"){
                        dev = await this.system.dev.getDevice(mount.name.substring(1)).operations.attach!("", this.system)
                    }else{
                        const path = await this.system.vfs.lookup(mount.name, process.task);
                        dev = path.entry;
                    }

                    await this.system.vfs.cmount(dev, mountpoint.entry, mount.flags, mountpoint.mount, this.system.current.ns.mnt)

                    const res: IProcBindRes = {
                        type: MessageType.BIND_RES,
                        id: message.id,
                    }
                    container.operations.send(container, res)
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
                    let exec = message as IProcExec;
                    let task = await this.createProcess(exec.path, exec.argv, process.task);

                    const res: IProcExecRes = {
                        type: MessageType.EXEC_RES,
                        id: message.id,
                        pid: task.pid
                    }
                    container.operations.send(container, res)
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
                    let chcwd = message as IProcChCwd;
                    let task = process.task;

                    const path = await this.system.vfs.lookup(chcwd.path, process.task)!;
                    this.chcwd(task, path);
                    const res: IProcChCwdRes = {
                        type: MessageType.CHCWD_RES,
                        id: message.id
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.DIE: {
                    this.system.proc.killProcess(process);
                    break;
                }

                case MessageType.REMOVE: {
                    let remove = message as IProcRemove;
                    let task = process.task;

                    let entry = await this.system.vfs.lookup(remove.path, task)!;
                    if(entry.entry.operations.remove){
                        await entry.entry.operations.remove(entry.entry)
                    }else{
                        throw new PError(Status.EPERM);
                    }

                    const res: IProcRemoveRes = {
                        type: MessageType.REMOVE_RES,
                        id: message.id
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.PIPE: {
                    let pipe = message as IProcPipe;
                    let task = process.task;

                    const dev = await this.system.dev.getDevice("|").operations.attach?.("", this.system)
                    const data = await this.system.vfs.lookup("/data", task, dev);
                    const data1 = await this.system.vfs.lookup("/data1", task, dev);
                    const file = await this.system.vfs.open(data, OpenMode.READ);
                    const file1 = await this.system.vfs.open(data1, OpenMode.WRITE);
                    const pipefd = [this.openFile(task, file), this.openFile(task, file1)]


                    const res: IProcPipeRes = {
                        type: MessageType.PIPE_RES,
                        id: message.id,
                        fds: pipefd
                    }
                    container.operations.send(container, res)
                    break;
                }
            }
        }catch (e) {
            if(e instanceof PError){
                const error: IProcError = {
                    type: MessageType.ERROR,
                    id: message.id,
                    code: e.code,
                }
                container.operations.send(container, error);
            }
        }
    }

    private async fetchDepCode(dep: string, task: IProtoTask): Promise<IDependency[]> {
        let entry = await this.system.vfs.lookup(`/lib/${dep}.dyna`, task)!;
        let file = await this.system.vfs.open(entry, OpenMode.EXEC | OpenMode.READ);
        let content;
        if(file.channel.operations.read){
            content = await file.channel.operations.read(file.channel, -1, 0);
        }else{
            throw new PError(Status.EINVAL);
        }

        let result: IDependency[] = [];
        if (!content.startsWith("dynalib:")) {
            // TODO
            console.log("Wrong format")
        }
        let dynalibstruct: IDynaLib = JSON.parse(content.substring(8))
        for (let dep of dynalibstruct.dependencies) {
            result = result.concat(await this.fetchDepCode(dep, task))
        }
        result.push({
            name: dep,
            code: dynalibstruct.code
        });
        return result;
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
        let content;
        if(file.channel.operations.read){
            content = await file.channel.operations.read!(file.channel, -1, 0);
        }else{
            throw new PError(Status.EINVAL);
        }

        if (!content.startsWith("PEXF:")) {
            throw new PError(Status.ENOEXEC);
        }
        let pexfstruct: IPEXF = JSON.parse(content.substring(5));
        let dyna: IDependency[] = []
        for (let dep of pexfstruct.dependencies) {
            dyna = dyna.concat(await this.fetchDepCode(dep, parent))
        }
        let pid = this.genID();
        let lorch = this.system.orchestrators.getOrchestrator("lorch")!;
        let container = await lorch.getcontainer();
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
            dyna,
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

