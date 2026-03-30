/**
 * Guest localStorage CRUD utility.
 * Every function returns data shaped identically to the corresponding API response types
 * (defined in schedule.d.ts) so consumers only switch which function they call.
 */

const GUEST_KEY = "guestTrip";

export interface GuestTripData {
  trip: {
    tripName: string;
    location: string;
    startDate: string;
    endDate: string;
    gId: string;
    gVp: Vp;
    isPublic: boolean;
    isOpenInvite: boolean;
  };
  schedule: ScheduleFromApi[];
  list: Item[];
}

// ─── Core helpers ──────────────────────────────────────────────────

function read(): GuestTripData | null {
  const raw = localStorage.getItem(GUEST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestTripData;
  } catch {
    return null;
  }
}

function write(data: GuestTripData): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(data));
}

// ─── Trip-level ────────────────────────────────────────────────────

export function getGuestTrip(): GuestTripData | null {
  return read();
}

export function saveGuestTrip(trip: GuestTripData["trip"]): void {
  const existing = read();
  write({
    trip,
    schedule: existing?.schedule ?? [],
    list: existing?.list ?? [],
  });
}

export function clearGuestTrip(): void {
  localStorage.removeItem(GUEST_KEY);
}

export function hasGuestTrip(): boolean {
  return localStorage.getItem(GUEST_KEY) !== null;
}

// ─── Schedule ──────────────────────────────────────────────────────

export function getGuestSchedule(): TripScheduleResponse {
  const data = read();
  if (!data) {
    return {
      tripName: "",
      location: "",
      startDate: "",
      endDate: "",
      gId: "",
      gVp: { south: 0, west: 0, north: 0, east: 0 },
      schedule: [],
    };
  }
  return {
    tripName: data.trip.tripName,
    location: data.trip.location,
    startDate: data.trip.startDate,
    endDate: data.trip.endDate,
    gId: data.trip.gId,
    gVp: data.trip.gVp,
    schedule: data.schedule,
  };
}

export function addGuestScheduleItem(item: {
  start: string;
  end: string;
  location: string;
  details: string;
  cost: number;
  multiDay: boolean;
}): ScheduleAddResponse {
  const data = read();
  if (!data) return { message: "No guest trip" };

  const newItem: ScheduleFromApi = {
    id: crypto.randomUUID(),
    tripId: "guest",
    location: item.location,
    details: item.details,
    startTime: item.start,
    endTime: item.end,
    cost: item.cost,
    multiDay: item.multiDay,
    sortIndex: data.schedule.length,
    lastModified: new Date().toISOString(),
    isLocked: false,
    latitude: null,
    longitude: null,
    placeId: null,
    showOnMap: true,
  };

  data.schedule.push(newItem);
  write(data);

  return { addedItem: newItem };
}

export function updateGuestScheduleItem(
  id: string,
  updates: Partial<
    Pick<
      ScheduleFromApi,
      | "startTime"
      | "endTime"
      | "location"
      | "details"
      | "cost"
      | "multiDay"
      | "sortIndex"
      | "isLocked"
      | "showOnMap"
    >
  >,
): ScheduleUpdateResponse {
  const data = read();
  if (!data) return {};

  const idx = data.schedule.findIndex((s) => s.id === id);
  if (idx === -1) return {};

  Object.assign(data.schedule[idx], updates, {
    lastModified: new Date().toISOString(),
  });
  write(data);

  return { updatedData: data.schedule[idx] };
}

export function deleteGuestScheduleItem(id: string): ScheduleDeleteResponse {
  const data = read();
  if (!data) return {};

  const idx = data.schedule.findIndex((s) => s.id === id);
  if (idx === -1) return {};

  const [deleted] = data.schedule.splice(idx, 1);
  write(data);

  return { deletedData: deleted, deletedId: id };
}

export function reorderGuestSchedule(items: ScheduleFromApi[]): void {
  const data = read();
  if (!data) return;
  data.schedule = items;
  write(data);
}

// ─── List ──────────────────────────────────────────────────────────

export function getGuestList(): ListGetResponse {
  const data = read();
  return { data: data?.list ?? [] };
}

export function addGuestListItem(
  value: string,
  fromGoogle?: string,
  details?: string | null,
): ListAddResponse {
  const data = read();
  if (!data) {
    const newItem: Item = {
      id: crypto.randomUUID(),
      value,
      fromGoogle: fromGoogle ?? null,
      details: details ?? null,
      itemAdded: false,
      lastModified: new Date().toISOString(),
    };
    return { data: newItem };
  }

  const newItem: Item = {
    id: crypto.randomUUID(),
    value,
    fromGoogle: fromGoogle ?? null,
    details: details ?? null,
    itemAdded: false,
    lastModified: new Date().toISOString(),
  };

  data.list.push(newItem);
  write(data);

  return { data: newItem };
}

export function updateGuestListItem(
  id: string,
  value: string,
  details?: string | null,
): ListUpdateResponse {
  const data = read();
  if (!data) return { data: [] };

  const idx = data.list.findIndex((item) => String(item.id) === String(id));
  if (idx === -1) return { data: [] };

  data.list[idx].value = value;
  data.list[idx].details = details ?? null;
  data.list[idx].lastModified = new Date().toISOString();
  write(data);

  return { data: [data.list[idx]] };
}

export function deleteGuestListItem(id: string): ListDeleteResponse {
  const data = read();
  if (!data) return { deletedData: [] };

  const idx = data.list.findIndex((item) => String(item.id) === String(id));
  if (idx === -1) return { deletedData: [] };

  const [deleted] = data.list.splice(idx, 1);
  write(data);

  return { deletedData: [deleted] };
}

export function checkGuestListItem(
  id: string,
  newValue: boolean,
): ListUpdateResponse {
  const data = read();
  if (!data) return { data: [] };

  const idx = data.list.findIndex((item) => String(item.id) === String(id));
  if (idx === -1) return { data: [] };

  data.list[idx].itemAdded = newValue;
  data.list[idx].lastModified = new Date().toISOString();
  write(data);

  return { data: [data.list[idx]] };
}

export function reorderGuestList(items: Item[]): void {
  const data = read();
  if (!data) return;
  data.list = items;
  write(data);
}
