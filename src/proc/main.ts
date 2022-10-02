import {Process} from "./process"
let process;

self.addEventListener("message", (ev) => {
    process = new Process(ev.data);
    process.run();
})

