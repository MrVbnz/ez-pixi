export interface Disposable {
    dispose(): void;
}

export function usingDisposabe<T extends Disposable>(resource: T, action: (resource: T) => void): void {
    try {
        action(resource);
    } finally {
        resource.dispose();
    }
}