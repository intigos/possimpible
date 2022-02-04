export enum Colors {
    HEADER =  '\u001b[95m',
    BLUE =  '\u001b[94m',
    CYAN =  '\u001b[96m',
    GREEN =  '\u001b[92m',
    YELLOW =  '\u001b[93m',
    RED =  '\u001b[91m',
    ENDC =  '\u001b[0m',
    BOLD =  '\u001b[1m',
    UNDERLINE =  '\u001b[4m',
}

export const red = (s: string) => Colors.RED + s + Colors.ENDC;
export const yellow = (s: string) => Colors.YELLOW + s + Colors.ENDC;
export const cyan = (s: string) => Colors.CYAN + s + Colors.ENDC;
export const green = (s: string) => Colors.GREEN + s + Colors.ENDC;
