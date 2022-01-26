import {IOperations} from "./channel";

export interface IDevice{
    id: string;
    name: string;
    operations: Partial<IOperations>;
}
