export function isCronRequestAuthorized(authorization: string | null, secret: string | undefined) {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}
