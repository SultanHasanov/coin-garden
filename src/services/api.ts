const BASE = 'https://0c939a24aebcdd19.mokky.dev'

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface PlayerRecord {
  id: number
  telegramId: number
  name: string
  state: Record<string, unknown>
}

export interface MarketListing {
  id: number
  sellerId: number
  sellerName: string
  treeId: string
  treeName: string
  treeEmoji: string
  count: number
  priceRubles: number
  enhancementLevel: number
  createdAt: number
}

// ─── Утилита ─────────────────────────────────────────────────────────────────

async function req<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init)
    if (!res.ok) return null
    // DELETE может вернуть пустое тело
    const text = await res.text()
    return text ? (JSON.parse(text) as T) : (null as T)
  } catch {
    return null
  }
}

// ─── Игроки (/items) ─────────────────────────────────────────────────────────

export async function getPlayer(telegramId: number): Promise<PlayerRecord | null> {
  const data = await req<PlayerRecord[]>(`${BASE}/items?telegramId=${telegramId}`)
  return data?.[0] ?? null
}

export async function createPlayer(
  telegramId: number,
  name: string,
  state: Record<string, unknown>,
): Promise<PlayerRecord | null> {
  return req<PlayerRecord>(`${BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, name, state }),
  })
}

export async function patchPlayer(
  id: number,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const res = await req<PlayerRecord>(`${BASE}/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return res !== null
}

/** Зачисляет рубли продавцу, обновляя его запись в API */
export async function creditSellerRubles(sellerId: number, amount: number): Promise<void> {
  const seller = await getPlayer(sellerId)
  if (!seller) return
  const newRubles = ((seller.state.rubles as number) ?? 0) + amount
  await patchPlayer(seller.id, { state: { ...seller.state, rubles: newRubles } })
}

// ─── Рынок (/market) ─────────────────────────────────────────────────────────

export async function getListings(): Promise<MarketListing[]> {
  return (await req<MarketListing[]>(`${BASE}/market`)) ?? []
}

export async function postListing(
  listing: Omit<MarketListing, 'id'>,
): Promise<MarketListing | null> {
  return req<MarketListing>(`${BASE}/market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listing),
  })
}

export async function deleteListing(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/market/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}
