import {Kernel} from "../kernel";
import {devfs} from "./fs";
import {IDeviceDescription} from "../../vm/devicetree";
import {IFileOperations} from "../fs/vfs";
import {PError, Status} from "../../public/status";

interface DriverMatch{
    compatible: string[],
    data: any
}

interface Driver {
    probe: (x: IDeviceDescription, match:DriverMatch) => void
    remove: (x: IDeviceDescription  ) => void
    driver: {
        name: string;
        matchTable: DriverMatch[]
    }
}

export class DeviceManager{
    private kernel: Kernel;
    private matchTable = new Map<string, (x:IDeviceDescription) => void>();
    private deviceDrivers: Driver[] = [];
    public devices = new Map<string, IFileOperations>();

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        this.kernel.vfs.registerFS(devfs);

        this.registerCharDevice("null", {
            write: async (file, buf) => {
            },
            read: async (file, count) => {
                return "";
            }
        });
    }

    registerDriver(driver: Driver){
        this.deviceDrivers.push(driver);
        for (const match of driver.driver.matchTable) {
            for (const string of match.compatible) {
                this.matchTable.set(string, (x:IDeviceDescription) => {
                    driver.probe(x, match);
                });
            }
        }
    }

    init(){
        for (const dd of this.kernel.descriptions!) {
            for(const s of dd.properties.compatibility){
                if(this.matchTable.has(s)){
                    this.matchTable.get(s)!(dd);
                }
            }
        }
    }

    registerCharDevice(name: string, ops: IFileOperations){
        let x = this.devices.get(name);
        if(!x){
            this.devices.set(name, ops);
        }else{
            throw new PError(Status.EINVAL);
        }
    }
}
