
const HEADER =  '\u001b[95m';
const BLUE =  '\u001b[94m';
const CYAN =  '\u001b[96m';
const GREEN =  '\u001b[92m';
const YELLOW =  '\u001b[93m';
const RED =  '\u001b[91m';
const ENDC =  '\u001b[0m';
const BOLD =  '\u001b[1m';
const UNDERLINE =  '\u001b[4m';

export const red = (s: string):string => RED + s + ENDC;
export const yellow = (s: string):string => YELLOW + s + ENDC;
export const cyan = (s: string):string => CYAN + s + ENDC;
export const green = (s: string):string => GREEN + s + ENDC;
