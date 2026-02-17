import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";
import { supabase } from "@/integrations/supabase/client";

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const PurchaseLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername || !password) {
      setError("Username and password are required.");
      return;
    }

    setIsLoading(true);
    const { data, error: queryError } = await supabase
      .from("app_users")
      .select("id,name,username,password,role,is_active")
      .ilike("username", cleanUsername)
      .in("role", ["purchase", "sales"])
      .eq("is_active", true)
      .limit(10);
    setIsLoading(false);

    if (queryError || !data || data.length === 0) {
      setError("Invalid credentials.");
      return;
    }
    const matchedUser = data.find((row) => row.password === password);
    if (!matchedUser) {
      setError("Invalid credentials.");
      return;
    }

    sessionStorage.setItem(APP_CONFIG.purchase.sessionKey, APP_CONFIG.purchase.sessionValue);
    sessionStorage.setItem(
      APP_CONFIG.purchase.userKey,
      JSON.stringify({ id: matchedUser.id, name: matchedUser.name, username: matchedUser.username, role: matchedUser.role }),
    );
    navigate(matchedUser.role === "sales" ? "/purchase?view=sales" : "/purchase");
  };

  return (
    <div className="app-dvh bg-background overflow-hidden">
      <div className="h-full overflow-y-auto overscroll-contain mobile-stable-scroll p-4 flex items-start sm:items-center justify-center">
        <div className="bg-card rounded-lg border border-border p-8 max-w-sm w-full my-6">
          <div className="text-center mb-6">
            <span className="text-3xl">{APP_CONFIG.brand.icon}</span>
            <h1 className="text-xl font-bold text-foreground mt-2">Purchase Login</h1>
            <p className="text-sm text-muted-foreground">{APP_CONFIG.brand.name}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Username (not case-sensitive)"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-base focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Password"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-base focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {isLoading ? "Checking..." : "Enter Purchase"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PurchaseLogin;
