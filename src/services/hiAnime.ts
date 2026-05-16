const API_BASE = "https://hianime-clone-kappa.vercel.app/api";

const fetchWithTimeout = (url: string, timeout = 12000): Promise<Response> =>
  Promise.race([
    fetch(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout)
    ),
  ]);

export interface StreamTrack {
  kind: string;
  label: string;
  file: string;
  default?: boolean;
}

export interface StreamSource {
  link: { file: string; type: string };
  tracks?: StreamTrack[];
}

export interface StreamResult {
  success: boolean;
  source?: StreamSource;
  allSources?: StreamSource[];
  tracks?: StreamTrack[];
  error?: string;
}

export interface HiAnimeEpisode {
  episodeId: string;
  number: number;
  title: string;
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function searchHiAnime(title: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/search?q=${encodeURIComponent(title)}`
    );
    const data = await res.json();
    if (data.success && Array.isArray(data.results) && data.results.length > 0) {
      return data.results[0].id ?? data.results[0].animeId ?? null;
    }
  } catch (e) {
    console.warn("HiAnime search failed:", e);
  }
  return null;
}

export async function getHiAnimeEpisodes(
  hiAnimeId: string
): Promise<HiAnimeEpisode[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/episodes/${hiAnimeId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.results) && data.results.length > 0) {
      return data.results.map((ep: any) => ({
        episodeId: String(ep.episodeId ?? ep.id ?? ep.episode_id ?? ""),
        number: ep.number ?? ep.episodeNo ?? 0,
        title: ep.title ?? ep.name ?? `Episode ${ep.number ?? ""}`,
      }));
    }
  } catch (e) {
    console.warn("HiAnime episodes failed:", e);
  }
  return [];
}

async function tryStream(
  hiAnimeId: string,
  episodeId: string,
  server: string,
  type: string
): Promise<StreamResult> {
  const params = new URLSearchParams({
    id: `${hiAnimeId}?ep=${episodeId}`,
    server,
    type,
  });
  try {
    const res = await fetchWithTimeout(`${API_BASE}/stream?${params}`, 15000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (
      data.success &&
      Array.isArray(data.results?.streamingLink) &&
      data.results.streamingLink.length > 0
    ) {
      const validSource = data.results.streamingLink.find(
        (s: any) => s?.link?.file
      );
      if (validSource) {
        return {
          success: true,
          source: validSource,
          allSources: data.results.streamingLink,
          tracks: validSource.tracks ?? [],
        };
      }
    }
    throw new Error("No streaming link found");
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function loadEpisodeStream(
  hiAnimeId: string,
  episodeId: string
): Promise<StreamResult> {
  const servers = ["hd-1", "hd-2", "backup"];
  const types = ["sub", "dub"];

  for (const type of types) {
    for (const server of servers) {
      const result = await tryStream(hiAnimeId, episodeId, server, type);
      if (result.success) return result;
    }
  }

  return { success: false, error: "All sources exhausted" };
}

export async function resolveHiAnimeId(
  title: string,
  titleEnglish?: string
): Promise<string | null> {
  const queries = [titleEnglish, title].filter(Boolean) as string[];
  for (const q of queries) {
    const found = await searchHiAnime(q);
    if (found) return found;
  }
  return null;
}
