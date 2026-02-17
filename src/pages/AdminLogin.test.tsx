import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/app";
import AdminLogin from "./AdminLogin";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AdminLogin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockNavigate.mockClear();
  });

  it("shows error for wrong password", () => {
    render(<AdminLogin />);

    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    expect(screen.getByText("Incorrect password. Try again.")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(APP_CONFIG.admin.sessionKey)).toBeNull();
  });

  it("stores session and navigates for correct password", () => {
    render(<AdminLogin />);

    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: APP_CONFIG.admin.password },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    expect(sessionStorage.getItem(APP_CONFIG.admin.sessionKey)).toBe(APP_CONFIG.admin.sessionValue);
    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });
});
