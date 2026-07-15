export type City = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  created_at: string;
  updated_at: string;
};

export type Place = {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  categories: string[];
  description: string;
  vetted: boolean;
  website: string | null;
  socials: Social[] | null;
  recommendations: string[] | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  locations?: PlaceLocation[];
  city?: City;
};

export type PlaceLocation = {
  id: string;
  place_id: string;
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
};

export type Social = {
  platform: string;
  url: string;
};

export type ImportSinglePayload = {
  city_slug?: string;
  name: string;
  /** Array of categories. Also accepts legacy single `category` string — normalized on import. */
  categories?: string[];
  category?: string;
  description?: string;
  vetted?: boolean;
  website?: string;
  socials?: Social[];
  recommendations?: string[];
  photos?: string[];
  locations: {
    address: string;
    lat: number;
    lng: number;
    notes?: string;
  }[];
};

export type ImportBulkPayload = {
  places: ImportSinglePayload[];
};

export const DEFAULT_CATEGORIES = ["food", "drink", "activity", "stays"] as const;
