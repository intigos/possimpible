import {Kernel} from "../kernel";
import {v4 as UUID} from 'uuid';
import {IProcMessage, IProcWrite, MessageType} from "../../shared/proc";
import {IContainer} from "./orchestrator";
import {IFile, IPath} from "../fs/vfs";
import {IVFSMount} from "../fs/mount";
import {IDEntry} from "../fs/dcache";

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

    handleProcess(message: IProcMessage, container: IContainer){
        const process = this.containers.get(container.id)!;
        switch(message.type){
            case MessageType.WRITE:
                const write = message as IProcWrite;
                const file = process.task.files.fileDescriptors[write.fd];
                file.operations.write(file, write.buf);
        }


        console.log(message);
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

        let stdoutp = this.kernel.vfs.lookup(root.entry, root.mount, "/dev/console")!;
        let stdout = this.kernel.vfs.open(stdoutp);

        task.files.fileDescriptors[1] = stdout;

        const process: IProcess = {
            container,
            task,
        }

        this.pool.set(task.pid, process)
        this.containers.set(container.id, process);

        container.operations.run(container, content, this.handleProcess.bind(this));

        return task;
    }

    async createProcess(path: string, parent: ITask): Promise<ITask> {
        let entry = this.kernel.vfs.lookup(parent.pwd.entry!, parent.pwd.mount!, path)!;
        let file = this.kernel.vfs.open(entry);
        let content = file.operations.read(file, -1);

        let lorch = this.kernel.orchestrators.getOrchestrator("lorch")!;
        let container = await lorch.getcontainer();
        container.operations.run(container, content, this.handleProcess.bind(this));

        const task: ITask = {
            status: ITaskStatus.RUNNGING,
            operations: this.taskOperations,
            sys: true,
            pid: this.genID(),
            pwd: parent.pwd,
            files: {fileDescriptors:[]},
            parent: parent ? parent.pid : undefined,
        };
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

