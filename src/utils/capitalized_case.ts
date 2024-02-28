export function capitalized_case(str: string): string {
    return str.charAt(0)
              .toUpperCase()
              + str.slice(1); 
}