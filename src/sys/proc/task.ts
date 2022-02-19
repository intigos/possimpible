import {IChannel} from "../vfs/channel";
import {INSProxy} from "../ns/ns";
import {IPath} from "../vfs/path";
import {pid} from "./pid";

export enum ITaskStatus {
    PENDING,
    RUNNING,
    STOP
}

export interface IFile {
    position: number;
    channel: IChannel;
    path: IPath;
}

function mkfile(c: IPath): IFile {
    return {position: 0, channel: c.channel, path: c};
}

export interface ITaskFiles {
    fileDescriptors: (IFile|null)[]
}

export interface IProtoTask {
    pid: number,
    uid: string,
    gid: string,
    ns: INSProxy;
    root: IPath;
    pwd: IPath;
    env: Enviroment,
    files: ITaskFiles,
    user: string;
}

export type Enviroment = Map<string,string>;

export class Task implements IProtoTask {
    status = ITaskStatus.RUNNING
    pid: number;
    uid: string;
    gid: string;
    sys: any;
    ns: INSProxy;
    pwd: IPath;
    root: IPath;
    waits: ((value: (void | PromiseLike<void>)) => void)[];
    path: IPath;
    argv: string[];
    files: ITaskFiles;
    parent?: pid;
    cpu: IFile;
    handler: (arr: Uint8Array, task: Task) => void;
    env: Enviroment;
    user: string;
    startTime: number;

     constructor(path: IPath, argv: string[], uid: string, gid: string, pwd: IPath,
                 root: IPath, ns: INSProxy, parentPid: number, cpu: IFile, files: ITaskFiles,
                 env: Enviroment, user:string,  handler: (arr: Uint8Array, task: Task) => void) {
        this.sys = true;
        this.pid = 0;
        ns.pid.attach(this);
        this.ns = ns;
        this.uid = uid;
        this.gid = gid;
        this.waits = [];
        this.path = path;
        this.argv = argv;
        this.startTime = new Date().getTime() / 1000;
        this.root = root;
        this.pwd = pwd;
        this.files = files;
        this.parent = parentPid;
        this.cpu = cpu;
        this.env = env;
        this.handler = handler;
        this.user = user;
        this.env.set("PID", "" + this.pid);
        this.env.set("USER", user);
        console.log("PID: " + this.pid, path.channel.name, this.argv)
    }

    async send(array: Uint8Array){
        await this.cpu.channel.operations.write!(this.cpu.channel, array, 0);
    }

    async run() {
         const id = this.cpu.channel.name;
         while (this.status == ITaskStatus.RUNNING &&
             id == this.cpu.channel.name) {
            const message = await this.cpu.channel.operations.read!(this.cpu.channel, -1, 0);
            this.handler(message, this);
         }
    }

    async switchCPU(cpu: IFile) {
        await this.cpu.channel.operations.remove?.(this.cpu.channel);
        this.cpu = cpu;
    }

    public chroot(path: IPath){
        this.root = {
            channel: path.channel,
            mount: path.mount
        }
    }

    public chcwd(path: IPath){
        this.pwd = {
            channel: path.channel,
            mount: path.mount
        }
    }

    async kill() {
        await this.cpu.channel.operations.remove?.(this.cpu.channel);
        this.status = ITaskStatus.STOP
        this.ns.pid.dettach(this);
        for (const wait of this.waits) {
            wait()
        }
    }
}
