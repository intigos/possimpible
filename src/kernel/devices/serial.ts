import {IKernelModule} from "../sys/modules";
import {Kernel} from "../kernel";

function init(kernel: Kernel){
    kernel.devices.registerDriver({
        probe: (x, match) => {
            kernel.devices.registerCharDevice("tty0", {
                write: async (file, buf) => {
                    return (x as any).properties.write(buf);
                },
                read: async (file, count) => {
                    return (x as any).properties.read(count);
                }
            });
        },
        remove: (x) => {},
        driver:{
            name: "serial",
            matchTable: [{compatible: ["serial:terminal"], data: null}]
        }
    })
}

function cleanup(){

}

const module: IKernelModule = {
    name: "serial",
    init: init,
    cleanup: cleanup
}

export default module;
