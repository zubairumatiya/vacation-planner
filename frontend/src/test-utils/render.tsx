import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { BannerContext } from "../context/BannerContext";
import { vi } from "vitest";
import type { ReactElement } from "react";

export function createMockAuth(overrides?: Partial<ReturnType<typeof defaultAuth>>) {
  return { ...defaultAuth(), ...overrides };
}

function defaultAuth() {
  return {
    token: "test-token",
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    loggingOut: false,
    refreshInFlightRef: { current: null },
    loggingOutRef: { current: false },
    userEmail: "test@example.com",
    userId: "user-1",
    userUsername: "testuser",
    userAvatar: null,
    setUserAvatar: vi.fn(),
  };
}

type CustomRenderOptions = {
  auth?: ReturnType<typeof createMockAuth>;
  setBannerMsg?: ReturnType<typeof vi.fn>;
  route?: string;
  path?: string;
} & Omit<RenderOptions, "wrapper">;

export function renderWithProviders(
  ui: ReactElement,
  {
    auth = createMockAuth(),
    setBannerMsg = vi.fn(),
    route = "/vacation/trip-1/edit",
    path = "/vacation/:tripId/edit",
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={auth}>
          <BannerContext.Provider value={{ setBannerMsg, bannerMsg: null }}>
            <Routes>
              <Route path={path} element={children} />
            </Routes>
          </BannerContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    auth,
    setBannerMsg,
  };
}
