import {System} from "./system";


export interface ISystemModule{
    name: string;
    init: (kernel: System) => void;
    cleanup: () => void;
}

export interface IActiveModules {
    module: ISystemModule;
}

export class ModularityManager{
    modules: IActiveModules[] = [];
    system: System;

    constructor(system: System) {
        this.system = system;
    }

    async installModule(module: ISystemModule) {
        this.modules.push({
            module: module
        });

        await module.init(this.system);
    }
}
