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
}

export interface TripList {
  id: string;
  value: string;
  from_google: string | null;
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
  is_friend: boolean;
  is_pending: boolean;
  friends_count?: number;
  upcoming_trips?: UserPublicTrip[];
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
  friends_count: number;
}

export interface UserSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
}

export interface FollowUser {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
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

export interface UsernameQuery extends Query {
  username?: string;
}

declare global {
  namespace Express {
    interface Request {
      user: { id: string; role?: string };
    }
  }
}

export {};
