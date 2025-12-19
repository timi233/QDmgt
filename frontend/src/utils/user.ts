interface UserLike {
  username?: string
  name?: string
  deletedAt?: string | null
}

export const formatUserName = (user?: UserLike | null, fallback = '未指派'): string => {
  if (!user) return fallback
  const displayName = user.name || user.username || fallback
  return user.deletedAt ? `${displayName} (账户已注销)` : displayName
}
