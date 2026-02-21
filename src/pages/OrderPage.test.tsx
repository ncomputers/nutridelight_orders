import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import OrderPage from "./OrderPage";

const renderOrderPage = (entry: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[entry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/order" element={<OrderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("OrderPage", () => {
  it("shows invalid link screen when slug is missing", () => {
    renderOrderPage("/order");

    expect(screen.getByText("Invalid Link")).toBeInTheDocument();
    expect(
      screen.getByText("Please contact your supplier for a valid order link."),
    ).toBeInTheDocument();
  });
});
