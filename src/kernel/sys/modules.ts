import {Kernel} from "../kernel";
import blobfs from "../fs/blobfs/module";
import procfs from "../fs/procfs/module";
import lorch from "../proc/lorch/module";

export interface IKernelModule{
    name: string;
    init: (kernel: Kernel) => void;
    cleanup: () => void;
}

interface IActiveModules {
    module: IKernelModule;
}

export class ModularityManager{
    modules: IActiveModules[] = [];
    kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    installModule(module: IKernelModule){
        this.modules.push({
            module:module
        });

        module.init(this.kernel);
    }
}
