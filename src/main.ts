import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";

import {TTYDevice} from "./kernel/sys/devices";
import {Kernel} from "./kernel/kernel";
import "xterm/css/xterm.css"

// @ts-ignore
import initrd from "&/initrd.img";

class TerminalDevice extends TTYDevice{
    private term: Terminal;
    private resolve: ((value: (string | PromiseLike<string>)) => void) | undefined;
    private buffer: string = "";

    constructor(el: HTMLElement) {
        super();
        this.term = new Terminal({
            fontSize:13
        });
        const fitAddon = new FitAddon();

        this.term.loadAddon(fitAddon);

        this.term.onData((data) => {
            if(this.resolve && this.buffer.length == 0){
                this.resolve(data);
                this.resolve = undefined;
            }else{
                this.buffer += data
            }

        })
        fitAddon.fit();
        this.term.open(el);
    }

    async read(count: number): Promise<string> {
        return new Promise<string>(x =>{
            if(this.buffer.length){
                x(this.buffer);
                this.buffer = "";
            }else{
                this.resolve = x;

            }
        })
    }

    write(str: string) {
        this.term.write(str);
    }
}

window.onload = async () => setTimeout(async x => {
    const kernel = new Kernel({
        tty: new TerminalDevice(document.getElementById("term")!),
        initrd: initrd,
        initrc: "/bin/init"
    });
    await kernel.boot()
}, 100);
