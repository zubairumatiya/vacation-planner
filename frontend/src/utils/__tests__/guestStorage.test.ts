import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getGuestTrip,
  saveGuestTrip,
  clearGuestTrip,
  hasGuestTrip,
  getGuestSchedule,
  addGuestScheduleItem,
  updateGuestScheduleItem,
  deleteGuestScheduleItem,
  getGuestList,
  addGuestListItem,
  checkGuestListItem,
  deleteGuestListItem,
} from "../guestStorage.js";

const GUEST_KEY = "guestTrip";

const sampleTrip = {
  tripName: "Tokyo Trip",
  location: "Tokyo, Japan",
  startDate: "2024-06-01",
  endDate: "2024-06-10",
  gId: "place-123",
  gVp: { south: 35.5, west: 139.5, north: 35.8, east: 139.9 },
  isPublic: false,
  isOpenInvite: false,
};

function seedGuest(overrides?: Partial<{ schedule: any[]; list: any[] }>) {
  const data = {
    trip: sampleTrip,
    schedule: overrides?.schedule ?? [],
    list: overrides?.list ?? [],
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(data));
  return data;
}

describe("guestStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── Trip-level ───────────────────────────────

  describe("getGuestTrip", () => {
    it("returns null when no guest trip exists", () => {
      expect(getGuestTrip()).toBeNull();
    });

    it("returns parsed data when guest trip exists", () => {
      seedGuest();
      const result = getGuestTrip();
      expect(result?.trip.tripName).toBe("Tokyo Trip");
      expect(result?.schedule).toEqual([]);
      expect(result?.list).toEqual([]);
    });

    it("returns null on corrupted JSON", () => {
      localStorage.setItem(GUEST_KEY, "not-valid-json{{{");
      expect(getGuestTrip()).toBeNull();
    });
  });

  describe("saveGuestTrip", () => {
    it("preserves existing schedule and list when saving new trip info", () => {
      const schedule = [
        {
          id: "s1",
          tripId: "guest",
          location: "Shibuya",
          details: "",
          startTime: "2024-06-01T09:00:00Z",
          endTime: "2024-06-01T10:00:00Z",
          cost: 0,
          multiDay: false,
          sortIndex: 0,
          lastModified: "2024-06-01T00:00:00Z",
          isLocked: false,
        },
      ];
      seedGuest({ schedule });

      const updatedTrip = { ...sampleTrip, tripName: "Osaka Trip" };
      saveGuestTrip(updatedTrip);

      const result = getGuestTrip();
      expect(result?.trip.tripName).toBe("Osaka Trip");
      expect(result?.schedule).toHaveLength(1);
      expect(result?.schedule[0].location).toBe("Shibuya");
    });

    it("initializes empty schedule/list when no prior data exists", () => {
      saveGuestTrip(sampleTrip);
      const result = getGuestTrip();
      expect(result?.schedule).toEqual([]);
      expect(result?.list).toEqual([]);
    });
  });

  describe("clearGuestTrip / hasGuestTrip", () => {
    it("removes guest trip from localStorage", () => {
      seedGuest();
      expect(hasGuestTrip()).toBe(true);
      clearGuestTrip();
      expect(hasGuestTrip()).toBe(false);
      expect(getGuestTrip()).toBeNull();
    });
  });

  // ─── Schedule ─────────────────────────────────

  describe("addGuestScheduleItem", () => {
    it("appends an item with a UUID and correct shape", () => {
      seedGuest();
      const result = addGuestScheduleItem({
        start: "2024-06-01T09:00:00Z",
        end: "2024-06-01T10:00:00Z",
        location: "Meiji Shrine",
        details: "Morning visit",
        cost: 0,
        multiDay: false,
      });

      expect(result.addedItem).toBeDefined();
      expect(result.addedItem!.location).toBe("Meiji Shrine");
      expect(result.addedItem!.tripId).toBe("guest");
      expect(result.addedItem!.id).toBeTruthy();

      const stored = getGuestTrip();
      expect(stored?.schedule).toHaveLength(1);
    });

    it("returns message when no guest trip exists", () => {
      const result = addGuestScheduleItem({
        start: "2024-06-01T09:00:00Z",
        end: "2024-06-01T10:00:00Z",
        location: "Test",
        details: "",
        cost: 0,
        multiDay: false,
      });
      expect(result.message).toBe("No guest trip");
    });
  });

  describe("updateGuestScheduleItem", () => {
    it("updates specified fields and bumps lastModified", () => {
      seedGuest();
      const added = addGuestScheduleItem({
        start: "2024-06-01T09:00:00Z",
        end: "2024-06-01T10:00:00Z",
        location: "Original",
        details: "",
        cost: 0,
        multiDay: false,
      });

      const originalModified = added.addedItem!.lastModified;

      // Small delay to ensure timestamp differs
      const result = updateGuestScheduleItem(added.addedItem!.id, {
        location: "Updated Location",
        cost: 500,
      });

      expect(result.updatedData?.location).toBe("Updated Location");
      expect(result.updatedData?.cost).toBe(500);
    });

    it("returns empty object when item not found", () => {
      seedGuest();
      const result = updateGuestScheduleItem("nonexistent-id", {
        location: "Test",
      });
      expect(result).toEqual({});
    });
  });

  describe("deleteGuestScheduleItem", () => {
    it("removes item and returns deleted data", () => {
      seedGuest();
      const added = addGuestScheduleItem({
        start: "2024-06-01T09:00:00Z",
        end: "2024-06-01T10:00:00Z",
        location: "To Delete",
        details: "",
        cost: 0,
        multiDay: false,
      });

      const result = deleteGuestScheduleItem(added.addedItem!.id);
      expect(result.deletedData?.location).toBe("To Delete");
      expect(result.deletedId).toBe(added.addedItem!.id);

      const stored = getGuestTrip();
      expect(stored?.schedule).toHaveLength(0);
    });

    it("returns empty object when item not found", () => {
      seedGuest();
      const result = deleteGuestScheduleItem("nonexistent-id");
      expect(result).toEqual({});
    });
  });

  // ─── List ─────────────────────────────────────

  describe("getGuestList", () => {
    it("returns empty array when no guest trip", () => {
      const result = getGuestList();
      expect(result.data).toEqual([]);
    });

    it("returns list items from stored guest trip", () => {
      seedGuest({
        list: [
          {
            id: "l1",
            value: "Ramen",
            fromGoogle: null,
            details: null,
            itemAdded: false,
            lastModified: "2024-06-01T00:00:00Z",
          },
        ],
      });
      const result = getGuestList();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].value).toBe("Ramen");
    });
  });

  describe("addGuestListItem", () => {
    it("adds a list item and returns it", () => {
      seedGuest();
      const result = addGuestListItem("Visit Temple");
      expect(result.data.value).toBe("Visit Temple");
      expect(result.data.itemAdded).toBe(false);
      expect(result.data.id).toBeTruthy();

      const stored = getGuestTrip();
      expect(stored?.list).toHaveLength(1);
    });
  });

  describe("checkGuestListItem", () => {
    it("toggles itemAdded boolean", () => {
      seedGuest();
      const added = addGuestListItem("Check me");

      const checked = checkGuestListItem(String(added.data.id), true);
      expect(checked.data[0]?.itemAdded).toBe(true);

      const unchecked = checkGuestListItem(String(added.data.id), false);
      expect(unchecked.data[0]?.itemAdded).toBe(false);
    });

    it("returns empty array when item not found", () => {
      seedGuest();
      const result = checkGuestListItem("nonexistent", true);
      expect(result.data).toEqual([]);
    });
  });

  describe("deleteGuestListItem", () => {
    it("removes item and returns deleted data", () => {
      seedGuest();
      const added = addGuestListItem("Delete me");

      const result = deleteGuestListItem(String(added.data.id));
      expect(result.deletedData).toHaveLength(1);
      expect(result.deletedData[0].value).toBe("Delete me");

      const stored = getGuestTrip();
      expect(stored?.list).toHaveLength(0);
    });
  });
});
