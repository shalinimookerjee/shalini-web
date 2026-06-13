import data from "@/data/movies.json";

export type Movie = {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  director: string | null;
  poster: string | null;
  rating: number | null;
  watchedDate: string | null;
  review: string | null;
  tags: string | null;
  tmdbId: number | null;
  letterboxdUri: string;
};

export const movies: Movie[] = data as Movie[];
