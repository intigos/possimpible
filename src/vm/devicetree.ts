export interface IDeviceTree {
    id: string;
    label?: string;
    value?: any;
    children?: IDeviceTree[];
}

export function DSNode(id: string, label: string|IDeviceTree[], children?: IDeviceTree[]): IDeviceTree{
    if(children){
        return {
            id:id,
            label: id,
            children:children,
        }
    }else{
        return {
            id:id,
            children:label as IDeviceTree[],
        }
    }
}

export function DSProperty(id: string, value: any): IDeviceTree{
    return {
        id:id,
        value:value,
    }
}