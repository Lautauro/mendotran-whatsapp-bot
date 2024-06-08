export function getTimeString(unixTime: number, hours?: boolean, minutes?: boolean, seconds?: boolean, milliseconds?: boolean): string {
    const date: Date = new Date(unixTime);
    const timeValues: number[] = [];
    let string: string = '';

    if (hours) { timeValues.push(date.getHours()); }
    if (minutes) { timeValues.push(date.getMinutes()); }
    if (seconds) { timeValues.push(date.getSeconds()); }
    if (milliseconds) { timeValues.push(date.getMilliseconds()); }

    timeValues.forEach((value, index) => {
        string += `${value < 10 ? '0' : ''}${value}`;

        if (index !== timeValues.length - 1) {
            if ((index < 2)) {
                string += ':';
            } else {
                string += '.';
            }
        }
    });

    return string;
}