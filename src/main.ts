import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import * as XtermWebfont from 'xterm-webfont'
import "xterm/css/xterm.css";
import {DeviceDetail, discover} from "./vm/devicetree";
import {VirtualMachine} from "./vm/vm";
import {System} from "./sys/system";
import {PError, Status} from "./public/api";


class TerminalDevice{
    private term: Terminal;
    private resolve: ((value: (string | PromiseLike<string>)) => void) | undefined;
    private buffer: string = "";

    constructor(el: HTMLElement) {
        this.term = new Terminal({
            fontFamily: "JetBrainsMono",
            fontSize:13,
            rendererType: "dom"
        });
        const fitAddon = new FitAddon();

        this.term.loadAddon(fitAddon);
        this.term.loadAddon(new XtermWebfont())

        this.term.onData((data) => {
            if(this.resolve && this.buffer.length == 0){
                this.resolve(data);
                this.resolve = undefined;
            }else{
                this.buffer += data
            }
        })
        fitAddon.fit();
        // @ts-ignore
        this.term.loadWebfontAndOpen(el);
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


const terminal = new TerminalDevice(document.getElementById("term")!);

// style node
const head = document.head || document.getElementsByTagName('head')[0],
    style = document.createElement('style');
head.appendChild(style);
const textNode = document.createTextNode("")
style.appendChild(textNode)

window.onload = async () => setTimeout(async x => {
    const vm = new VirtualMachine(discover([
        DeviceDetail("serial", {
            compatibility: ["serial:terminal"],
            write: (buf: string) => terminal.write(buf),
            read: (count: number) => terminal.read(count),
            visibility: (h: boolean) => {
                document.getElementById("term")!.style.display = "none";
            }
        }),

        DeviceDetail("browser", {
            compatibility: ["display:browser"],
            root: document.body,
            style: textNode
        }),

        DeviceDetail("console", {
            compatibility: ["display:console"],
            write: (buf: string) => console.log(buf)
        }),
    ]));
    try{
        await vm.boot(new System({
            serial: "/dev/serial/data",
            filesrv: "11pclient",
            mountpoint: "helix",
            remote: "ws://localhost:5000",
            share: "startup",
            initrc: "/bin/init"
        }));
    }catch (e) {
        if(e instanceof PError){
            console.error("Caught " + Status[e.code])
        }else{
            console.error(e);
        }
    }

}, 100);
