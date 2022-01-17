import {Kernel} from "../kernel";
import {v4 as UUID} from 'uuid';
import {
    IDependency,
    IProcChCwd,
    IProcChCwdRes,
    IProcClose,
    IProcError,
    IProcExec,
    IProcExecRes,
    IProcGetCwdRes,
    IProcGetDEnts,
    IProcGetDEntsRes,
    IProcMessage,
    IProcMkdir,
    IProcMkdirRes,
    IProcMount,
    IProcMountRes,
    IProcOpen,
    IProcOpenRes,
    IProcRead,
    IProcReadRes,
    IProcRmdir,
    IProcUnmount,
    IProcUnmountRes,
    IProcWrite,
    MessageType
} from "../../shared/proc";
import {IContainer} from "./orchestrator";
import {IFile, IPath} from "../fs/vfs";
import {IDynaLib, IPEXF} from "../../shared/pexf";
import {IProcFSEntry, procCreate, procMkdir, procRemove} from "../fs/procfs/module";
import {PError, Status} from "../../public/status";

type pid = number;

interface ITaskOperations {
    getParent: (task: ITask) => NullableOr<ITask>
}

enum ITaskStatus {
    PENDING,
    RUNNGING,
    STOP
}

export interface ITaskFiles {
    fileDescriptors: (IFile | null)[]
}

export interface ITaskProcRefs {
    dir: IProcFSEntry;
    fd: IProcFSEntry;
    fds: IProcFSEntry[];
    argv: IProcFSEntry;
    orch: IProcFSEntry;
    run: IProcFSEntry;
}

export interface IProtoTask{
    pid?: number,
    uid?: number,
    gid?: number,
    root: IPath;
    pwd: IPath;
}

export interface ITask extends IProtoTask{
    status: ITaskStatus,
    pid: number,
    uid: number,
    gid: number,
    sys: any,
    proc: ITaskProcRefs,
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

export class ProcessManagement {
    private lastId = 0;
    public pool: Map<pid, IProcess> = new Map<pid, IProcess>();
    public containers: Map<UUID, IProcess> = new Map<UUID, IProcess>();
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    taskOperations: ITaskOperations = {
        getParent: this.getParent
    }

    private genID(): number {
        this.lastId++;
        return this.lastId;
    }

    getParent(task: ITask): NullableOr<ITask> {
        if (task.parent) {
            let c = this.pool.get(task.parent);
            if (c) {
                return c.task;
            }
        }
    }

