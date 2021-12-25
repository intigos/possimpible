import {Kernel} from "../kernel";

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
        this.kernel.printk("Installing module " + module.name);
        this.modules.push({
            module:module
        });

        module.init(this.kernel);
    }
}
