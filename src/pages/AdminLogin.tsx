import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ADMIN_PASSWORD = "admin123";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("fs_admin", "1");
      navigate("/admin");
    } else {
      setError("Incorrect password. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border p-8 max-w-xs w-full">
        <div className="text-center mb-6">
          <span className="text-3xl">🥬</span>
          <h1 className="text-xl font-bold text-foreground mt-2">Admin Login</h1>
          <p className="text-sm text-muted-foreground">FreshSupply</p>
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
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
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
  );
};

export default AdminLogin;