    async handleProcess(message: IProcMessage, container: IContainer) {
        const process = this.containers.get(container.id)!;
        this.kernel.current = process.task;
        try{
            switch (message.type) {
                case MessageType.WRITE: {
                    let write = message as IProcWrite;
                    const file = process.task.files.fileDescriptors[write.fd];
                    if (file) {
                        if (file.operations.write) {
                            file.operations.write(file, write.buf);
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
                        if(file.operations.read){
                            buf = await file.operations.read(file, read.count);
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
                        cwd: this.kernel.vfs.path(process.task.pwd, process.task)
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.OPEN: {
                    let open = message as IProcOpen;
                    let cwd = process.task.pwd;
                    let entry = this.kernel.vfs.lookup(open.path, process.task)!;
                    let file = await this.kernel.vfs.open(entry);

                    let fd = process.task.files.fileDescriptors.push(file) - 1;
                    const res: IProcOpenRes = {
                        type: MessageType.OPEN_RES,
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


                case MessageType.GETDENTS: {
                    let getdents = message as IProcGetDEnts;
                    const file = process.task.files.fileDescriptors[getdents.fd];

                    if (file) {
                        if(file.operations.iterate){
                            const res: IProcGetDEntsRes = {
                                type: MessageType.GETDENTS_RES,
                                id: message.id,
                                dirents: await file.operations.iterate(file)
                            }
                            container.operations.send(container, res)
                        }
                        throw new PError(Status.ENOTDIR);
                    } else {
                        throw new PError(Status.EBADFD);
                    }

                    break;
                }

                case MessageType.MOUNT: {
                    let mount = message as IProcMount;
                    let cwd = process.task.pwd;
                    const mountpoint = this.kernel.vfs.lookup(mount.mountpoint, process.task)!;
                    await this.kernel.vfs.mount(mount.device, mount.options, mountpoint.mount, mountpoint.entry, this.kernel.vfs.getFS(mount.fstype));

                    const res: IProcMountRes = {
                        type: MessageType.MOUNT_RES,
                        id: message.id,
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.UNMOUNT: {
                    let unmount = message as IProcUnmount;
                    let cwd = process.task.pwd;
                    const mountpoint = this.kernel.vfs.lookup(unmount.path, process.task)!;
                    await this.kernel.vfs.unmount(mountpoint.mount!, mountpoint.entry);

                    const res: IProcUnmountRes = {
                        type: MessageType.UNMOUNT_RES,
                        id: message.id,
                    }
                    container.operations.send(container, res)
                    break;
                }

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

                case MessageType.CHCWD: {
                    let chcwd = message as IProcChCwd;
                    let task = process.task;

                    const path = this.kernel.vfs.lookup(chcwd.path, process.task)!;
                    this.chcwd(task, path);
                    const res: IProcChCwdRes = {
                        type: MessageType.CHCWD_RES,
                        id: message.id
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.DIE: {
                    this.kernel.processes.killProcess(process);
                    break;
                }

                case MessageType.MKDIR: {
                    let mkdir = message as IProcMkdir;
                    let task = process.task;

                    this.kernel.vfs.mkdir(mkdir.path, task)

                    const res: IProcMkdirRes = {
                        type: MessageType.MKDIR_RES,
                        id: message.id
                    }
                    container.operations.send(container, res)
                    break;
                }

                case MessageType.RMDIR: {
                    let rmdir = message as IProcRmdir;
                    let task = process.task;

                    this.kernel.vfs.rmdir(rmdir.path, task)

                    const res: IProcMkdirRes = {
                        type: MessageType.MKDIR_RES,
                        id: message.id
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
        let entry = this.kernel.vfs.lookup(`/lib/${dep}.dyna`, task)!;
        let file = await this.kernel.vfs.open(entry);
        let content = "";
        if(file.operations.read){
            content = await file.operations.read(file, -1);
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

    private openFile(task: ITask, pos: number, file: IFile) {
        task.files.fileDescriptors[pos] = file;
        task.proc.fds[pos] = procCreate("" + pos, task.proc.fd, {
            write: async (f, buf) => {
                if (file.operations.write) {
                    await file.operations.write(file, buf);
                }
            },
            read: (f, count) => file.operations.read!(file, count)
        })
    }


    async createProcess(path: string, argv: string[], parent: IProtoTask): Promise<ITask> {
        let entry = this.kernel.vfs.lookup(path, parent)!;
        let file = await this.kernel.vfs.open(entry);
        let content;
        if(file.operations.read){
            content = await file.operations.read!(file, -1);
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
        const p = procMkdir("" + pid, null);
        let lorch = this.kernel.orchestrators.getOrchestrator("lorch")!;
        let container = await lorch.getcontainer();
        let waits: ((value: (string | PromiseLike<string>)) => void)[] = [];
        const task: ITask = {
            status: ITaskStatus.RUNNGING,
            operations: this.taskOperations,
            sys: true,
            pid: pid,
            uid: parent.uid ? parent.uid : 1,
            gid: parent.gid ? parent.gid : 1,
            waits: waits,
            proc: {
                dir: p,
                fd: procMkdir("fd", p),
                fds: [],
                argv: procCreate("argv", p, {
                    write: file1 => {
                    },
                    read: (file1, count) => new Promise<string>(resolve => {
                        resolve([path].concat(argv).reduce((x, y) => x + " " + y) + "\n")
                    })
                }),
                orch: procCreate("orch", p, {
                    write: file1 => {
                    },
                    read: (file1, count) => new Promise<string>(resolve => {
                        resolve("lorch:" + container.id + "\n");
                    })
                }),
                run: procCreate("run", p, {
                    write: file1 => {
                    },
                    read: (file1, count) => new Promise<string>((resolve, reject) => {
                        waits.push(resolve);
                    })
                })
            },
            root: parent.root,
            pwd: parent.pwd,
            files: {fileDescriptors: []},
            parent: parent.pid ? parent.pid : undefined,
        };

        let stdinp = this.kernel.vfs.lookup("/dev/tty0", parent)!;
        let stdin = await this.kernel.vfs.open(stdinp);
        this.openFile(task, 0, stdin);
        this.openFile(task, 1, stdin);
        this.openFile(task, 2, stdin);
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
        procRemove(process.task.proc.orch);
        procRemove(process.task.proc.argv);
        procRemove(process.task.proc.argv);
        for (let i of process.task.proc.fds) {
            if (i) {
                procRemove(i);
            }
        }
        procRemove(process.task.proc.fd);
        procRemove(process.task.proc.dir);
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

