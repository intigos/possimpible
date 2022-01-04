import {Kernel} from "../kernel/kernel";
import {IDeviceTree} from "./devicetree";

export class VirtualMachine{
    private devicetree: IDeviceTree;

    constructor(ds: IDeviceTree) {
        this.devicetree = ds;
    }

    async boot(kernel: Kernel){
        return await kernel.boot()
    }
}