import {IDeviceDescription} from "../vm/devicetree";
import {DeviceManager} from "./dev/dev";
import {VirtualFileSystem} from "./vfs/vfs";
import {ProcessManager} from "./proc/proc";
import {ModularityManager} from "./modules";
import {NamespaceManager} from "./ns/ns";
import {ChannelManager} from "./vfs/channel";

import root from "./dev/root";
import cons from "./dev/cons";
import kbd from "./dev/kbd";
import serial from "./dev/serial";
import {LogManager} from "./log";
import {red} from "./colors";
import srv from "./dev/srv";
import bootimg from "./dev/bootimg";
import pipe from "./dev/pipe";
import mount from "./dev/mount";
import {IFile, IProtoTask} from "./proc/task";
import cpu from "./dev/cpu";
import {ForkMode2} from "../public/api";
import env from "./dev/env";


export type ISystemOptions = Record<string, string>;

/**
 * This class is the kernel of the of Possimpable. It retains the links for all the subsystems, and is passed,
 * and used by the subsystems to access each other.
 */
export class System{
    public vfs: VirtualFileSystem;
    private options: Partial<ISystemOptions>;
    public descriptions?: IDeviceDescription[];

    public dev: DeviceManager;
    public mod: ModularityManager;
    public ns: NamespaceManager;
    public proc: ProcessManager;
    public channels: ChannelManager;
    public sysUser = "root";
    public encoder = new TextEncoder();
    public decoder = new TextDecoder();

    public current?: IProtoTask;
    private console?: IFile;
    private log: LogManager;
    boottime = new Date().getTime() / 1000;
    ktask?: IProtoTask;



    constructor(options: Partial<ISystemOptions>){
        this.options = options;
        this.channels = new ChannelManager(this);
        this.vfs = new VirtualFileSystem(this);
        this.dev = new DeviceManager(this);
        this.proc = new ProcessManager(this);
        this.mod = new ModularityManager(this);
        this.ns = new NamespaceManager(this);
        this.log = new LogManager(this);
    }

    private async setupSystemTask() {
        const ns = this.ns.create(null, 0);

        const root = await this.vfs.attach("/", "");
        let mount = await this.vfs.cmount(root, this.channels.mkchannel(), 0, null, ns.mnt);

        this.ktask = {
            gid: this.sysUser, uid: this.sysUser,
            pid: 0,
            root: {channel: root, mount: mount},
            pwd: {channel: root, mount: mount},
            ns: ns,
            files: {fileDescriptors: []},
            env: new Map<string, string>()
        };

        const cpu = await this.vfs.attach("C", "");
        this.ktask.env.set("CPUPATH", "/dev/cpu");
        const dev = await this.vfs.lookup("/dev", this.ktask);
        await this.vfs.cmount(cpu, dev.channel, 0, dev.mount, ns.mnt);

        this.current = this.ktask;
    }

    async boot(devices:IDeviceDescription[]){
        await this.mod.installModule(root);
        await this.mod.installModule(cons);
        await this.mod.installModule(kbd);
        await this.mod.installModule(srv);
        await this.mod.installModule(serial);
        await this.mod.installModule(bootimg);
        await this.mod.installModule(pipe);
        await this.mod.installModule(mount);
        await this.mod.installModule(cpu);
        await this.mod.installModule(env);
        this.descriptions = devices;
        await this.dev.init()
        await this.setupSystemTask();
        const args = Object.keys(this.options).map(x => {
            return `${x}=${this.options[x]}`
        });

        const task = await this.proc.fork("/boot/boot", args, ForkMode2.NEW_NAMESPACE | ForkMode2.EMPTY_FD | ForkMode2.CLONE_MNT | ForkMode2.COPY_ENV, this.current!)

        await this.proc.wait(1, task);
    }

    printk(data: string){
        this.console?.channel.operations.write!(this.console?.channel, this.encoder.encode(data.replace("\n", "\n\r")), -1);
    }

    panic(data: string){
        this.printk( red("PANIC") + " : " + data);
    }
}
