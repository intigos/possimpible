import {VirtualFileSystem} from "./fs/vfs";
import blobfs from "./fs/blobfs/module"
import devfs from "./fs/devfs/module"
import procfs from "./fs/procfs/module"
import lorch from "./proc/lorch/module"
import {ModularityManager} from "./sys/modules";
import {NullDevice, TTYDevice} from "./sys/devices";
import {ITask, ProcessManagement} from "./proc/process";
import {OrchestratorManagement} from "./proc/orchestrator";

interface IKernelOptions {
    root: any;
    initrd: any;
    initrc: any;
    tty: TTYDevice
}

export class Kernel{
    public vfs: VirtualFileSystem;
    public modules: ModularityManager;
    public tty: TTYDevice;
    public toptask?: ITask;
    public processes: ProcessManagement;
    public orchestrators: OrchestratorManagement;
    private options: Partial<IKernelOptions>;

    constructor(options: Partial<IKernelOptions>){
        this.options = options;
        this.vfs = new VirtualFileSystem(this);
        this.modules = new ModularityManager(this);
        this.processes = new ProcessManagement(this);
        this.orchestrators = new OrchestratorManagement(this);
        this.tty = this.options.tty || new NullDevice();
        this.printk("Possimpible\n\r")
    }
    
    async boot(){
        this.printk("Booting Kernel...");
        this.modules.installModule(blobfs);
        this.modules.installModule(devfs);
        this.modules.installModule(procfs);
        this.modules.installModule(lorch);

        if(!this.options.initrd){
            this.panic("No initrd disk")
            return
        }
        this.printk(`mounting initrd (size:${this.options.initrd.length}) into /`)
        const root = this.vfs.lookup(null, "/")!;
        root.mount = await this.vfs.mount(this.options.initrd, root.mount, root.entry, this.vfs.getFS("blobfs"))
        root.entry = root.mount.superblock.root;

        const dev = this.vfs.lookup(root,"/dev")!;
        await this.vfs.mount("", dev.mount, dev.entry, this.vfs.getFS("devfs"));

        const proc = this.vfs.lookup(root, "/proc")!;
        await this.vfs.mount("", proc.mount, proc.entry, this.vfs.getFS("procfs"));


        this.printk(`exec ${this.options.initrc} into PID 1`)
        await this.processes.createProcess(this.options.initrc, [], root, undefined);
        await this.processes.wait(1);
    }

    printk(data: string){
        this.tty.write(data);
        this.tty.write("\n\r");
    }

    panic(data: string){
        this.printk("PANIC :" + data);
    }
}
