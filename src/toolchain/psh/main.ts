import {FD_STDOUT} from "../../public/api";

let syscall = self.proc.sys;
console.log("in");
syscall.write(FD_STDOUT, "Hello World\n");

