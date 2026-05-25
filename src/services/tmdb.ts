const TMDB_API_KEY = '1a6693362184f321885b871d2405489f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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
    const res = await fetch(`${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
  },

  getPopularMovies: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
  },

  getPopularTV: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));
  },

  getTopRated: async (): Promise<TMDBMovieOrTV[]> => {
    const res = await fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
  },

  searchMulti: async (query: string): Promise<TMDBMovieOrTV[]> => {
    const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return (data.results || []).filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
  },

  getDetails: async (id: string | number, type: 'movie' | 'tv'): Promise<TMDBDetails> => {
    const res = await fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,recommendations`);
    const data = await res.json();
    return { ...data, media_type: type };
  },

  getSeasonEpisodes: async (id: string | number, seasonNum: number): Promise<TMDBEpisode[]> => {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return data.episodes || [];
  },

  getImageUrl: (path: string | null, size: 'w500' | 'original' = 'w500'): string => {
    if (!path) return 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=500';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
};
