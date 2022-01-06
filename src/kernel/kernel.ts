import {VirtualFileSystem} from "./fs/vfs";
import blobfs from "./fs/blobfs/module"
import devfs from "./fs/devfs/module"
import procfs from "./fs/procfs/module"
import lorch from "./proc/lorch/module"
import {ModularityManager} from "./sys/modules";
import {NullDevice, TTYDevice} from "./sys/devices";
import {IProtoTask, ITask, ProcessManagement} from "./proc/process";
import {OrchestratorManagement} from "./proc/orchestrator";
import {NamespaceManager, NSOperation} from "./ns/namespace";
import {PError, Status} from "../public/status";
import {Lookup} from "./fs/namei";
import {IDeviceTree} from "../vm/devicetree";

type IKernelOptions = Record<string, string>;

export class Kernel{
    public vfs: VirtualFileSystem;
    public modules: ModularityManager;
    public processes: ProcessManagement;
    public orchestrators: OrchestratorManagement;
    private options: Partial<IKernelOptions>;
    private namespaces: NamespaceManager;
    public current?: ITask;
    private devicetree?: IDeviceTree;

    constructor(options: Partial<IKernelOptions>){
        this.options = options;
        this.vfs = new VirtualFileSystem(this);
        this.modules = new ModularityManager(this);
        this.processes = new ProcessManagement(this);
        this.orchestrators = new OrchestratorManagement(this);
        this.namespaces = new NamespaceManager(this);
        this.tty = this.options.tty || new NullDevice();
    }

    private async init_mount_tree():Promise<IProtoTask>{
        const root = this.vfs.lookup("/", null)!;
        root.mount = await this.vfs.mount("", "", root.mount, root.entry, this.vfs.getFS("tmpfs"));
        root.entry = root.mount.superblock.root;
        const prototask = {root:root, pwd:root}

        this.vfs.mkdir("/dev", prototask);
        const dev = this.vfs.lookup("/dev", prototask)!;
        await this.vfs.mount("", "", dev.mount, dev.entry, this.vfs.getFS("dev"));
        this.vfs.mkdir("/root", prototask);

        return prototask;
    }
    
    async boot(deviceTree:IDeviceTree){
        this.devicetree = deviceTree;
        this.printk("Booting Kernel...");
        this.modules.installModule(blobfs);
        this.modules.installModule(devfs);
        this.modules.installModule(procfs);
        this.modules.installModule(lorch);

        const ktask = await this.init_mount_tree();

        if(!this.options.initrd){
            this.panic("No initrd disk");
            return;
        }

        this.printk(`mounting initrd (size:${this.options.initrd.length}) into /`)
        const rootns = this.namespaces.create(NSOperation.NEW_MOUNT | NSOperation.NEW_PROC);
        let root = this.vfs.lookup("/root", ktask)!;
        await this.vfs.mount(this.options.initrd, "", root.mount, root.entry, this.vfs.getFS("blob"))

        let dev = this.vfs.lookup("/dev", ktask)!;
        await this.vfs.unmount(dev.mount!, dev.entry);
        root = this.vfs.lookup("/root", ktask)!;
        this.processes.chcwd(ktask, root);
        this.processes.chroot(ktask, root);

        dev = this.vfs.lookup("/dev", ktask)!;
        await this.vfs.mount("", "", dev.mount, dev.entry, this.vfs.getFS("dev"));

        const proc = this.vfs.lookup("/proc", ktask)!;

        await this.vfs.mount("", "", proc.mount, proc.entry, this.vfs.getFS("proc"));

        const run = this.vfs.lookup("/var/tmp", ktask)!;
        await this.vfs.mount("", "", run.mount, run.entry, this.vfs.getFS("tmpfs"));


        this.printk(`\ninit: starting ${this.options.initrc}`)
        try{
            await this.processes.createProcess(this.options.initrc, [], ktask);
            await this.processes.wait(1);
        }catch (e){
            if (e instanceof PError && e.code == Status.ENOENT){
                this.panic( this.options.initrc + " : No such file or directory")
                this.panic( "Nothing else to do, terminated.")
            }
        }
    }

    printk(data: string){
        // this.tty.write(data);
        // this.tty.write("\n\r");
    }

    panic(data: string){
        this.printk("PANIC : " + data);
    }
}
