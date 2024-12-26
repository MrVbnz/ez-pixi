export function clamp(a: number, min: number, max: number) {
    if (a < min)
        return min;
    if (a > max)
        return max;
    return a;
}

export function roundWithStep(a: number, step: number) {
    return Math.round(Math.round(a / step) * step);
}