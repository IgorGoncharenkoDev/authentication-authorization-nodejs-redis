export const keyGenerationFns = {
  loginAttempts: (email: string) => `login_attempts:${email}`,
  loginIp: (ip_address: string) => `login_ip:${ip_address}`,
  forgotPasswordAttempts: (email: string) =>
    `forgot_password_attempts:${email}`,
  forgotIp: (ip_address: string) => `forgot_ip:${ip_address}`,
  twoFAIp: (ip_address: string) => `two_fa_ip:${ip_address}`,
  twoFAUser: (userId: string) => `two_fa_user:${userId}`,
  userCache: (id: string) => `user:${id}`,
  session: (id: string) => `session:${id}`,
}