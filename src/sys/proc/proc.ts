import {IDynaLib, IPEXF} from "../../shared/pexf";
// import {IProcFSEntry, procCreate, procMkdir, procRemove} from "../fs/procfs/module";
import {System} from "../system";
import {IChannel} from "../vfs/channel";
import {Lookup} from "../vfs/namei";
import {ForkMode2, OpenMode, PError, Status, Type} from "../../public/api";
import {
    FileDescriptor,
    MessageType,
    MPBindRes,
    MPChCwdRes,
    MPCloseRes,
    MPCreateRes,
    MPDependency,
    MPForkRes,
    MPGetCwdRes,
    MPMountRes,
    MPOpenRes,
    MPPipeRes,
    MPReadRes,
    MPRemoveRes,
    MPSignal,
    MPStart, MPStat, MPStatRes,
    MPWriteRes,
    MUBind,
    MUChCwd,
    MUClose,
    MUCreate,
    MUExec,
    MUFork,
    MUGetCwd,
    MUMount,
    MUOpen,
    MUPipe,
    MURead,
    MURemove, MUStat,
    MUWrite,
    peak,
    Signal
} from "../../shared/proc";
import {pid, PidManager} from "./pid";
import {IFile, IProtoTask, Task} from "./task";
import {packA, packStat} from "../../shared/struct";
import {LinkerManager} from "./linker";


export class ProcessManager {
    private system: System;
    public pids: PidManager;
    private linker: LinkerManager;

    constructor(kernel: System) {
        this.system = kernel;
        this.pids = new PidManager(this.system);
        this.linker = new LinkerManager(this.system);
    }

