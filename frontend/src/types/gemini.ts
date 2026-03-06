export interface GeminiItineraryItem {
  location: string;
  details: string;
  category: string;
  startTime: string;
  endTime: string;
  cost: number;
  multiDay: boolean;
}

export interface GeminiChatResponse {
  text: string;
  itinerary?: GeminiItineraryItem[];
  question?: string;
  error?: string;
  message?: string;
}

export interface GeminiRecommendedPlace {
  id: string;
  trip_id: string;
  place_name: string;
  place_category: string | null;
  start_time: string | null;
  end_time: string | null;
  cost: number;
  details: string | null;
  recommended_at: string;
  added_to_schedule: boolean;
}

export interface GeminiListPlace {
  id: string;
  trip_id: string;
  place_name: string;
  place_category: string | null;
  details: string | null;
  cost: number;
  added_to_schedule: boolean;
  recommended_at: string;
}
