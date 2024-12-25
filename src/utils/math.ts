export function clamp(a: number, min: number, max: number) {
    if (a < min)
        return min;
    if (a > max)
        return max;
    return a;
}