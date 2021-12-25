import {ISystemCalls} from "./api";


declare global {
    interface Window {
        proc: {
            sys: ISystemCalls
        };
    }
}
