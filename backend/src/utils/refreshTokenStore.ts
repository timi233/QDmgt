// Refresh token存储（生产环境应使用Redis）
// 格式: { userId: { token: string, expiresAt: Date } }
const refreshTokens = new Map<string, { token: string; expiresAt: Date }>();

/**
 * 存储refresh token
 */
export function saveRefreshToken(userId: string, token: string, expiresAt: Date): void {
  refreshTokens.set(userId, { token, expiresAt });
}

/**
 * 验证refresh token
 */
export function validateRefreshToken(userId: string, token: string): boolean {
  const stored = refreshTokens.get(userId);

  if (!stored) {
    return false;
  }

  // 检查是否过期
  if (stored.expiresAt < new Date()) {
    refreshTokens.delete(userId);
    return false;
  }

  // 检查token是否匹配
  return stored.token === token;
}

/**
 * 撤销refresh token（登出时）
 */
export function revokeRefreshToken(userId: string): void {
  refreshTokens.delete(userId);
}

/**
 * 清理过期的refresh tokens（定期执行）
 */
export function cleanExpiredTokens(): void {
  const now = new Date();
  for (const [userId, data] of refreshTokens.entries()) {
    if (data.expiresAt < now) {
      refreshTokens.delete(userId);
    }
  }
}

// 每小时清理一次过期token
setInterval(cleanExpiredTokens, 60 * 60 * 1000);
