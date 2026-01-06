import { createClient, RedisClientType } from "redis";

/**
 * Redis cache service for feature flags
 * Provides in-memory caching with automatic expiration
 */
export class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private isEnabled: boolean = true;

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    // Check if caching is enabled
    const enableCache = process.env.ENABLE_CACHE !== "false";
    if (!enableCache) {
      console.log(
        "⚠️  Cache is disabled via ENABLE_CACHE environment variable"
      );
      this.isEnabled = false;
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error("❌ Redis: Max reconnection attempts reached");
              return new Error("Max reconnection attempts reached");
            }
            // Exponential backoff: 100ms, 200ms, 400ms, etc.
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Handle errors
      this.client.on("error", (error) => {
        console.error("Redis client error:", error.message);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("🔄 Connecting to Redis...");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis cache connected successfully");
        this.isConnected = true;
      });

      this.client.on("reconnecting", () => {
        console.log("🔄 Redis reconnecting...");
      });

      this.client.on("end", () => {
        console.log("Redis connection closed");
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error: any) {
      console.error("Failed to connect to Redis:", error.message);
      console.log("⚠️  Continuing without cache (database-only mode)");
      this.isEnabled = false;
      this.client = null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log("Disconnected from Redis");
      } catch (error: any) {
        console.error("Error disconnecting from Redis:", error.message);
      }
    }
  }

  /**
   * Get a value from cache
   * Returns null if key doesn't exist or cache is unavailable
   */
  async get(key: string): Promise<string | null> {
    if (!this.isEnabled || !this.client || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        console.log(`✅ Cache HIT: ${key}`);
      } else {
        console.log(`❌ Cache MISS: ${key}`);
      }
      return value;
    } catch (error: any) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return null; // Graceful degradation
    }
  }

  /**
   * Set a value in cache with TTL (time to live)
   * @param key Cache key
   * @param value Value to store (will be stringified if object)
   * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isEnabled || !this.client || !this.isConnected) {
      return;
    }

    try {
      const ttl =
        ttlSeconds || parseInt(process.env.CACHE_TTL_SECONDS || "300", 10);

      await this.client.setEx(key, ttl, value);
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error: any) {
      console.error(`Cache set error for key ${key}:`, error.message);
      // Graceful degradation - don't throw error
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isEnabled || !this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
      console.log(`🗑️  Cache DELETE: ${key}`);
    } catch (error: any) {
      console.error(`Cache delete error for key ${key}:`, error.message);
      // Graceful degradation - don't throw error
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * Useful for bulk invalidation
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled || !this.client || !this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `🗑️  Cache DELETE pattern: ${pattern} (${keys.length} keys)`
        );
      }
    } catch (error: any) {
      console.error(
        `Cache delete pattern error for ${pattern}:`,
        error.message
      );
      // Graceful degradation - don't throw error
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.isConnected && this.client !== null;
  }

  /**
   * Get cache statistics (for monitoring)
   */
  async getStats(): Promise<{ connected: boolean; enabled: boolean }> {
    return {
      connected: this.isConnected,
      enabled: this.isEnabled,
    };
  }
}
