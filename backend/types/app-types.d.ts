import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { ParamsDictionary, Query } from "express-serve-static-core";

export interface MyPayload {
  id: string;
  role?: string;
}

export interface PgError extends Error {
  code?: string;
}

export interface CustomJwtPayload extends JwtPayload {
  jti?: string;
  sub?: string;
  exp?: number;
}

export type TypedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams extends ParamsDictionary = ParamsDictionary,
> = Request<TParams, unknown, TBody, TQuery>;

export type TypedResponse<TResBody = unknown> = Response<TResBody>;

export interface MessageResponse {
  message: string;
}

export interface Trip {
  id: string;
  trip_name: string;
  location: string;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  last_modified: Date;
  g_id: string;
  g_vp: Viewport;
}

export interface Schedule {
  id: string;
  trip_id: string;
  location: string;
  details: string;
  start_time: Date;
  end_time: Date;
  cost: number;
  multi_day: boolean;
  sort_index: number;
  last_modified: string;
  is_locked: boolean;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  show_on_map: boolean;
}

export interface TripList {
  id: string;
  value: string;
  from_google: string | null;
  details: string | null;
  created_at: Date;
  item_added: boolean;
  trip_id: string;
  last_modified: Date;
}

export interface SignUpBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
}

export interface LoginBody {
  email?: string;
  password?: string;
}

export interface ResendVerificationBody {
  email?: string;
}

export interface ResetPasswordLinkBody {
  email?: string;
}

export interface ResetPasswordBody {
  password?: string;
  token?: string;
}

export interface VerifyQuery extends Query {
  token?: string;
}

export interface ResetPasswordQuery extends Query {
  token?: string;
}

export interface AuthResponse {
  message?: string;
  token?: string;
  error?: string;
  email?: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
  created_at?: Date;
}

export interface UnverifiedUser {
  id: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  username: string;
  token: string;
  created_at?: Date;
  expires_at: Date;
  last_email_sent_at: Date;
}

export interface RefreshTokenRow {
  id: number;
  user_id: string;
  jti: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
  device_info?: string;
}

export interface PasswordResetRow {
  id: string;
  email: string;
  token: string;
  expires_at: Date;
}

// Vacation Types
export interface AddVacationBody {
  tripname: string;
  location: string;
  startDate: string;
  endDate: string;
  gId: string;
  gVp: Viewport;
  id?: string;
  skipEO?: boolean;
  isPublic?: boolean;
  isOpenInvite?: boolean;
}

export interface UserPublicTrip {
  trip_name: string;
  location: string;
  start_date: string;
  num_days: number;
  is_open_invite: boolean;
}

export interface UserProfileResponse {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
  is_friend: boolean;
  is_pending: boolean;
  upcoming_trips?: UserPublicTrip[];
  travel_log?: UserCountry[];
}

export interface AddVacationResponse {
  message?: string;
  gId?: string;
  gLocation?: string;
  gVp?: Viewport;
  is_public?: boolean;
}

export interface Chunk {
  above?: { id: string; sortIndex: number };
  below?: { id: string; sortIndex: number };
}

export interface ScheduleBody {
  chunk: Chunk;
  start: string;
  end: string;
  location: string;
  cost: string | number;
  details: string;
  multiDay?: boolean;
  id?: string;
  tripId?: string;
  lastModified?: string;
  skipEO?: boolean;
}

export interface TripWithSchedule extends Trip {
  role?: string;
  schedule: Schedule[];
  countryName?: string;
}

export interface CountryInfoResponse {
  countryName: string;
  population: number;
  geography: number;
  info: string;
  language: string;
  currency: string;
  happinessRank: number | null;
}

export interface ScheduleResponse {
  role?: string;
  schedule?: Schedule[];
  addedItem?: Schedule;
  newlyIndexedSchedule?: Schedule[];
  message?: string;
  updatedData?: Schedule;
  deletedData?: Schedule;
  deletedId?: string;
  queryComplete?: string;
  newData?: Schedule[] | TripList[];
}

export interface ListBody {
  value: string;
  fromGoogle?: string;
  details?: string | null;
  newValue?: boolean;
  isGoogleId?: boolean;
  tripId?: string;
  lastModified?: string;
  skipEO?: boolean;
}

