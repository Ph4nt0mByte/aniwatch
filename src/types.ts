export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  images: {
    webp: {
      image_url: string;
      large_image_url: string;
    };
  };
  synopsis: string;
  type: string;
  episodes: number;
  duration: string;
  score: number;
  status: string;
  rating: string;
  genres: { name: string }[];
  year?: number;
  studios?: { name: string }[];
}

export interface Episode {
  mal_id: number;
  title: string;
  episode_id: number;
  title_japanese: string;
  filler: boolean;
  recap: boolean;
  aired: string;
}

export interface WatchHistoryItem {
  animeId: string;
  title: string;
  poster: string;
  episodeNumber: number;
  progress: number;
  duration: number;
  updatedAt: any; // Using any for Firestore Timestamp compatibility
}
