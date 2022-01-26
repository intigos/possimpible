import {IDeviceDescription} from "./devicetree";
import {System} from "../sys/system";

export class VirtualMachine{
    private devices: IDeviceDescription[];

    constructor(ds: IDeviceDescription[]) {
        this.devices = ds;
    }

    async boot(kernel: System){
        return await kernel.boot(this.devices);
    }
}