export interface ListResponse {
  data?: TripList | TripList[];
  deletedData?: TripList[];
  message?: string;
  newData?: Schedule[] | TripList[];
}

export interface OwnershipBody {
  skipEO?: boolean;
  tripId?: string;
}

export interface StateAwareBody {
  lastModified?: string;
  tripId?: string;
}

export interface CamelCaseRow {
  lastModified?: string | Date;
  tripId?: string;
}

export interface ConflictResponse {
  message: string;
  newData: Schedule[] | TripList[];
}

export interface Viewport {
  south: number;
  west: number;
  north: number;
  east: number;
  low?: { latitude: number; longitude: number };
  high?: { latitude: number; longitude: number };
}

export interface MapBody {
  nextPageToken?: string;
  placeType: string;
  locationName: string;
  ratingFilter?: number;
  viewport: Viewport;
  reviewFilter?: number;
  skipEO?: boolean;
}

export interface Place {
  id: string;
  displayName: { text: string; languageCode: string };
  location: { latitude: number; longitude: number };
  shortFormattedAddress: string;
  primaryType: string;
  types: string[];
  rating?: number;
  userRatingCount: number;
}

export interface MapResponse {
  places: Place[];
  nextPageToken?: string;
}

export interface TextSearchResponse {
  places: Place[];
  nextPageToken?: string;
}

export interface CheckListItemBody {
  newValue: boolean;
}

export interface DeleteListBody {
  isGoogleId?: boolean;
}

export interface AutocompleteBody {
  query: string;
  skipEO?: boolean;
}

export interface AutocompleteResponse {
  suggestions: Array<{
    placePrediction: {
      place: string;
      placeId: string;
      text: { text: string };
    };
  }>;
}

export interface DetailsResponse {
  viewport: Viewport;
}

export interface ResolveCoordinatesBody {
  itemIds: string[];
}

export interface ResolveCoordinatesResponse {
  resolved: Array<{ id: string; latitude: number; longitude: number; placeId: string | null }>;
  failed: string[];
}

export interface PlaceCoordinatesRow {
  place_id: string;
  latitude: number;
  longitude: number;
  created_at: Date;
}

export interface PlaceDetailsRow {
  place_id: string;
  display_name: { text: string; languageCode: string } | null;
  formatted_address: string | null;
  short_formatted_address: string | null;
  location: { latitude: number; longitude: number } | null;
  primary_type: string | null;
  primary_type_display_name: { text: string; languageCode: string } | null;
  types: string[] | null;
  google_maps_uri: string | null;
  google_maps_links: Record<string, string> | null;
  business_status: string | null;
  icon_mask_base_uri: string | null;
  icon_background_color: string | null;
  photos: Array<Record<string, unknown>> | null;
  viewport: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } } | null;
  address_components: Array<Record<string, unknown>> | null;
  postal_address: Record<string, unknown> | null;
  adr_format_address: string | null;
  plus_code: Record<string, unknown> | null;
  time_zone: Record<string, unknown> | null;
  utc_offset_minutes: number | null;
  sub_destinations: Array<Record<string, unknown>> | null;
  containing_places: Array<Record<string, unknown>> | null;
  accessibility_options: Record<string, unknown> | null;
  rating: number | null;
  user_rating_count: number | null;
  price_level: string | null;
  price_range: Record<string, unknown> | null;
  website_uri: string | null;
  international_phone_number: string | null;
  national_phone_number: string | null;
  regular_opening_hours: Record<string, unknown> | null;
  current_opening_hours: Record<string, unknown> | null;
  editorial_summary: { text: string; languageCode: string } | null;
  reviews: Array<Record<string, unknown>> | null;
  dine_in: boolean | null;
  takeout: boolean | null;
  delivery: boolean | null;
  curbside_pickup: boolean | null;
  reservable: boolean | null;
  serves_breakfast: boolean | null;
  serves_brunch: boolean | null;
  serves_lunch: boolean | null;
  serves_dinner: boolean | null;
  serves_beer: boolean | null;
  serves_wine: boolean | null;
  serves_cocktails: boolean | null;
  serves_coffee: boolean | null;
  serves_dessert: boolean | null;
  serves_vegetarian_food: boolean | null;
  outdoor_seating: boolean | null;
  live_music: boolean | null;
  good_for_children: boolean | null;
  good_for_groups: boolean | null;
  good_for_watching_sports: boolean | null;
  allows_dogs: boolean | null;
  restroom: boolean | null;
  parking_options: Record<string, unknown> | null;
  payment_options: Record<string, unknown> | null;
  menu_for_children: boolean | null;
  generative_summary: Record<string, unknown> | null;
  neighborhood_summary: Record<string, unknown> | null;
  review_summary: Record<string, unknown> | null;
  created_at: Date;
}

