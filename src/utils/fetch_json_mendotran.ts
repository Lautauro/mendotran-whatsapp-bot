import { fetch_with_timeout } from "./fetch_with_timeout.js";

export const fetch_json_mendotran: (url: string, options?: object | null, timeout?: number) => Promise<any> = async (url: string, options?: object | null, timeout?: number) => {
    const response = await fetch_with_timeout(url, options, timeout);

    if (response.ok && response.status === 200) {
        const json = await response.json();
        return json;
    } else {
        throw `ERROR ${response.status}`;
    }
}
