import {Kernel} from "../kernel";
import {v4 as UUID} from 'uuid';
import {
    IProcExec, IProcExecRes,
    IProcGetCwdRes,
    IProcGetDEnts,
    IProcGetDEntsRes,
    IProcMessage,
    IProcOpen,
    IProcOpenRes,
    IProcRead,
    IProcReadRes,
    IProcWrite,
    MessageType
} from "../../shared/proc";
import {IContainer} from "./orchestrator";
import {IFile, IPath} from "../fs/vfs";

type pid = number;

interface ITaskOperations {
    getParent: (task: ITask) => NullableOr<ITask>
}

enum ITaskStatus{
    PENDING,
    RUNNGING,
    STOP
}

export interface ITaskFiles{
    fileDescriptors: IFile[]
}

export interface ITask{
    status: ITaskStatus,
    pid: number,
    sys: any,
    pwd: IPath;
    files: ITaskFiles
    parent?: pid
    operations: ITaskOperations
}



export interface IProcess{
    container: IContainer,

    task: ITask
}

export class ProcessManagement{
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

    private genID(): number{
        this.lastId++;
        return this.lastId;
    }

    getParent(task: ITask) : NullableOr<ITask>{
        if (task.parent){
            let c = this.pool.get(task.parent);
            if(c){
                return c.task;
            }
        }
    }

    async handleProcess(message: IProcMessage, container: IContainer) {
        const process = this.containers.get(container.id)!;
        switch (message.type) {
            case MessageType.WRITE: {
                let write = message as IProcWrite;
                const file = process.task.files.fileDescriptors[write.fd];
                file.operations.write(file, write.buf);
                break;
            }
            case MessageType.READ: {
                let read = message as IProcRead;
                const file = process.task.files.fileDescriptors[read.fd];
                let buf = await file.operations.read(file, read.count);
                const res: IProcReadRes = {
                    type: MessageType.READ_RES,
                    id: message.id,
                    buf
                }
                container.operations.send(container, res)
                break;
            }
            case MessageType.GETCWD: {
                const res: IProcGetCwdRes = {
                    type: MessageType.GETCWD_RES,
                    id: message.id,
                    cwd: this.kernel.vfs.dcache.path(process.task.pwd)
                }
                container.operations.send(container, res)
                break;
            }
            case MessageType.OPEN: {
                let open = message as IProcOpen;
                let cwd = process.task.pwd;
                let entry = this.kernel.vfs.lookup(cwd.entry, cwd.mount, open.path)!;
                let file = this.kernel.vfs.open(entry);

                let fd = process.task.files.fileDescriptors.push(file) - 1;
                const res: IProcOpenRes = {
                    type: MessageType.OPEN_RES,
                    id: message.id,
                    fd
                }
                container.operations.send(container, res)
                break;
            }
            case MessageType.GETDENTS: {
                let getdents = message as IProcGetDEnts;
                const file = process.task.files.fileDescriptors[getdents.fd];

                const res: IProcGetDEntsRes = {
                    type: MessageType.GETDENTS_RES,
                    id: message.id,
                    dirents: await file.operations.iterate(file)
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
        }
    }

    async createInitProcess(path: string, root: IPath){
        let entry = this.kernel.vfs.lookup(root.entry, root.mount, path)!;
        let file = this.kernel.vfs.open(entry);
        let content = await file.operations.read(file, -1);

        let lorch = this.kernel.orchestrators.getOrchestrator("lorch")!;
        let container = await lorch.getcontainer();

        const task: ITask = {
            status: ITaskStatus.RUNNGING,
            operations: this.taskOperations,
            sys: true,
            pid: this.genID(),
            files: {
                fileDescriptors: []
            },
            pwd: root,
            parent: undefined,
        };

        let stdinp = this.kernel.vfs.lookup(root.entry, root.mount, "/dev/console")!;
        let stdin = this.kernel.vfs.open(stdinp);
        task.files.fileDescriptors[0] = stdin;

        let stdoutp = this.kernel.vfs.lookup(root.entry, root.mount, "/dev/console")!;
        let stdout = this.kernel.vfs.open(stdoutp);
        task.files.fileDescriptors[1] = stdout;

        const process: IProcess = {
            container,
            task,
        }

        this.pool.set(task.pid, process)
        this.containers.set(container.id, process);

        container.operations.run(container, [path].concat([]), content, this.handleProcess.bind(this));

        return task;
    }

    async createProcess(path: string, argv:string[], parent: ITask): Promise<ITask> {
        let entry = this.kernel.vfs.lookup(parent.pwd.entry!, parent.pwd.mount!, path)!;
        let file = this.kernel.vfs.open(entry);
        let content = await file.operations.read(file, -1);

        let lorch = this.kernel.orchestrators.getOrchestrator("lorch")!;
        let container = await lorch.getcontainer();
        container.operations.run(container, [path].concat(argv), content, this.handleProcess.bind(this));

        const task: ITask = {
            status: ITaskStatus.RUNNGING,
            operations: this.taskOperations,
            sys: true,
            pid: this.genID(),
            pwd: parent.pwd,
            files: {fileDescriptors:[]},
            parent: parent ? parent.pid : undefined,
        };

        let stdinp = this.kernel.vfs.lookup(parent.pwd.entry, parent.pwd.mount, "/dev/console")!;
        let stdin = this.kernel.vfs.open(stdinp);
        task.files.fileDescriptors[0] = stdin;

        let stdoutp = this.kernel.vfs.lookup(parent.pwd.entry, parent.pwd.mount, "/dev/console")!;
        let stdout = this.kernel.vfs.open(stdoutp);
        task.files.fileDescriptors[1] = stdout;

        const process: IProcess = {
            container,
            task,
        }
        this.pool.set(task.pid, process)
        this.containers.set(container.id, process);
        return task;
    }

    wait(pid: pid) : Promise<any> {
        return new Promise(resolve => {

        });
    }
}