export interface FullPlaceApiResponse {
  id: string;
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string; languageCode: string };
  types?: string[];
  googleMapsUri?: string;
  googleMapsLinks?: Record<string, string>;
  businessStatus?: string;
  iconMaskBaseUri?: string;
  iconBackgroundColor?: string;
  photos?: Array<Record<string, unknown>>;
  viewport?: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } };
  addressComponents?: Array<Record<string, unknown>>;
  postalAddress?: Record<string, unknown>;
  adrFormatAddress?: string;
  plusCode?: Record<string, unknown>;
  timeZone?: Record<string, unknown>;
  utcOffsetMinutes?: number;
  subDestinations?: Array<Record<string, unknown>>;
  containingPlaces?: Array<Record<string, unknown>>;
  accessibilityOptions?: Record<string, unknown>;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: Record<string, unknown>;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: Record<string, unknown>;
  currentOpeningHours?: Record<string, unknown>;
  editorialSummary?: { text: string; languageCode: string };
  reviews?: Array<Record<string, unknown>>;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  curbsidePickup?: boolean;
  reservable?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesCocktails?: boolean;
  servesCoffee?: boolean;
  servesDessert?: boolean;
  servesVegetarianFood?: boolean;
  outdoorSeating?: boolean;
  liveMusic?: boolean;
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  goodForWatchingSports?: boolean;
  allowsDogs?: boolean;
  restroom?: boolean;
  parkingOptions?: Record<string, unknown>;
  paymentOptions?: Record<string, unknown>;
  menuForChildren?: boolean;
  generativeSummary?: Record<string, unknown>;
  neighborhoodSummary?: Record<string, unknown>;
  reviewSummary?: Record<string, unknown>;
}

export interface FullTextSearchResponse {
  places: FullPlaceApiResponse[];
  nextPageToken?: string;
}

export interface IdOnlyTextSearchResponse {
  places: Array<{ id: string }>;
  nextPageToken?: string;
}

export interface TripIdParam extends ParamsDictionary {
  tripId: string;
}

export interface IdParam extends ParamsDictionary {
  id: string;
}

export interface ItemIdParam extends ParamsDictionary {
  itemId: string;
}

export interface UserIdParam extends ParamsDictionary {
  userId: string;
}

export interface NotificationIdParam extends ParamsDictionary {
  id: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
  friends_count: number;
}

export interface UserSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
}

export interface FollowUser {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
  follow_id: string;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  from_first_name: string;
  from_last_name: string;
  from_username: string;
  type: string;
  reference_id: string;
  is_read: boolean;
  status: string;
  created_at: Date;
  trip_name?: string;
}

export interface NotificationActionBody {
  action: "accepted" | "declined";
}

export interface ShareTripBody {
  shares: { userId: string; role: "editor" | "reader" }[];
}

export interface UpdateShareBody {
  role: "editor" | "reader";
}

export interface TripShare {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
}

export interface SearchQuery extends Query {
  q?: string;
}

export interface Country {
  id: number;
  name: string;
  continent: string;
}

export interface UserCountry {
  id: string;
  country_id: number;
  country_name: string;
  continent: string;
  visibility: "public" | "friends" | "private";
  visit_date: string | null;
  num_days: number | null;
  times_visited: number;
  is_native: boolean;
}

export interface UserCountryTrip {
  id: string;
  user_country_id: string;
  trip_number: number;
  visit_date: string | null;
  num_days: number | null;
  created_at: Date;
}

