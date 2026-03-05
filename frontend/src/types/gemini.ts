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
  error?: string;
  message?: string;
}

export interface GeminiRecommendedPlace {
  id: string;
  trip_id: string;
  place_name: string;
  place_category: string | null;
  recommended_at: string;
  added_to_schedule: boolean;
}
