import {FD_STDOUT} from "../../../public/api";

export function print(s: string){
    self.proc.sys.write(FD_STDOUT, s);
}
