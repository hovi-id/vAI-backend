import Redis from "ioredis";

export class RedisCache {
    private static redis: Redis;

    // Initialize Redis connection
    private static initialize() {
        if (process.env.NODE_ENV === 'local') {
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT),
                password: process.env.REDIS_TOKEN,
            });
            console.log(`Connected to local redis server`);
        } else {
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT),
                password: process.env.REDIS_TOKEN,
                tls: {
                    host: process.env.REDIS_HOST
                }
            });
            console.log(`Connected to ${process.env.NODE_ENV} redis`);
        }
    }

    // Get value from redis
    static async getValue(key: string): Promise<any | undefined> {
        if (!this.redis) {
            this.initialize();
        }
        const result = await this.redis.get(key);
        return result !== null ? JSON.parse(result) : undefined;
    }

    // Set value in redis
    static async setValue(key: string, value: any, ttl?: number): Promise<string | null> {
        if (!this.redis) {
            this.initialize();
        }
        const serializedValue = JSON.stringify(value);
        return ttl ? this.redis.set(key, serializedValue, 'EX', ttl) : this.redis.set(key, serializedValue);
    }

    // Remove value from redis
    static async removeValue(key: string): Promise<number | undefined> {
        if (!this.redis) {
            this.initialize();
        }
        try {
            return await this.redis.del(key);
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    // Atomic increment
    static async atomicIncrement(key: string, count: number): Promise<number> {
        if (!this.redis) {
            this.initialize();
        }
        return this.redis.incrby(key, count);
    }

    // Set value if not exists (NX flag)
    static async setValueNx(key: string, value: any): Promise<number> {
        if (!this.redis) {
            this.initialize();
        }
        return this.redis.setnx(key, JSON.stringify(value));
    }

    // Remove all keys from redis (environment dependent)
    static async removeAll(): Promise<void> {
        if (!this.redis) {
            this.initialize();
        }
        if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
            const key = "*";
            const stream = this.redis.sscanStream(key);

            stream.on('data', (keys: string[]) => {
                if (keys.length) {
                    const pipeline = this.redis.pipeline();
                    keys.forEach((key) => pipeline.del(key));
                    pipeline.exec();
                }
            });

            stream.on('end', () => {
                console.info('Redis cleanup complete');
            });
        } else {
            const nodes = (this.redis as any).nodes('master');
            const scanNode = (nodeIndex: number) => {
                const node = nodes[nodeIndex];
                node.scanStream({ match: '*' })
                    .on('data', (keys: string[]) => {
                        if (keys.length) {
                            const pipeline = this.redis.pipeline();
                            keys.forEach((key) => pipeline.del(key));
                            pipeline.exec();
                        }
                    })
                    .on('end', () => {
                        console.info(`Scan complete for node ${node.options.host}:${node.options.port}`);
                        if (++nodeIndex < nodes.length) {
                            scanNode(nodeIndex);
                        } else {
                            console.info("Redis scan finished");
                            this.redis.quit();
                        }
                    });
                    console.info(`Scanning node ${node.options.host}:${node.options.port}`);
            };
            scanNode(0);
        }
    }
}