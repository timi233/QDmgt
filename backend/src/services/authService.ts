import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = 10
const JWT_SECRET: jwt.Secret =
  process.env.JWT_SECRET || 'your-jwt-secret-change-in-production'
// Access token过期时间8小时（适合工作日使用）
const ACCESS_TOKEN_EXPIRES_IN = '8h'
// Refresh token过期时间为7天
const REFRESH_TOKEN_EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  username: string
  email: string
  role: string
}

/**
 * Hash password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare password with hash
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns True if password matches
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate access token (short-lived)
 * @param payload - User information to encode
 * @returns Access token string
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

/**
 * Generate refresh token (long-lived)
 * @param payload - User information to encode
 * @returns Refresh token string
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  )
}

/**
 * Verify JWT token
 * @param token - JWT token string
 * @returns Decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    }
    throw error
  }
}
