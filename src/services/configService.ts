// configService.ts
// Fetches latest config from backend API

export async function fetchConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Failed to fetch config');
  return await response.json();
}
