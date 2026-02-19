export {};

import type { UniqueIdentifier } from "@dnd-kit/core";

declare global {
  // ─── API Response Types ─────────────────────────────────────────────
  // Typed contracts between frontend and backend.
  // Field names reflect camelCase (post-snakeToCamel) unless noted.

  /** GET /home — trips come back in snake_case (no snakeToCamel on this route) */
  interface HomeTrip {
    id: string;
    trip_name: string;
    location: string;
    start_date: string;
    end_date: string;
  }

  /** Raw schedule item from the API (dates are ISO strings, not yet Date objects) */
  interface ScheduleFromApi {
    id: string;
    tripId: string;
    location: string;
    details: string;
    startTime: string;
    endTime: string;
    cost: number;
    multiDay: boolean;
    sortIndex: number;
    lastModified: string;
  }

  /** GET /schedule/:tripId */
  interface TripScheduleResponse {
    role?: string;
    tripName: string;
    location: string;
    startDate: string;
    endDate: string;
    gId: string;
    gVp: Vp;
    schedule: ScheduleFromApi[];
  }

  /** POST /schedule/:tripId */
  interface ScheduleAddResponse {
    addedItem?: ScheduleFromApi;
    newlyIndexedSchedule?: ScheduleFromApi[];
    message?: string;
  }

  /** PATCH /schedule/:id, PATCH /update-time/:id */
  interface ScheduleUpdateResponse {
    updatedData?: ScheduleFromApi;
    newlyIndexedSchedule?: ScheduleFromApi[];
  }

  /** DELETE /schedule/:id */
  interface ScheduleDeleteResponse {
    deletedData?: ScheduleFromApi;
    deletedId?: string;
    queryComplete?: string;
  }

  /** GET /add-vacation/:tripId */
  interface AddVacationGetResponse {
    gId: string;
    gLocation: string;
    gVp: Vp;
  }

  /** POST/PATCH /add-vacation */
  interface AddVacationMutationResponse {
    message: string;
  }

  /** GET /list/:tripId */
  interface ListGetResponse {
    data: Item[];
  }

  /** POST /list/:tripId */
  interface ListAddResponse {
    data: Item;
  }

  /** PATCH /list/:id, PATCH /check-list-item/:itemId */
  interface ListUpdateResponse {
    data: Item[];
  }

  /** DELETE /list/:itemId */
  interface ListDeleteResponse {
    deletedData: Item[];
  }

  /** Backend place shape returned by POST /map */
  interface MapSearchPlace {
    id: string;
    displayName: { text: string; languageCode: string };
    location: { latitude: number; longitude: number };
    shortFormattedAddress: string;
    formattedAddress?: string;
    primaryType: string;
    types: string[];
    rating?: number;
    userRatingCount: number;
  }

  /** POST /map */
  interface MapSearchResponse {
    places: MapSearchPlace[];
    nextPageToken?: string;
  }

  /** POST /details/:itemId */
  interface PlaceDetailsResponse {
    viewport: Viewport;
  }

  /** POST /auth/login */
  interface LoginResponse {
    message?: string;
    token?: string;
  }

  /** POST /signup */
  interface SignupResponse {
    message: string;
  }

  /** POST /auth/refresh */
  interface RefreshResponse {
    token: string;
  }

  /** POST /reset-password (401 body) */
  interface ResetPasswordErrorResponse {
    email?: string;
  }

  /** Generic API error body (401, etc.) */
  interface ApiErrorResponse {
    error?: string;
    message?: string;
  }

  /** 409 Conflict for schedule endpoints */
  interface ScheduleConflictResponse {
    message: string;
    newData: ScheduleFromApi[];
  }

  /** 409 Conflict for list endpoints */
  interface ListConflictResponse {
    message: string;
    newData: Item[];
  }

  // ─── Component / Domain Types ───────────────────────────────────────

  interface WantToSeeListProps {
    loadSecond: () => void;
    list: Item[];
    setList: React.Dispatch<React.SetStateAction<Item[] | []>>;
    handleDeleteItem: (
      a: UniqueIdentifier,
      fromGoogle: boolean
    ) => Promise<UniqueIdentifier | undefined>;
    handleSubmitItem: (
      val: string,
      id?: UniqueIdentifier
    ) => Promise<UniqueIdentifier | undefined>;
    activeListId: UniqueIdentifier | null;
  }

  type HideDay = {
    [date: string]: boolean;
  };

  type Prefill = {
    location: string;
    cost: number;
    details: string;
    multiDay: boolean;
  };

  type DragData = {
    type: string;
  };

  type Item = {
    id: UniqueIdentifier;
    value: string;
    fromGoogle: string | null;
    itemAdded: boolean;
    lastModified: string;
  };

  interface CheckBubbleProps {
    checked: boolean;
  }

  type DayContainer = {
    day: string;
    label: string;
  };

  type DaySchedule = {
    [day: string]: Schedule[];
  };

  type TableComponentProps = {
    dayObj: DayContainer;
    schedule: DaySchedule;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    activeId: UniqueIdentifier | null | undefined;
    viewMode: boolean;
  };

  type TableRowProps = {
    scheduleItem: Schedule;
    index: number;
    dayContainer: string;
    startDate: string;
    endDate: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    schedule: DaySchedule;
    activeId: UniqueIdentifier | null | undefined;
    viewMode: boolean;
  };

  type EditRowProps = {
    value: Schedule;
    index: number;
    dayContainer: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    schedule: DaySchedule;
  };

  type HandleEdit = (
    e: React.MouseEvent,
    id: UniqueIdentifier,
    preFilledLocation: string,
    preFilledCost: number,
    preFilledDetails: string,
    preFilledMultiDay: boolean,
    startDate: string,
    endDate: string,
    dayOfTrip: string
  ) => void;

  type SubmitDeleteScheduleItem = (
    e: React.MouseEvent,
    itemID: UniqueIdentifier,
    index: number,
    dateAdded: string
  ) => void;

  type TimeObj = {
    hour: string;
    minute: string;
    meridiem: string;
  };

  type ConstructDate = (
    which: "start" | "end",
    hour: string,
    minute: string,
    meridiem: string
  ) => void;

  type ListItemProps = {
    v: Item;
    i: number;
    editItem: (
      e: React.MouseEvent,
      index: number,
      itemId: UniqueIdentifier
    ) => void;
    handleCheckItem: (
      e: React.MouseEvent,
      currentState: boolean,
      itemId: UniqueIdentifier,
      index: number
    ) => void;
    activeListId: UniqueIdentifier | null;
  };

  type OverlayWidths = {
    container: number;
    table: number;
  };
}
