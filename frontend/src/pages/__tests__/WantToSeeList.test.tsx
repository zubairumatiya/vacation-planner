import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WantToSeeList from "../WantToSeeList";
import { renderWithProviders, createMockAuth } from "../../test-utils/render";

// Mock CSS modules
vi.mock("../../styles/WantToSee.module.css", () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}));

// Mock assets
vi.mock("../../assets/icons/trash-icon.svg", () => ({
  default: "trash-icon.svg",
}));

// Mock CheckBubble - simple checkbox display
vi.mock("../../components/CheckBubble", () => ({
  default: ({ checked }: { checked: boolean }) => (
    <span data-testid="check-bubble">{checked ? "✓" : "○"}</span>
  ),
}));

// Mock ListItem - renders item with click handlers
vi.mock("../../components/ListItem", () => ({
  default: ({
    v,
    i,
    editItem,
    handleCheckItem,
  }: {
    v: Item;
    i: number;
    editItem: (e: React.MouseEvent, i: number, id: any) => void;
    handleCheckItem: (e: React.MouseEvent, state: boolean, id: any, i: number) => void;
  }) => (
    <li data-testid={`list-item-${v.id}`}>
      <button
        data-testid={`check-${v.id}`}
        onClick={(e) => handleCheckItem(e, v.itemAdded, v.id, i)}
      >
        {v.itemAdded ? "✓" : "○"}
      </button>
      <span data-testid={`value-${v.id}`}>{v.value}</span>
      <button
        data-testid={`edit-${v.id}`}
        onClick={(e) => editItem(e, i, v.id)}
      >
        Edit
      </button>
    </li>
  ),
}));

// Mock guestStorage
vi.mock("../../utils/guestStorage", () => ({
  getGuestList: vi.fn(() => ({ data: [] })),
  updateGuestListItem: vi.fn(),
  checkGuestListItem: vi.fn(),
}));

// Mock refreshFn
vi.mock("../../utils/refreshFn", () => ({
  default: vi.fn(),
}));

const sampleItems: Item[] = [
  {
    id: "item-1",
    value: "Visit Fushimi Inari",
    fromGoogle: null,
    details: null,
    itemAdded: false,
    lastModified: "2024-06-01T00:00:00Z",
  },
  {
    id: "item-2",
    value: "Try ramen at Ichiran",
    fromGoogle: null,
    details: "The one near the station",
    itemAdded: true,
    lastModified: "2024-06-01T00:00:00Z",
  },
];

function defaultProps(overrides?: Partial<WantToSeeListProps>) {
  return {
    list: sampleItems,
    setList: vi.fn(),
    handleSubmitItem: vi.fn().mockResolvedValue(200),
    handleDeleteItem: vi.fn().mockResolvedValue(200),
    loadSecond: vi.fn(),
    activeListId: null,
    isMobile: false,
    ...overrides,
  } as WantToSeeListProps;
}

describe("WantToSeeList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock fetch for the initial list load
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: sampleItems }),
    });
  });

  it("renders list items from props", async () => {
    const props = defaultProps();
    renderWithProviders(<WantToSeeList {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId("value-item-1")).toHaveTextContent(
        "Visit Fushimi Inari",
      );
      expect(screen.getByTestId("value-item-2")).toHaveTextContent(
        "Try ramen at Ichiran",
      );
    });
  });

  it("shows the add item input by default", () => {
    const props = defaultProps();
    renderWithProviders(<WantToSeeList {...props} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("calls handleSubmitItem when adding a new item", async () => {
    const user = userEvent.setup();
    const handleSubmitItem = vi.fn().mockResolvedValue(200);
    const props = defaultProps({ handleSubmitItem });
    renderWithProviders(<WantToSeeList {...props} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "New temple to visit{enter}");

    expect(handleSubmitItem).toHaveBeenCalledWith(
      "New temple to visit",
      undefined,
      null,
    );
  });

  it("does not submit empty items", async () => {
    const user = userEvent.setup();
    const handleSubmitItem = vi.fn().mockResolvedValue(200);
    const props = defaultProps({ handleSubmitItem });
    renderWithProviders(<WantToSeeList {...props} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "   {enter}");

    expect(handleSubmitItem).not.toHaveBeenCalled();
  });

  it("clears input after successful submission", async () => {
    const user = userEvent.setup();
    const handleSubmitItem = vi.fn().mockResolvedValue(200);
    const props = defaultProps({ handleSubmitItem });
    renderWithProviders(<WantToSeeList {...props} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.type(input, "New item{enter}");

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("calls handleDeleteItem when delete button is clicked in edit mode", async () => {
    const user = userEvent.setup();
    const handleDeleteItem = vi.fn().mockResolvedValue(200);
    const props = defaultProps({ handleDeleteItem });
    renderWithProviders(<WantToSeeList {...props} />);

    // Click edit on first item to enter edit mode
    const editBtn = screen.getByTestId("edit-item-1");
    await user.click(editBtn);

    // Now trash button should be visible in the edit form
    const trashBtn = screen.getByAltText("trashIcon");
    await user.click(trashBtn);

    expect(handleDeleteItem).toHaveBeenCalledWith("item-1", false);
  });

  it("shows checked state for completed items", () => {
    const props = defaultProps();
    renderWithProviders(<WantToSeeList {...props} />);

    expect(screen.getByTestId("check-item-1")).toHaveTextContent("○");
    expect(screen.getByTestId("check-item-2")).toHaveTextContent("✓");
  });

  it("renders empty state when list has no items", () => {
    const props = defaultProps({ list: [] });
    renderWithProviders(<WantToSeeList {...props} />);

    // Should still show the add input
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    // No list items
    expect(screen.queryByTestId("list-item-item-1")).not.toBeInTheDocument();
  });
});
