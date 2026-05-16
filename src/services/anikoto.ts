const API_BASE = "/api/anikoto";
const CACHE_KEY = "anikoto_mal_map_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CacheData {
  map: Record<string, number>;
  timestamp: number;
}

let memCache: Record<string, number> | null = null;

async function buildMalIdMap(): Promise<Record<string, number>> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: CacheData = JSON.parse(raw);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        memCache = cached.map;
        return cached.map;
      }
    }
  } catch {}

  const res = await fetch(`${API_BASE}/recent-anime?page=1&per_page=9000`);
  const data = await res.json();

  const map: Record<string, number> = {};
  if (data.ok && Array.isArray(data.data)) {
    for (const anime of data.data) {
      if (anime.mal_id && anime.id) {
        map[String(anime.mal_id)] = Number(anime.id);
      }
    }
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ map, timestamp: Date.now() }));
  } catch {}

  memCache = map;
  return map;
}

export async function getAnikotoId(malId: string | number): Promise<number | null> {
  const map = memCache ?? (await buildMalIdMap());
  return map[String(malId)] ?? null;
}

export interface AnikotoEpisode {
  id: number;
  number: number;
  title: string;
  embed_url: { sub?: string; dub?: string };
}

export async function getAnikotoEpisodes(anikotoId: number): Promise<AnikotoEpisode[]> {
  const res = await fetch(`${API_BASE}/series/${anikotoId}`);
  const data = await res.json();
  if (data.ok && Array.isArray(data.data?.episodes)) {
    return data.data.episodes.map((ep: any) => ({
      id: ep.id,
      number: ep.number,
      title: ep.title ?? `Episode ${ep.number}`,
      embed_url: ep.embed_url ?? {},
    }));
  }
  return [];
}

export async function getEpisodeEmbedUrl(
  malId: string | number,
  episodeNumber: number
): Promise<{ sub?: string; dub?: string; anikotoId?: number } | null> {
  const anikotoId = await getAnikotoId(malId);
  if (!anikotoId) return null;

  const episodes = await getAnikotoEpisodes(anikotoId);
  const episode =
    episodes.find((e) => e.number === episodeNumber) ??
    episodes[episodeNumber - 1];

  if (!episode) return null;
  return { ...episode.embed_url, anikotoId };
}
