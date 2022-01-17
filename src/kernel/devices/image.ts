import {IKernelModule} from "../sys/modules";
import {Kernel} from "../kernel";

function init(kernel: Kernel){
    kernel.devices.registerDriver({
        probe: (x, match) => {
            kernel.devices.registerCharDevice(x.id, {
                read: async (file, count) => {
                    return (x as any).properties.image;
                }
            });
        },
        remove: (x) => {},
        driver:{
            name: "image",
            matchTable: [{compatible: ["storage:image"], data: null}]
        }
    })
}

function cleanup(){

}

const module: IKernelModule = {
    name: "image",
    init: init,
    cleanup: cleanup
}

export default module;
