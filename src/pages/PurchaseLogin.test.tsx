import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/app";
import PurchaseLogin from "./PurchaseLogin";

const mockNavigate = vi.fn();
const mockQueryResult = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(async () => mockQueryResult()),
  };
  return {
    supabase: {
      from: vi.fn(() => chain),
    },
  };
});

describe("PurchaseLogin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockNavigate.mockClear();
    mockQueryResult.mockReset();
  });

  it("redirects purchase user to purchase page", async () => {
    mockQueryResult.mockReturnValue({
      data: [
        { id: "u1", name: "Buyer", username: "buyer", password: "pass", role: "purchase", is_active: true },
      ],
      error: null,
    });

    render(<PurchaseLogin />);

    fireEvent.change(screen.getByPlaceholderText("Username (not case-sensitive)"), {
      target: { value: "buyer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter Purchase" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/purchase"));
    expect(sessionStorage.getItem(APP_CONFIG.purchase.sessionKey)).toBe(APP_CONFIG.purchase.sessionValue);
  });

  it("redirects sales user to sales view", async () => {
    mockQueryResult.mockReturnValue({
      data: [
        { id: "u2", name: "Sales", username: "sales", password: "pass", role: "sales", is_active: true },
      ],
      error: null,
    });

    render(<PurchaseLogin />);

    fireEvent.change(screen.getByPlaceholderText("Username (not case-sensitive)"), {
      target: { value: "sales" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter Purchase" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/purchase?view=sales"));
  });
});
