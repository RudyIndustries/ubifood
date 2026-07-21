export type RestaurantStatus = "pending" | "approved" | "blocked";

export type RestaurantTheme = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  notebook_style: string;
  cover_image_url?: string | null;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RescueDeal = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  original_price: number | null;
  rescue_price: number;
  quantity_available: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  phone: string | null;
  address: string;
  zone: string;
  latitude: number;
  longitude: number;
  price_level: number;
  opening_hours: Record<string, string>;
  status: RestaurantStatus;
  cover_url: string | null;
  created_at: string;
  restaurant_theme?: RestaurantTheme | null;
};

export type AdminRestaurant = Restaurant & {
  profiles:
    | {
        email: string;
        full_name: string | null;
      }
    | null
    | Array<{
        email: string;
        full_name: string | null;
      }>;
};
