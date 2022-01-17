import {Kernel} from "../kernel/kernel";
import {IDeviceDescription, IDeviceTree} from "./devicetree";

export class VirtualMachine{
    private devices: IDeviceDescription[];

    constructor(ds: IDeviceDescription[]) {
        this.devices = ds;
    }

    async boot(kernel: Kernel){
        return await kernel.boot(this.devices);
    }
}

