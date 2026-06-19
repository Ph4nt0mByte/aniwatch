const TMDB_TOKEN = (import.meta as any).env.VITE_TMDB_API_KEY as string;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const tmdbFetch = (url: string) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

export interface TMDBMovieOrTV {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
  };
  seasons?: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string;
  }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
  };
  recommendations?: {
    results: TMDBMovieOrTV[];
  };
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
}

export const tmdbApi = {
  getTrending: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/trending/all/day?language=en-US`);
    const data = await res.json();
    return (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
  },

  getPopularMovies: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/movie/popular?language=en-US`);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
  },

  getPopularTV: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/tv/popular?language=en-US`);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));
  },

  getTopRated: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/movie/top_rated?language=en-US`);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
  },

  searchMulti: async (query: string): Promise<TMDBMovieOrTV[]> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&language=en-US`);
    const data = await res.json();
    return (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
  },

  getDetails: async (id: string | number, type: 'movie' | 'tv'): Promise<TMDBDetails> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/${type}/${id}?append_to_response=credits,recommendations,external_ids&language=en-US`);
    const data = await res.json();
    return { ...data, media_type: type };
  },

  getSeasonEpisodes: async (id: string | number, seasonNum: number): Promise<TMDBEpisode[]> => {
    const res = await tmdbFetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNum}?language=en-US`);
    const data = await res.json();
    return data.episodes || [];
  },

  getImageUrl: (path: string | null, size: 'w500' | 'original' = 'w500'): string => {
    if (!path) return 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
};
