const JIKAN_API_URL = 'https://api.jikan.moe/v4';

export const jikanApi = {
  getTopAnime: () => fetch(`${JIKAN_API_URL}/top/anime`).then(res => res.json()),
  getSeasonNow: () => fetch(`${JIKAN_API_URL}/seasons/now`).then(res => res.json()),
  getAiring: () => fetch(`${JIKAN_API_URL}/anime?status=airing`).then(res => res.json()),
  getUpcoming: () => fetch(`${JIKAN_API_URL}/anime?status=upcoming`).then(res => res.json()),
  searchAnime: (query: string) => fetch(`${JIKAN_API_URL}/anime?q=${query}`).then(res => res.json()),
  getAnimeById: (id: string | number) => fetch(`${JIKAN_API_URL}/anime/${id}/full`).then(res => res.json()),
  getEpisodes: (id: string | number) => fetch(`${JIKAN_API_URL}/anime/${id}/episodes`).then(res => res.json()),
  getRecommendations: (id: string | number) => fetch(`${JIKAN_API_URL}/anime/${id}/recommendations`).then(res => res.json()),
  getRelations: (id: string | number) => fetch(`${JIKAN_API_URL}/anime/${id}/relations`).then(res => res.json()),
};
