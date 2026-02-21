import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/app";
import PurchaseLogin from "./PurchaseLogin";

const mockNavigate = vi.fn();
const mockRpcResult = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      rpc: vi.fn(async () => mockRpcResult()),
    },
  };
});

describe("PurchaseLogin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockNavigate.mockClear();
    mockRpcResult.mockReset();
  });

  it("redirects purchase user to purchase page", async () => {
    mockRpcResult.mockReturnValue({
      data: [
        { id: "u1", name: "Buyer", username: "buyer", role: "purchase", is_active: true },
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
    mockRpcResult.mockReturnValue({
      data: [
        { id: "u2", name: "Sales", username: "sales", role: "sales", is_active: true },
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
