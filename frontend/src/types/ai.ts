export interface AiItineraryItem {
  location: string;
  details: string;
  category: string;
  startTime: string;
  endTime: string;
  cost: number;
  multiDay: boolean;
}

export interface AiAction {
  symbol: "+ADD" | "~REPLACE" | "-REMOVE" | "?SUGGEST" | ">TEXT";
  data: Record<string, unknown>;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GroundingData {
  searchEntryPoint?: string;
  mapsSources?: GroundingSource[];
  webSources?: GroundingSource[];
}

export interface AiChatResponse {
  text: string;
  itinerary?: AiItineraryItem[];
  actions?: AiAction[];
  rawModelResponse?: string;
  exhaustedCategories?: string[];
  error?: string;
  message?: string;
  scheduleUpdated?: boolean;
  grounding?: GroundingData;
}

export interface AiRecommendedPlace {
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

export interface AiListPlace {
  id: string;
  trip_id: string;
  place_name: string;
  place_category: string | null;
  details: string | null;
  cost: number;
  added_to_schedule: boolean;
  recommended_at: string;
}
