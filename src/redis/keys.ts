export const keyGenAuthFns = {
  loginAttempts: (email: string) => `login_attempts:${email}`,
  loginIp: (ip_address: string) => `login_ip:${ip_address}`,
  forgotPasswordAttempts: (email: string) =>
    `forgot_password_attempts:${email}`,
  forgotIp: (ip_address: string) => `forgot_ip:${ip_address}`,
  twoFAIp: (ip_address: string) => `two_fa_ip:${ip_address}`,
  twoFAUser: (userId: string) => `two_fa_user:${userId}`,
}

export const keyGenUserFns = {
  userCache: (id: string) => `user:${id}`,
}

export const keyGenSessionFns = {
  session: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
    `session:${userId}:${sessionId}`,
  allUserSessions: (userId: string) => `session:${userId}:*`,
}