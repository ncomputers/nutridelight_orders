import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_CONFIG.admin.password) {
      sessionStorage.setItem(APP_CONFIG.admin.sessionKey, APP_CONFIG.admin.sessionValue);
      navigate("/admin");
    } else {
      setError("Incorrect password. Try again.");
    }
  };

  return (
    <div className="app-dvh bg-background overflow-hidden">
      <div className="h-full overflow-y-auto overscroll-contain mobile-stable-scroll p-4 flex items-start sm:items-center justify-center">
        <div className="bg-card rounded-lg border border-border p-8 max-w-sm w-full my-6">
          <div className="text-center mb-6">
            <span className="text-3xl">{APP_CONFIG.brand.icon}</span>
            <h1 className="text-xl font-bold text-foreground mt-2">Admin Login</h1>
            <p className="text-sm text-muted-foreground">{APP_CONFIG.brand.name}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter password"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-base mb-3 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <button
              type="submit"
              className="w-full h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
