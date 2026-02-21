import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restaurantPortalRepository } from "@/features/restaurantPortal/repositories/restaurantPortalRepository";
import { setRestaurantPortalSession } from "@/features/restaurantPortal/utils/session";

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const RestaurantLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const urlUsername = normalizeUsername(searchParams.get("r") || "");

  useEffect(() => {
    if (urlUsername) {
      setUsername(urlUsername);
    }
  }, [urlUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanUsername = normalizeUsername(username);
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setError("Username and PIN are required.");
      return;
    }

    if (!/^[0-9]{4,6}$/.test(cleanPin)) {
      setError("PIN must be 4 to 6 digits.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await restaurantPortalRepository.login(cleanUsername, cleanPin);
      setRestaurantPortalSession(result.session_token, {
        restaurantId: result.restaurant_id,
        restaurantName: result.restaurant_name,
        restaurantSlug: result.restaurant_slug,
        username: result.username,
        expiresAt: result.expires_at,
      });
      navigate("/restaurant", { replace: true });
    } catch (loginError: unknown) {
      const message = loginError instanceof Error ? loginError.message : "Invalid credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-dvh bg-background overflow-hidden">
      <div className="h-full overflow-y-auto overscroll-contain mobile-stable-scroll p-4 flex items-start sm:items-center justify-center">
        <div className="bg-card rounded-lg border border-border p-8 max-w-sm w-full my-6 space-y-5">
          <div className="text-center">
            <span className="text-3xl">{APP_CONFIG.brand.icon}</span>
            <h1 className="text-xl font-bold mt-2">Restaurant Portal Login</h1>
            <p className="text-sm text-muted-foreground">{APP_CONFIG.brand.name}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Username</label>
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="restaurant username"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^0-9]/g, ""));
                  setError("");
                }}
                placeholder="4-6 digit PIN"
                autoComplete="current-password"
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Checking..." : "Enter Portal"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RestaurantLogin;
