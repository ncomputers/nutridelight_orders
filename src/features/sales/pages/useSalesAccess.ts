import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";

export const useSalesAccess = () => {
  const navigate = useNavigate();

  const purchaseSessionRaw = sessionStorage.getItem(APP_CONFIG.purchase.userKey);
  const purchaseSessionUser = useMemo(() => {
    if (!purchaseSessionRaw) return null;
    try {
      return JSON.parse(purchaseSessionRaw) as { id: string; name: string; username: string; role?: string };
    } catch {
      return null;
    }
  }, [purchaseSessionRaw]);

  const hasAdminSession = sessionStorage.getItem(APP_CONFIG.admin.sessionKey) === APP_CONFIG.admin.sessionValue;
  const hasPurchaseSession =
    sessionStorage.getItem(APP_CONFIG.purchase.sessionKey) === APP_CONFIG.purchase.sessionValue;
  const hasSalesAccess = hasAdminSession || (hasPurchaseSession && purchaseSessionUser?.role === "sales");
  const actorName = hasAdminSession ? "admin" : purchaseSessionUser?.username || "sales";

  useEffect(() => {
    if (hasSalesAccess) return;
    if (hasPurchaseSession) {
      navigate("/purchase/login");
      return;
    }
    navigate("/admin/login");
  }, [hasSalesAccess, hasPurchaseSession, navigate]);

  return {
    hasSalesAccess,
    isAdminEditor: hasAdminSession,
    actorName,
  };
};