export interface TravelLogResponse {
  countries: UserCountry[];
}

export interface AddCountryBody {
  countryId: number;
  visitDate?: string;
  numDays?: number;
  isNative?: boolean;
  timesVisited?: number;
  trips?: { visitDate?: string; numDays?: number }[];
}

export interface UpdateVisibilityBody {
  visibility?: "public" | "friends" | "private";
  visitDate?: string | null;
  numDays?: number | null;
  isNative?: boolean;
  timesVisited?: string;
}

export interface AddTripBody {
  visitDate?: string;
  numDays?: number;
}

export interface UpdateTripBody {
  visitDate?: string | null;
  numDays?: number | null;
}

export interface CountryTripIdParam extends ParamsDictionary {
  tripId: string;
}

export interface CountryIdParam extends ParamsDictionary {
  countryId: string;
}

export interface UserCountryIdParam extends ParamsDictionary {
  userCountryId: string;
}

export interface PlaceIdParam extends ParamsDictionary {
  placeId: string;
}

export interface CountryPlace {
  id: string;
  user_country_id: string;
  category: "city" | "eat" | "stay" | "excursion";
  name: string;
  is_favorite: boolean;
  is_puke: boolean;
  note: string | null;
  sort_index: number;
  city_id: string | null;
  created_at: Date;
}

export interface AddPlaceBody {
  category: "city" | "eat" | "stay" | "excursion";
  name: string;
  cityId?: string;
}

export interface UpdatePlaceBody {
  isFavorite?: boolean;
  isPuke?: boolean;
  note?: string | null;
  name?: string;
  cityId?: string | null;
}

export interface CountryDetailResponse {
  userCountry: UserCountry & { user_id: string; first_name: string; last_name: string };
  places: CountryPlace[];
  trips: UserCountryTrip[];
  isOwner: boolean;
}

export interface UsernameQuery extends Query {
  username?: string;
}

export interface FeedTrip {
  id: string;
  trip_name: string;
  location: string;
  start_date: string;
  end_date: string;
  is_public: boolean;
  is_open_invite: boolean;
  owner_id: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_username: string;
  owner_avatar: string | null;
  my_role: string | null;
}

export interface FeedTravelLog {
  id: string;
  country_name: string;
  created_at: string;
  visibility: string;
  user_id: string;
  user_first_name: string;
  user_last_name: string;
  user_username: string;
  user_avatar: string | null;
  days_ago: number;
}

export interface FriendsFeedResponse {
  trips: FeedTrip[];
  travelLogs: FeedTravelLog[];
}

export interface FriendCountryLog {
  user_country_id: string;
  visit_date: string | null;
  num_days: number | null;
  times_visited: number;
  is_native: boolean;
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  places_count: number;
  cities: string[];
}

export interface FriendCountryLogsResponse {
  friends: FriendCountryLog[];
}

export interface CountryNameParam extends ParamsDictionary {
  countryName: string;
}

export interface QuestionnaireRow {
  id: string;
  trip_id: string;
  notes: string | null;
  created_at: Date;
  last_modified: Date;
}

export interface GoogleTokenRow {
  id: number;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TokenExchangeBody {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface AiChatBody {
  tripId: string;
  prompt?: string;
  mode?: "schedule" | "list" | null;
  categories?: string[];
  previousResponse?: string;
  fillInTheRest?: boolean;
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

export interface AiItineraryItem {
  location: string;
  details: string;
  category: string;
  startTime: string;
  endTime: string;
  cost: number;
  multiDay: boolean;
}

export interface AiRecommendedPlace {
  id: string;
  trip_id: string;
  place_name: string;
  place_category: string | null;
  start_time: Date | null;
  end_time: Date | null;
  cost: number;
  details: string | null;
  recommended_at: Date;
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
  recommended_at: Date;
}

export interface AiStatusResponse {
  connected: boolean;
}

export interface QuestionnaireBody {
  notes?: string;
}

export interface QuestionnaireResponse {
  questionnaire?: QuestionnaireRow;
  message?: string;
}

declare global {
  namespace Express {
    interface Request {
      user: { id: string; role?: string };
    }
  }
}

export {};
