export function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}
