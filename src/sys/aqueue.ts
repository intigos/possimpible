export interface IAsyncQueue<T>{
    buffer: T[]
    promise : ((value: T) => void)[]
}

export function mkaqueue<T>(): IAsyncQueue<T>{
    return {buffer: [], promise: []}
}

export function dequeue<T>(queue: IAsyncQueue<T>){
    if(queue.buffer.length == 0){
        return new Promise<T>((resolve, reject) => {
            queue.promise?.push(resolve);
        })
    }else{
        return Promise.resolve<T>(queue.buffer.pop()!);
    }
}


export async function enqueue<T>(queue: IAsyncQueue<T>, value: T){
    if(queue.promise.length){
        queue.promise.pop()!(value)
    }else{
        queue.buffer.push(value);
    }
}
