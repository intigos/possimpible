import {IDeviceDescription} from "../vm/devicetree";
import {DeviceManager} from "./dev/dev";
import {VirtualFileSystem} from "./vfs/vfs";
import {IFile, IProtoTask, ProcessManager} from "./proc/proc";
import {ModularityManager} from "./modules";
import {OrchestratorManager} from "./proc/orchestrator";
import {NamespaceManager} from "./ns/ns";
import {mkchannel} from "./vfs/channel";

import root from "./dev/root";
import cons from "./dev/cons";
import kbd from "./dev/kbd";
import serial from "./dev/serial";
import {LogLevel, LogManager} from "./log";
import {red, yellow} from "./colors";
import srv from "./dev/srv";
import bootimg from "./dev/bootimg";
import lorch from "./proc/lorch/module";
import pipe from "./dev/pipe";
import mount from "./dev/mount";


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
    public orchestrators: OrchestratorManager;
    public ns: NamespaceManager;
    public proc: ProcessManager;
    public encoder = new TextEncoder();
    public decoder = new TextDecoder();

    public current?: IProtoTask;
    private console?: IFile;
    private log: LogManager;
    ktask?: IProtoTask;

    constructor(options: Partial<ISystemOptions>){
        this.options = options;
        this.vfs = new VirtualFileSystem(this);
        this.dev = new DeviceManager(this);
        this.proc = new ProcessManager(this);
        this.mod = new ModularityManager(this);
        this.orchestrators = new OrchestratorManager(this);
        this.ns = new NamespaceManager(this);
        this.log = new LogManager(this);
    }

    private async setupSystemTask() {
        const ns = this.ns.create(0, null);

        const root = await this.vfs.attach("/", "");
        const mount = await this.vfs.cmount(root, mkchannel(), 0, null, ns.mnt);

        this.ktask = {
            root: {entry: root, mount: mount},
            pwd: {entry: root, mount: mount},
            ns: ns,
        };
        this.current = this.ktask;
    }

    async boot(devices:IDeviceDescription[]){
        await this.mod.installModule(root)
        await this.mod.installModule(cons)
        await this.mod.installModule(kbd)
        await this.mod.installModule(srv)
        await this.mod.installModule(serial)
        await this.mod.installModule(bootimg)
        await this.mod.installModule(lorch)
        await this.mod.installModule(pipe)
        await this.mod.installModule(mount)
        this.descriptions = devices;
        await this.dev.init()
        await this.setupSystemTask();

        await this.proc.createProcess("/boot/boot", [], this.current!);

        await this.proc.wait(1);
    }

    printk(data: string){
        this.console?.channel.operations.write!(this.console?.channel, this.encoder.encode(data.replace("\n", "\n\r")), -1);
    }

    panic(data: string){
        this.printk( red("PANIC") + " : " + data);
    }
}
