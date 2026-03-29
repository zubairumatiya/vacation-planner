import { FullPlaceApiResponse, Place, PlaceDetailsRow } from "../types/app-types.js";

const PLACE_DETAILS_COLUMNS = [
  "place_id",
  "display_name",
  "formatted_address",
  "short_formatted_address",
  "location",
  "primary_type",
  "primary_type_display_name",
  "types",
  "google_maps_uri",
  "google_maps_links",
  "business_status",
  "icon_mask_base_uri",
  "icon_background_color",
  "photos",
  "viewport",
  "address_components",
  "postal_address",
  "adr_format_address",
  "plus_code",
  "time_zone",
  "utc_offset_minutes",
  "sub_destinations",
  "containing_places",
  "accessibility_options",
  "rating",
  "user_rating_count",
  "price_level",
  "price_range",
  "website_uri",
  "international_phone_number",
  "national_phone_number",
  "regular_opening_hours",
  "current_opening_hours",
  "editorial_summary",
  "reviews",
  "dine_in",
  "takeout",
  "delivery",
  "curbside_pickup",
  "reservable",
  "serves_breakfast",
  "serves_brunch",
  "serves_lunch",
  "serves_dinner",
  "serves_beer",
  "serves_wine",
  "serves_cocktails",
  "serves_coffee",
  "serves_dessert",
  "serves_vegetarian_food",
  "outdoor_seating",
  "live_music",
  "good_for_children",
  "good_for_groups",
  "good_for_watching_sports",
  "allows_dogs",
  "restroom",
  "parking_options",
  "payment_options",
  "menu_for_children",
  "generative_summary",
  "neighborhood_summary",
  "review_summary",
] as const;

function toJsonOrNull(val: unknown): string | null {
  return val != null ? JSON.stringify(val) : null;
}

export function mapFullApiPlaceToDbParams(place: FullPlaceApiResponse): unknown[] {
  return [
    place.id,
    toJsonOrNull(place.displayName),
    place.formattedAddress ?? null,
    place.shortFormattedAddress ?? null,
    toJsonOrNull(place.location),
    place.primaryType ?? null,
    toJsonOrNull(place.primaryTypeDisplayName),
    place.types ?? null,
    place.googleMapsUri ?? null,
    toJsonOrNull(place.googleMapsLinks),
    place.businessStatus ?? null,
    place.iconMaskBaseUri ?? null,
    place.iconBackgroundColor ?? null,
    toJsonOrNull(place.photos),
    toJsonOrNull(place.viewport),
    toJsonOrNull(place.addressComponents),
    toJsonOrNull(place.postalAddress),
    place.adrFormatAddress ?? null,
    toJsonOrNull(place.plusCode),
    toJsonOrNull(place.timeZone),
    place.utcOffsetMinutes ?? null,
    toJsonOrNull(place.subDestinations),
    toJsonOrNull(place.containingPlaces),
    toJsonOrNull(place.accessibilityOptions),
    place.rating ?? null,
    place.userRatingCount ?? null,
    place.priceLevel ?? null,
    toJsonOrNull(place.priceRange),
    place.websiteUri ?? null,
    place.internationalPhoneNumber ?? null,
    place.nationalPhoneNumber ?? null,
    toJsonOrNull(place.regularOpeningHours),
    toJsonOrNull(place.currentOpeningHours),
    toJsonOrNull(place.editorialSummary),
    toJsonOrNull(place.reviews),
    place.dineIn ?? null,
    place.takeout ?? null,
    place.delivery ?? null,
    place.curbsidePickup ?? null,
    place.reservable ?? null,
    place.servesBreakfast ?? null,
    place.servesBrunch ?? null,
    place.servesLunch ?? null,
    place.servesDinner ?? null,
    place.servesBeer ?? null,
    place.servesWine ?? null,
    place.servesCocktails ?? null,
    place.servesCoffee ?? null,
    place.servesDessert ?? null,
    place.servesVegetarianFood ?? null,
    place.outdoorSeating ?? null,
    place.liveMusic ?? null,
    place.goodForChildren ?? null,
    place.goodForGroups ?? null,
    place.goodForWatchingSports ?? null,
    place.allowsDogs ?? null,
    place.restroom ?? null,
    toJsonOrNull(place.parkingOptions),
    toJsonOrNull(place.paymentOptions),
    place.menuForChildren ?? null,
    toJsonOrNull(place.generativeSummary),
    toJsonOrNull(place.neighborhoodSummary),
    toJsonOrNull(place.reviewSummary),
  ];
}

export function mapDbRowToPlace(row: PlaceDetailsRow): Place {
  return {
    id: row.place_id,
    displayName: row.display_name ?? { text: "", languageCode: "en" },
    location: row.location ?? { latitude: 0, longitude: 0 },
    shortFormattedAddress: row.short_formatted_address ?? "",
    primaryType: row.primary_type ?? "",
    types: row.types ?? [],
    rating: row.rating ?? undefined,
    userRatingCount: row.user_rating_count ?? 0,
  };
}

export function buildUpsertQuery(places: FullPlaceApiResponse[]): { text: string; values: unknown[] } {
  const colCount = PLACE_DETAILS_COLUMNS.length;
  const valuePlaceholders: string[] = [];
  const allValues: unknown[] = [];

  for (let i = 0; i < places.length; i++) {
    const params = mapFullApiPlaceToDbParams(places[i]);
    const offset = i * colCount;
    const row = params.map((_, j) => `$${offset + j + 1}`).join(",");
    valuePlaceholders.push(`(${row})`);
    allValues.push(...params);
  }

  const cols = PLACE_DETAILS_COLUMNS.join(",");
  const updates = PLACE_DETAILS_COLUMNS
    .filter((c) => c !== "place_id")
    .map((c) => `${c}=EXCLUDED.${c}`)
    .join(",");

  const text = `INSERT INTO place_details (${cols}) VALUES ${valuePlaceholders.join(",")} ON CONFLICT (place_id) DO UPDATE SET ${updates}`;

  return { text, values: allValues };
}

export const FULL_FIELD_MASK =
  "places.id,nextPageToken,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName,places.types,places.googleMapsUri,places.googleMapsLinks,places.businessStatus,places.iconMaskBaseUri,places.iconBackgroundColor,places.photos,places.viewport,places.addressComponents,places.postalAddress,places.adrFormatAddress,places.plusCode,places.timeZone,places.utcOffsetMinutes,places.subDestinations,places.containingPlaces,places.accessibilityOptions,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber,places.regularOpeningHours,places.currentOpeningHours,places.editorialSummary,places.reviews,places.dineIn,places.takeout,places.delivery,places.curbsidePickup,places.reservable,places.servesBreakfast,places.servesBrunch,places.servesLunch,places.servesDinner,places.servesBeer,places.servesWine,places.servesCocktails,places.servesCoffee,places.servesDessert,places.servesVegetarianFood,places.outdoorSeating,places.liveMusic,places.goodForChildren,places.goodForGroups,places.goodForWatchingSports,places.allowsDogs,places.restroom,places.parkingOptions,places.paymentOptions,places.menuForChildren,places.generativeSummary,places.neighborhoodSummary,places.reviewSummary";

export const ID_ONLY_FIELD_MASK = "places.id,nextPageToken";
