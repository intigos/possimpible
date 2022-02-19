
import {IDeviceDescription} from "../../vm/devicetree";
import {System} from "../system";
import {IDevice} from "../vfs/device";
import {PError, Status} from "../../public/api";

export interface DriverMatch{
    compatible: string,
    data: any
}

export interface Driver {
    probe: (x: IDeviceDescription, match:DriverMatch) => void
    remove: (x: IDeviceDescription  ) => void
    driver: {
        name: string;
        matchTable: DriverMatch[]
    }
}

export class DeviceManager{
    private devices = new Map<string, IDevice>();
    private system: System;
    private matchTable = new Map<string, (x:IDeviceDescription) => void>();
    private deviceDrivers: Driver[] = [];

    constructor(system: System) {
        this.system = system;
    }


    registerDevice(device: IDevice){
        this.devices.set(device.id, device);
    }

    getDevice(id: string): IDevice|undefined{
        return this.devices.get(id);
    }

    registerDriver(driver: Driver){
        this.deviceDrivers.push(driver);
        for (const match of driver.driver.matchTable) {
            this.matchTable.set(match.compatible, async (x: IDeviceDescription) => {
                await driver.probe(x, match);
            });
        }
    }

    async init() {
        for (const dd of this.system.descriptions!) {
            for (const s of dd.properties.compatibility) {
                if (this.matchTable.has(s)) {
                    await this.matchTable.get(s)!(dd);
                }
            }
        }
    }
}
