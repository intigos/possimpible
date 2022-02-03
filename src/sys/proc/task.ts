import {IChannel} from "../vfs/channel";
import {INSProxy} from "../ns/ns";
import {IPath} from "../vfs/path";
import {pid} from "./pid";
import {ForkMode, ForkMode2} from "../../public/api";
import {debug, peak} from "../../shared/proc";

export enum ITaskStatus {
    PENDING,
    RUNNGING,
    STOP
}

export interface IFile {
    position: number;
    channel: IChannel;
}

function mkfile(c: IChannel): IFile {
    return {position: 0, channel: c};
}

export interface ITaskFiles {
    fileDescriptors: (IFile|null)[]
}

export interface IProtoTask {
    pid: number,
    uid?: number,
    gid?: number,
    ns: INSProxy;
    root: IPath;
    pwd: IPath;
    env: Enviroment,
    files: ITaskFiles,
}

export type Enviroment = Map<string,string>;

export class Task implements IProtoTask {
    status = ITaskStatus.RUNNGING
    pid: number;
    uid: number;
    gid: number;
    sys: any;
    ns: INSProxy;
    pwd: IPath;
    root: IPath;
    waits: ((value: (string | PromiseLike<string>)) => void)[];
    path: IPath;
    argv: string[];
    files: ITaskFiles;
    parent?: pid;
    cpu: IChannel;
    handler: (arr: Uint8Array, task: Task) => void;
    env: Enviroment;

     constructor(path: IPath, argv: string[], uid: number, gid: number, pwd: IPath,
                 root: IPath, ns: INSProxy, parentPid: number, cpu: IChannel, files: ITaskFiles,
                 env: Enviroment, handler: (arr: Uint8Array, task: Task) => void) {
        this.sys = true;
        this.pid = 0;
        ns.pid.attach(this);
        this.ns = ns;
        this.uid = uid;
        this.gid = gid;
        this.waits = [];
        this.path = path;
        this.argv = argv;
        this.root = root;
        this.pwd = pwd;
        this.files = {fileDescriptors: []};
        this.parent = parentPid;
        this.cpu = cpu;
        this.env = env;
        this.handler = handler;
    }

    async send(array: Uint8Array){
        await this.cpu.operations.write!(this.cpu, array, 0);
    }

    async run() {
         const id = this.cpu.name;
         while (this.status == ITaskStatus.RUNNGING &&
             id == this.cpu.name) {
            const message = await this.cpu.operations.read!(this.cpu, -1, 0);
            this.handler(message, this);
         }
    }

    async switchCPU(cpu: IChannel) {
        await this.cpu.operations.remove?.(this.cpu);
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
        await this.cpu.operations.remove?.(this.cpu);
        this.status = ITaskStatus.STOP
        this.ns.pid.dettach(this);
    }
}
