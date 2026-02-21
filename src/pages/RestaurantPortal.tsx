import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_CONFIG } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIsoDateDdMmYyyy } from "@/lib/datetime";
import { compressImageFile } from "@/lib/imageCompression";
import { restaurantPortalQueryKeys } from "@/features/restaurantPortal/queryKeys";
import { restaurantPortalRepository } from "@/features/restaurantPortal/repositories/restaurantPortalRepository";
import {
  clearRestaurantPortalSession,
  getRestaurantPortalToken,
  setRestaurantPortalSession,
} from "@/features/restaurantPortal/utils/session";
import type {
  RestaurantPortalOrder,
  RestaurantSupportIssueType,
} from "@/features/restaurantPortal/types";

const ISSUE_TYPES: Array<{ key: RestaurantSupportIssueType; label: string }> = [
  { key: "missing_item", label: "Missing item" },
  { key: "damaged", label: "Damaged" },
  { key: "quality", label: "Quality" },
  { key: "billing", label: "Billing" },
  { key: "other", label: "Other" },
];

const RestaurantPortal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionToken = getRestaurantPortalToken();

  const [orderId, setOrderId] = useState("");
  const [issueType, setIssueType] = useState<RestaurantSupportIssueType>("other");
  const [note, setNote] = useState("");
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [issueError, setIssueError] = useState("");

  useEffect(() => {
    if (!sessionToken) {
      navigate("/restaurant/login", { replace: true });
    }
  }, [navigate, sessionToken]);

  const logoutNow = async () => {
    try {
      if (sessionToken) {
        await restaurantPortalRepository.logout(sessionToken);
      }
    } finally {
      clearRestaurantPortalSession();
      navigate("/restaurant/login", { replace: true });
    }
  };

  const { data: me, isLoading: isMeLoading } = useQuery({
    queryKey: restaurantPortalQueryKeys.me(),
    queryFn: async () => {
      if (!sessionToken) throw new Error("Session required.");
      return restaurantPortalRepository.me(sessionToken);
    },
    enabled: Boolean(sessionToken),
    retry: false,
  });

  const { data: dashboard } = useQuery({
    queryKey: restaurantPortalQueryKeys.dashboard(),
    queryFn: async () => {
      if (!sessionToken) throw new Error("Session required.");
      return restaurantPortalRepository.getDashboard(sessionToken);
    },
    enabled: Boolean(me && sessionToken),
  });

  const { data: orders = [] } = useQuery<RestaurantPortalOrder[]>({
    queryKey: restaurantPortalQueryKeys.orders(),
    queryFn: async () => {
      if (!sessionToken) throw new Error("Session required.");
      return restaurantPortalRepository.listOrders(sessionToken);
    },
    enabled: Boolean(me && sessionToken),
  });

  const { data: issues = [] } = useQuery({
    queryKey: restaurantPortalQueryKeys.issues(),
    queryFn: async () => {
      if (!sessionToken) throw new Error("Session required.");
      return restaurantPortalRepository.listIssues(sessionToken);
    },
    enabled: Boolean(me && sessionToken),
  });

  const createIssue = useMutation({
    mutationFn: async () => {
      if (!sessionToken) throw new Error("Session required.");
      const cleanNote = note.trim();
      if (!cleanNote) throw new Error("Issue note is required.");
      await restaurantPortalRepository.createIssue(sessionToken, {
        orderId: orderId || null,
        issueType,
        note: cleanNote,
        photoDataUrls,
      });
    },
    onSuccess: () => {
      setOrderId("");
      setIssueType("other");
      setNote("");
      setPhotoDataUrls([]);
      setIssueError("");
      queryClient.invalidateQueries({ queryKey: restaurantPortalQueryKeys.issues() });
      queryClient.invalidateQueries({ queryKey: restaurantPortalQueryKeys.dashboard() });
    },
    onError: (error: Error) => {
      setIssueError(error.message || "Could not submit issue.");
    },
  });

  const orderOptions = useMemo(
    () =>
      orders.map((row) => ({
        id: row.id,
        label: `${row.order_ref || "No Ref"} · ${formatIsoDateDdMmYyyy(row.order_date || "")}`,
      })),
    [orders],
  );

  const handlePickPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIssueError("");
    const picked = Array.from(files).slice(0, 3);
    try {
      const compressed = await Promise.all(
        picked.map((file) =>
          compressImageFile(file, {
            maxWidth: 900,
            maxHeight: 900,
            quality: 0.78,
            outputType: "image/webp",
          }),
        ),
      );
      setPhotoDataUrls(compressed.map((img) => img.dataUrl).slice(0, 3));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not process image.";
      setIssueError(message);
    }
  };

  useEffect(() => {
    if (!me) return;
    setRestaurantPortalSession(sessionToken, {
      restaurantId: me.restaurant_id,
      restaurantName: me.restaurant_name,
      restaurantSlug: me.restaurant_slug,
      username: me.username,
      expiresAt: me.expires_at,
    });
  }, [me, sessionToken]);

  useEffect(() => {
    if (isMeLoading) return;
    if (me) return;
    clearRestaurantPortalSession();
    navigate("/restaurant/login", { replace: true });
  }, [isMeLoading, me, navigate]);

  if (!sessionToken) {
    return null;
  }

  if (isMeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading portal...</div>
    );
  }

  if (!me) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{me.restaurant_name}</p>
            <p className="text-xs text-muted-foreground">Restaurant Portal</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={logoutNow}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <section className="rounded-md border border-border p-3 space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Today Status</h2>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded border border-border p-2">
              <p className="text-xs text-muted-foreground">Today Order</p>
              <p className="font-semibold">{dashboard?.today_order_ref || "No order yet"}</p>
            </div>
            <div className="rounded border border-border p-2">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold">{dashboard?.today_status || "-"}</p>
            </div>
            <div className="rounded border border-border p-2">
              <p className="text-xs text-muted-foreground">Open Issues</p>
              <p className="font-semibold">{dashboard?.open_issue_count ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border p-3 space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">My Orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders available.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((row) => (
                <div key={row.id} className="rounded border border-border p-2 text-sm flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.order_ref || "No Ref"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatIsoDateDdMmYyyy(row.order_date || "")} · Delivery {formatIsoDateDdMmYyyy(row.delivery_date || "")}
                    </p>
                  </div>
                  <span className="text-xs rounded px-2 py-0.5 bg-muted text-muted-foreground">{row.status || "-"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-border p-3 space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Support</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">No order selected</option>
              {orderOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as RestaurantSupportIssueType)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {ISSUE_TYPES.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe issue"
            className="w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            <Input type="file" accept="image/*" multiple onChange={(e) => handlePickPhotos(e.target.files)} />
            {photoDataUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {photoDataUrls.map((url) => (
                  <img key={url} src={url} alt="Issue" className="w-16 h-16 rounded border border-border object-cover" />
                ))}
              </div>
            ) : null}
          </div>

          {issueError ? <p className="text-xs text-destructive">{issueError}</p> : null}

          <Button type="button" onClick={() => createIssue.mutate()} disabled={createIssue.isPending}>
            {createIssue.isPending ? "Submitting..." : "Submit Issue"}
          </Button>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">My Issues</p>
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No support issues yet.</p>
            ) : (
              issues.map((issue) => (
                <div key={issue.id} className="rounded border border-border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{issue.issue_type.replace(/_/g, " ")}</p>
                    <span className="text-xs rounded px-2 py-0.5 bg-muted text-muted-foreground">{issue.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatIsoDateDdMmYyyy(issue.created_at)} · {issue.order_id ? `Order linked` : `General`}</p>
                  <p className="mt-1">{issue.note}</p>
                  {issue.resolution_note ? (
                    <p className="mt-1 text-xs text-emerald-700">Resolution: {issue.resolution_note}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default RestaurantPortal;
