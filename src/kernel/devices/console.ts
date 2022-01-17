import {IKernelModule} from "../sys/modules";
import {Kernel} from "../kernel";

function init(kernel: Kernel){
    kernel.devices.registerDriver({
        probe: (x, match) => {
            kernel.devices.registerCharDevice("console", {
                write: async (file, buf) => {
                    return (x as any).properties.write(buf);
                },
            });
        },
        remove: (x) => {
        },
        driver:{
            name: "console",
            matchTable: [{compatible: ["display:console"], data: null}]
        }
    })
}

function cleanup(){

}

const module: IKernelModule = {
    name: "console",
    init: init,
    cleanup: cleanup
}

export default module;
