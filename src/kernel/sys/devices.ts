import {IDeviceTree} from "../../vm/devicetree";

export interface IDevice{
    write(str: String);
    read(count: number): Promise<string>;
}

export abstract class TTYDevice implements IDevice{
    abstract read(count: number): Promise<string>;
    abstract write(str: String);

}

export class NullDevice extends TTYDevice{
    read(count: Number): Promise<string> {
        return new Promise<string>(resolve => resolve(""));
    }

    write(str: String) {}
}


export class DeviceManager {
    private devicetree: IDeviceTree;

    constructor(devicetree: IDeviceTree) {
        this.devicetree = devicetree;
    }
}
