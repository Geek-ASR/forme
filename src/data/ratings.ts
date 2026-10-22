// Ratings: rate anything. Default categories below; your own categories live in private settings.

import type { RatingCat } from '../lib/types'

export const DEFAULT_RATING_CATS: RatingCat[] = [
  { id: 'movies', label: 'Movies', emoji: '🎬', by: 'Director', where: 'Watched on', doing: 'Watching', want: 'Watchlist' },
  { id: 'series', label: 'TV series', emoji: '📺', by: 'Created by', where: 'Platform', doing: 'Watching', want: 'Watchlist' },
  { id: 'anime', label: 'Anime', emoji: '🍥', by: 'Studio', where: 'Platform', doing: 'Watching', want: 'Watchlist' },
  { id: 'books', label: 'Books', emoji: '📚', by: 'Author', where: 'Format', doing: 'Reading', want: 'To read' },
  { id: 'music', label: 'Music', emoji: '🎧', by: 'Artist', where: 'Album', doing: 'On repeat', want: 'To listen' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤', by: 'Brand', where: 'Where', want: 'To try' },
  { id: 'chocolates', label: 'Chocolates', emoji: '🍫', by: 'Brand', where: 'Bought at', want: 'To try' },
  { id: 'food', label: 'Food & restaurants', emoji: '🍛', by: 'Restaurant', where: 'City', want: 'To try' },
  { id: 'cafes', label: 'Cafés', emoji: '☕', by: 'Café', where: 'City', want: 'To visit' },
  { id: 'places', label: 'Places', emoji: '🗺️', by: 'Country', where: 'City / area', want: 'Bucket list' },
  { id: 'games', label: 'Games', emoji: '🎮', by: 'Studio', where: 'Platform', doing: 'Playing', want: 'To play' },
  { id: 'podcasts', label: 'Podcasts & YouTube', emoji: '🎙️', by: 'Host / channel', where: 'Platform', doing: 'Following', want: 'To check out' },
  { id: 'products', label: 'Products', emoji: '🛍️', by: 'Brand', where: 'Bought from', want: 'Wishlist' },
]

export const STAR_WORD: Record<string, string> = {
  '0.5': 'Awful',
  '1': 'Bad',
  '1.5': 'Poor',
  '2': 'Meh',
  '2.5': 'Okay',
  '3': 'Good',
  '3.5': 'Really good',
  '4': 'Great',
  '4.5': 'Amazing',
  '5': 'All-time favourite',
}

export const PRICE_CATS = new Set(['drinks', 'chocolates', 'food', 'cafes', 'products'])
export const YEAR_CATS = new Set(['movies', 'series', 'anime', 'books', 'music', 'games'])

export const TITLE_HINT: Record<string, string> = {
  movies: 'Movie title',
  series: 'Series title',
  anime: 'Anime title',
  books: 'Book title',
  music: 'Song or album',
  drinks: 'What did you drink?',
  chocolates: 'Which chocolate?',
  food: 'Dish or restaurant',
  cafes: 'Café name',
  places: 'Place',
  games: 'Game',
  podcasts: 'Podcast or channel',
  products: 'Product',
}