    async handleProcess(message: Uint8Array, task: Task) {
        this.system.current = task;
        const [type, id] = peak(message);
        try{
            switch (type) {
                case MessageType.WRITE: {
                    let [id, fd, buf] = MUWrite(message);
                    const file = task.files.fileDescriptors[fd];
                    if (file) {
                        const channel = file.channel;
                        if (channel.operations.write) {
                            await channel.operations.write(channel, buf, file.position);
                            await task.send(MPWriteRes(id, 0))
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
                    const file = task.files.fileDescriptors[fd];
                    if (file) {
                        if(file.channel.type == Type.DIR){
                            const stats = await this.system.vfs.dirread(file.channel, task);
                            await task.send(MPReadRes(id, packA(stats, packStat)))
                        }else{
                            let buf;
                            const channel = file.channel;
                            if(channel.operations.read){
                                buf = await channel.operations.read(channel, count, file.position);
                            }else{
                                throw new PError(Status.EINVAL);
                            }
                            await task.send(MPReadRes(id, buf))
                        }
                    } else {
                        throw new PError(Status.EBADFD);
                    }
                    break;
                }

                case MessageType.STAT: {
                    let [id, fd] = MUStat(message);
                    const file = task.files.fileDescriptors[fd];
                    if(file){
                        if(file.channel.operations.getstat){
                            const stat = await file.channel.operations.getstat(file.channel);
                            await task.send(MPStatRes(id, stat));
                        }else throw new PError(Status.EPERM);
                    }else throw new PError(Status.EBADFD);
                    break;
                }

                case MessageType.GETCWD: {
                    let [id] = MUGetCwd(message);
                    await task.send(MPGetCwdRes(id, this.system.vfs.path(task.pwd, task)))
                    break;
                }

                case MessageType.OPEN: {
                    let [id, path, mode] = MUOpen(message);
                    let cwd = task.pwd;
                    let entry = await this.system.vfs.lookup(path, task)!;
                    let file = await this.system.vfs.open(entry, mode);

                    let fd = task.files.fileDescriptors.push(file) - 1;
                    await task.send(MPOpenRes(id, fd))
                    break;
                }

                case MessageType.CREATE: {
                    let [id, path, mode] = MUCreate(message);
                    let file: IFile;

                    const nd = await this.system.vfs.namei.pathLookup(path, Lookup.PARENT, task);
                    file = await this.system.vfs.create(nd.path, nd.last, mode);

                    let fd = task.files.fileDescriptors.push(file) - 1;
                    await task.send(MPCreateRes(id, fd))
                    break;
                }


                case MessageType.CLOSE: {
                    let [id, fd] = MUClose(message);
                    if(!task.files.fileDescriptors){
                        throw new PError(Status.EBADFD);
                    }
                    await this.closeFile(task, fd);
                    await task.send(MPCloseRes(id))
                    break;
                }

                case MessageType.BIND: {
                    let [id, name, old, flags] = MUBind(message);
                    let cwd = task.pwd;
                    const mountpoint = await this.system.vfs.lookup(old, task)!;
                    let dev: IChannel;

                    if (name[0] == "#"){
                        dev = await this.system.dev.getDevice(name.substring(1)).operations.attach!("", this.system)
                    }else{
                        const path = await this.system.vfs.lookup(name, task);
                        dev = path.channel;
                    }

                    await this.system.vfs.cmount(dev, mountpoint.channel, flags, mountpoint.mount, this.system.current.ns.mnt)
                    await task.send(MPBindRes(id))
                    break;
                }

                case MessageType.MOUNT: {
                    let [id, fd, afd, old, aname, flags] = MUMount(message)
                    const mountpoint = await this.system.vfs.lookup(old, task)!;
                    const file = task.files.fileDescriptors[fd];
                    const afile = task.files.fileDescriptors[afd];
                    const dev = await this.system.dev.getDevice("M").operations.attach!({
                        fd: file?.channel,
                        afd: afile?.channel,
                        aname: aname
                    }, this.system)
                    await this.system.vfs.cmount(dev, mountpoint.channel, flags, mountpoint.mount, this.system.current.ns.mnt)
                    await task.send(MPMountRes(id))
                    break;
                }

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
                    await this.exec(path, argv, task);
                    break;
                }

                case MessageType.FORK: {
                    const [id, entrypoint, args] = MUFork(message);
                    const t = await this.fork(entrypoint, args, 0, task);
                    await task.send(MPForkRes(id, t.pid))
                    break;
                }

                case MessageType.CHCWD: {
                    let [id, path] = MUChCwd(message);

                    const p = await this.system.vfs.lookup(path, task)!;
                    task.chcwd(p);
                    await task.send(MPChCwdRes(id))
                    break;
                }

                case MessageType.DIE: {
                    await task.kill();
                    break;
                }

                case MessageType.REMOVE: {
                    let [id, path] = MURemove(message);

                    let entry = await this.system.vfs.lookup(path, task)!;
                    if(entry.channel.operations.remove){
                        await entry.channel.operations.remove(entry.channel)
                    }else{
                        throw new PError(Status.EPERM);
                    }
                    await task.send(MPRemoveRes(id))
                    break;
                }

                case MessageType.PIPE: {
                    let [id] = MUPipe(message);

                    const dev = await this.system.dev.getDevice("|").operations.attach?.("", this.system)
                    const data = await this.system.vfs.lookup("/data", task, dev);
                    const data1 = await this.system.vfs.lookup("/data1", task, dev);
                    const file = await this.system.vfs.open(data, OpenMode.READ);
                    const file1 = await this.system.vfs.open(data1, OpenMode.WRITE);
                    const pipefd = [this.openFile(task, file), this.openFile(task, file1)]

                    await task.send(MPPipeRes(id, pipefd))
                    break;
                }
            }
        }catch (e) {
            if(e instanceof PError){
                let [_, id] = peak(message);
                await task.send(MPSignal(id, Signal.ERROR, e.code));
            }
        }
    }

    private openFile(task: Task, file: IFile, pos?: FileDescriptor): FileDescriptor {
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

    private closeFile(task: Task, fd: FileDescriptor){
        if (task.files.fileDescriptors[fd]){
            this.system.vfs.close(task.files.fileDescriptors[fd]!);
            task.files.fileDescriptors[fd] = null;
        }

        throw new PError(Status.EBADFD);
    }

    private async fetchDependencyChannel(deps: string[], task: IProtoTask): Promise<[string, IDynaLib, IChannel][]> {
        // TODO: this is wrong, it requires a dependency tree, or else you're loading twice dependencies
        let result: [string, IDynaLib, IChannel][] = [];
        for(const dep of deps){
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
            result.concat(await this.fetchDependencyChannel(dynalibstruct.dependencies, task));
            result.push([dep, dynalibstruct, file.channel]);
        }
        return result;
    }

    private async getCPUChannel(path: string, parent: IProtoTask){
        let cpup = await this.system.vfs.lookup(path + "/ctrl", parent)!;
        let cpuctrl = await this.system.vfs.open(cpup, OpenMode.READ);

        const id = await cpuctrl.channel.operations.read!(cpuctrl.channel, -1, 0);
        let container = await this.system.vfs.lookup(path + "/" + this.system.decoder.decode(id), parent)!;
        let cpu = await this.system.vfs.open(container, OpenMode.RDWR);
        return cpu.channel;
    }

    async fork(path: string, args: string[], fork:ForkMode2, parent: IProtoTask){
        const cpupath = parent.env.get("CPUPATH");
        if(cpupath){
            const cpu = await this.getCPUChannel(cpupath, parent);
            let ns;
            if(fork & ForkMode2.NEW_NAMESPACE){
                ns = this.system.ns.create(parent.ns, fork);
            }else{
                ns = parent.ns;
            }

            const binary = await this.linker.link(path, parent);

            let fds;
            if(fork & ForkMode2.COPY_FD){
                fds = {fileDescriptors:Array.from(parent.files.fileDescriptors)}
            }else if(fork & ForkMode2.EMPTY_FD){
                fds = {fileDescriptors: []};
            }else{
                fds = {fileDescriptors: parent.files};
            }

            let env;
            if(fork & ForkMode2.COPY_ENV){
                env = new Map(parent.env);
            }else if(fork & ForkMode2.EMPTY_ENV){
                env = new Map();
            }else{
                env = parent.env;
            }

            const task = new Task(args, this.system.sysUser, this.system.sysUser, parent.pwd, parent.root, ns, parent.pid, cpu, fds, env, this.handleProcess.bind(this));
            await task.send(MPStart("", binary, [path].concat(args)))
            setTimeout(async () => await task.run(), 0);
            return task;
        }
        throw new PError(Status.ENOENT);
    }

    async exec(path: string, argv: string[], task: Task){
        const cpupath = task.env.get("CPUPATH");
        if(cpupath){
            const cpu = await this.getCPUChannel(cpupath, task);
            await task.switchCPU(cpu);

            const binary = await this.linker.link(path, task);

            await task.send(MPStart("", binary, [path].concat(argv)))
            setTimeout(async () => await task.run(), 0);
            task.argv = argv;
            return task;
        }
        throw new PError(Status.ENOENT);
    }

    wait(pid: pid, task: Task): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            task.ns.pid.get(pid)!.waits.push(resolve);
        })
    }
}

