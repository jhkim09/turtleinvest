// Simple in-memory cache for API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    
    return this.cache.size;
  }
}

export const apiCache = new ApiCache();

// Cache keys
export const CACHE_KEYS = {
  PLATFORM_STATS: 'platform-stats',
  COMPANIES: 'companies',
  COUNSELORS: 'counselors',
  PENDING_ASSIGNMENTS: 'pending-assignments',
  COUNSELOR_PAYMENTS: 'counselor-payments',
  DASHBOARD_DATA: 'dashboard-data'
} as const;

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  PLATFORM_STATS: 2 * 60 * 1000, // 2 minutes
  COMPANIES: 5 * 60 * 1000, // 5 minutes
  COUNSELORS: 10 * 60 * 1000, // 10 minutes
  PENDING_ASSIGNMENTS: 30 * 1000, // 30 seconds
  COUNSELOR_PAYMENTS: 5 * 60 * 1000, // 5 minutes
  DASHBOARD_DATA: 1 * 60 * 1000 // 1 minute
} as const;