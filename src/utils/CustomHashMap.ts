
export class CustomHashMap<T> {
    private buckets: Array<Array<{ key: string; value: T }>>;
    private size: number;
    private count: number;

    constructor(initialCapacity: number = 1000) {
        this.buckets = new Array(initialCapacity);
        this.size = initialCapacity;
        this.count = 0;
    }

    // DJB2 Hash Function
    private hash(key: string): number {
        let hash = 5381;
        for (let i = 0; i < key.length; i++) {
            // hash * 33 + c
            hash = ((hash << 5) + hash) + key.charCodeAt(i);
        }
        // Ensure positive index
        return (hash >>> 0) % this.size;
    }

    set(key: string, value: T): void {
        // Resize if load factor > 0.75
        if (this.count / this.size > 0.75) {
            this.resize(this.size * 2);
        }

        const index = this.hash(key);
        if (!this.buckets[index]) {
            this.buckets[index] = [];
        }

        const bucket = this.buckets[index];
        const existing = bucket.find(item => item.key === key);

        if (existing) {
            existing.value = value;
        } else {
            bucket.push({ key, value });
            this.count++;
        }
    }

    get(key: string): T | undefined {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        if (!bucket) return undefined;

        const item = bucket.find(item => item.key === key);
        return item ? item.value : undefined;
    }

    has(key: string): boolean {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        if (!bucket) return false;

        return bucket.some(item => item.key === key);
    }

    getAllValues(): T[] {
        const allValues: T[] = [];
        for (const bucket of this.buckets) {
            if (bucket) {
                for (const item of bucket) {
                    allValues.push(item.value);
                }
            }
        }
        return allValues;
    }

    private resize(newSize: number) {
        const oldBuckets = this.buckets;
        this.buckets = new Array(newSize);
        this.size = newSize;
        this.count = 0; // Reset count as we are re-inserting

        for (const bucket of oldBuckets) {
            if (bucket) {
                for (const item of bucket) {
                    this.set(item.key, item.value);
                }
            }
        }
    }
}
