import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "@/App";

const renderAt = async (path: string) => {
  window.history.pushState({}, "", path);
  render(<App />);
  await waitFor(() => {
    expect(document.body).toBeInTheDocument();
  });
};

describe("route smoke tests", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("renders admin login route", async () => {
    await renderAt("/admin/login");
    expect(await screen.findByText("Admin Login")).toBeInTheDocument();
  });

  it("renders purchase login route", async () => {
    await renderAt("/purchase/login");
    expect(await screen.findByText("Purchase Login")).toBeInTheDocument();
  });

  it("renders order route", async () => {
    await renderAt("/order");
    expect(await screen.findByText("Invalid Link")).toBeInTheDocument();
  });
});
