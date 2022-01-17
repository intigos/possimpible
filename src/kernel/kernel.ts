import {IFile, IFileSystemType, VirtualFileSystem} from "./fs/vfs";
import blobfs from "./fs/blobfs/module"
import procfs from "./fs/procfs/module"
import lorch from "./proc/lorch/module"
import {ModularityManager} from "./sys/modules";
import {IProtoTask, ITask, ProcessManagement} from "./proc/process";
import {OrchestratorManagement} from "./proc/orchestrator";
import {NamespaceManager, NSOperation} from "./ns/namespace";
import {PError, Status} from "../public/status";
import {IDeviceDescription} from "../vm/devicetree";
import {DeviceManager} from "./devices/drivers";
import image from "./devices/image";
import console from "./devices/console";
import serial from "./devices/serial";

type IKernelOptions = Record<string, string>;

export class Kernel{
    public vfs: VirtualFileSystem;
    public modules: ModularityManager;
    public processes: ProcessManagement;
    public orchestrators: OrchestratorManagement;
    private options: Partial<IKernelOptions>;
    private namespaces: NamespaceManager;
    public current?: IProtoTask|ITask;
    public descriptions?: IDeviceDescription[];
    public devices: DeviceManager;
    public serial?: IFile;

    constructor(options: Partial<IKernelOptions>){
        this.options = options;
        this.vfs = new VirtualFileSystem(this);
        this.modules = new ModularityManager(this);
        this.processes = new ProcessManagement(this);
        this.orchestrators = new OrchestratorManagement(this);
        this.namespaces = new NamespaceManager(this);
        this.devices = new DeviceManager(this);
    }

    private async init_mount_tree():Promise<IProtoTask>{
        const root = this.vfs.lookup("/", null)!;
        root.mount = await this.vfs.mount("", "", root.mount, root.entry, this.vfs.getFS("tmpfs"));
        root.entry = root.mount.superblock.root;
        const prototask = {root:root, pwd:root, files:[]}

        this.vfs.mkdir("/dev", prototask);
        const dev = this.vfs.lookup("/dev", prototask)!;
        await this.vfs.mount("", "", dev.mount, dev.entry, this.vfs.getFS("dev"));
        this.vfs.mkdir("/root", prototask);

        return prototask;
    }
    
    async boot(devices:IDeviceDescription[]){
        this.modules.installModule(image);
        this.modules.installModule(console);
        this.modules.installModule(serial);
        this.modules.installModule(blobfs);
        this.modules.installModule(procfs);
        this.modules.installModule(lorch);
        this.descriptions = devices;
        this.devices.init();
        this.current = await this.init_mount_tree();
        let serialPath = this.options.serial || "/dev/null";
        let serialFile = this.vfs.lookup(serialPath, this.current)!;
        this.serial = await this.vfs.open(serialFile);

        this.printk("Booting Kernel...");
        this.printk("Command line: " + Object.keys(this.options).map(x => {
            return `${x}=${this.options[x]}`
        }).reduce((x,y) => x + " " + y) + "\n");

        this.printk(`mounting root ${this.options.root} into /`)
        const rootns = this.namespaces.create(NSOperation.NEW_MOUNT | NSOperation.NEW_PROC);
        let root = this.vfs.lookup("/root", this.current)!;
        let vfs: IFileSystemType|null = null;
        if(this.options.rootfs){
            vfs = this.vfs.getFS(this.options.rootfs);
        }else{
            this.panic( "No rootfs defined");
            return
        }

        if(this.options.root){
            try{
                await this.vfs.mount(this.options.root, "", root.mount, root.entry, vfs)
            }catch (e: any){
                this.panic( "Error while mounting root: " + (e.code) ? Status[e.code] : "unknown");
                return
            }
        }else{
            this.panic( "No root named " + this.options.rootfs);
            return
        }


        let dev = this.vfs.lookup("/dev", this.current)!;
        await this.vfs.unmount(dev.mount!, dev.entry);

        root = this.vfs.lookup("/root", this.current)!;
        this.processes.chcwd(this.current, root);
        this.processes.chroot(this.current, root);

        dev = this.vfs.lookup("/dev", this.current)!;
        await this.vfs.mount("", "", dev.mount, dev.entry, this.vfs.getFS("dev"));

        const proc = this.vfs.lookup("/proc", this.current)!;
        await this.vfs.mount("", "", proc.mount, proc.entry, this.vfs.getFS("proc"));

        const run = this.vfs.lookup("/var/tmp", this.current)!;
        await this.vfs.mount("", "", run.mount, run.entry, this.vfs.getFS("tmpfs"));

        if(this.options.initrc) {
            this.printk(`\ninit: starting ${this.options.initrc}`)
            try {
                await this.processes.createProcess(this.options.initrc, [], this.current);

                await this.processes.wait(1);
            } catch (e) {
                if (e instanceof PError && e.code == Status.ENOENT) {
                    this.panic(this.options.initrc + " : No such file or directory")
                    this.panic("Nothing else to do, terminated.")
                }
            }
        }else{
            this.panic("No initrd disk");
            return;
        }
    }

    printk(data: string){
        this.serial!.operations.write!(this.serial!, data);
        this.serial!.operations.write!(this.serial!, "\n\r");
    }

    panic(data: string){
        this.printk("PANIC : " + data);
    }
}
