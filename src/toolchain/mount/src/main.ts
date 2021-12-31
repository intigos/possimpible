import {FD_STDOUT} from "../../../public/api";
import {entrypoint, print, slurp} from "libts";

function args(args: string[]){
    const result: any = {

    };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        if(arg == "-t"){
            result.type = args[++i];
            continue;
        }

        if(arg == "-b"){
            result.bind = true;
            continue;
        }
        if(result.device){
            result.mountpoint = arg;
            continue
        }

        if(result.device && result.mountpoint){
            throw "Too many arguments";
        }

        result.device = arg
    }

    return result;
}

async function main(argv: string[]): Promise<number>{
    if (argv.length == 1){
        let content = await slurp("/proc/mounts");
        print(content);
    }else{
        const a = args(argv);

        self.proc.sys.mount(a.type, a.device, a.options, a.mountpoint)
    }
    return 0;
}

entrypoint(main);
