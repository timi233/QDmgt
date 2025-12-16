import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null
let redisEnabled = process.env.REDIS_ENABLED !== 'false'

/**
 * Get Redis client instance
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!redisEnabled) {
    return null
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    })

    redisClient.on('error', (_error) => {
      console.log('[Redis] Disabled due to connection error')
      redisEnabled = false
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected')
    })

    redisClient.on('disconnect', () => {
      console.log('[Redis] Disconnected')
    })

    await redisClient.connect()
    return redisClient
  } catch (error) {
    console.log('[Redis] Failed to connect, running without cache')
    redisEnabled = false
    return null
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit()
    redisClient = null
    console.log('[Redis] Connection closed')
  }
}

/**
 * Set value in Redis with optional TTL
 */
export async function setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
  const client = await getRedisClient()
  if (!client) return // Skip if Redis not available

  const serialized = JSON.stringify(value)

  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, serialized)
  } else {
    await client.set(key, serialized)
  }
}

/**
 * Get value from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = await getRedisClient()
  if (!client) return null // Return null if Redis not available

  const value = await client.get(key)

  if (!value) {
    return null
  }

  return JSON.parse(value) as T
}

/**
 * Delete key from Redis
 */
export async function deleteCache(key: string): Promise<void> {
  const client = await getRedisClient()
  if (!client) return // Skip if Redis not available
  await client.del(key)
}

/**
 * Check if key exists in Redis
 */
export async function cacheExists(key: string): Promise<boolean> {
  const client = await getRedisClient()
  if (!client) return false // Return false if Redis not available
  const exists = await client.exists(key)
  return exists === 1
}

/**
 * Get remaining TTL for a key
 */
export async function getCacheTTL(key: string): Promise<number> {
  const client = await getRedisClient()
  if (!client) return -1 // Return -1 if Redis not available
  return await client.ttl(key)
}

// Cache key constants
export const CACHE_KEYS = {
  DASHBOARD_KPI: 'dashboard:kpi',
  DASHBOARD_REGION_STATS: 'dashboard:region_stats',
  DASHBOARD_COOPERATION_STATS: 'dashboard:cooperation_stats',
  DASHBOARD_USER_STATS: (userId: string) => `dashboard:user_stats:${userId}`,
  DASHBOARD_TASK_STATS: 'dashboard:task_stats',
}

// Default TTL: 5 minutes
export const DEFAULT_CACHE_TTL = 300
