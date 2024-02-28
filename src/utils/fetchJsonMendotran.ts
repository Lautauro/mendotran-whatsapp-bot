import { fetchWithTimeout } from "./fetchWithTimeout.js";

export const fetchJsonMendotran: (url: string, options?: object | null, timeout?: number) => Promise<any> = async (url: string, options?: object | null, timeout?: number) => {
    const response = await fetchWithTimeout(url, options, timeout);

    if (response.ok && response.status === 200) {
        const json = await response.json();
        return json;
    } else {
        throw `ERROR ${response.status}`;
    }
}
