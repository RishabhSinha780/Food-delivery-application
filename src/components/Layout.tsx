import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, MapPin, User as UserIcon, LogOut, Settings, Key, UserCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const { count } = useCart();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const nav = (url: string) => navigate(url);

  const [profileOpen, setProfileOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user && profileOpen) {
      setProfileForm({
        displayName: user.user_metadata?.display_name || "",
        email: user.email || "",
        password: localStorage.getItem("mock_password") || "password123",
      });
      setShowPassword(false);
    }
  }, [user, profileOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const isMock = localStorage.getItem("mock_role") !== null;
      if (isMock) {
        localStorage.setItem("mock_display_name", profileForm.displayName);
        localStorage.setItem("mock_email", profileForm.email);
        localStorage.setItem("mock_password", profileForm.password);
        toast.success("Mock profile updated successfully!");
        setProfileOpen(false);
        window.location.reload();
      } else {
        const { error: authErr } = await supabase.auth.updateUser({
          email: profileForm.email !== user.email ? profileForm.email : undefined,
          password: profileForm.password !== "password123" && profileForm.password ? profileForm.password : undefined,
          data: { display_name: profileForm.displayName }
        });
        if (authErr) throw authErr;

        const { error: dbErr } = await supabase.from("profiles").update({
          display_name: profileForm.displayName
        }).eq("id", user.id);
        if (dbErr) throw dbErr;

        toast.success("Profile updated successfully!");
        setProfileOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const dashboardLink = roles.includes("admin") ? "/admin"
    : roles.includes("owner") ? "/owner"
    : roles.includes("delivery") ? "/delivery"
    : "/orders";

  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link to="/" className="text-xl font-extrabold tracking-tighter">PROVENDER</Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/" end className={({ isActive }) => `px-3 py-2 rounded-full ${isActive ? "bg-foreground text-background" : "hover:bg-muted"}`}>Restaurants</NavLink>
            {user && (
              <>
                <NavLink to="/favourites" className={({ isActive }) => `px-3 py-2 rounded-full ${isActive ? "bg-foreground text-background" : "hover:bg-muted"}`}>Favourites</NavLink>
                <NavLink to="/orders" className={({ isActive }) => `px-3 py-2 rounded-full ${isActive ? "bg-foreground text-background" : "hover:bg-muted"}`}>Orders</NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Brooklyn, NY</span>
            </div>
            
            {!isAdmin && !roles.includes("owner") && (
              <Button variant="ghost" size="sm" onClick={() => nav("/cart")} className="rounded-full relative">
                <ShoppingBag className="h-4 w-4 mr-1" /> Cart
                {count > 0 && <span className="ml-2 mono text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{count}</span>}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full font-semibold px-3 text-xs border border-border bg-muted/20">
                  {currency === "USD" ? "$ USD" : currency === "INR" ? "₹ INR" : currency === "EUR" ? "€ EUR" : "£ GBP"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28">
                <DropdownMenuItem onClick={() => setCurrency("USD")}>$ USD</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("INR")}>₹ INR (Rs.)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("EUR")}>€ EUR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("GBP")}>£ GBP</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold hidden md:inline text-muted-foreground mr-1 animate-slide-in">
                  Hi, {user.user_metadata?.display_name || user.email?.split("@")[0]}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <UserIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                    <DropdownMenuLabel className="label-mono">{roles.join(" · ") || "customer"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => nav(dashboardLink)}>My Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav("/favourites")}>Favourites</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav("/orders")}>Order History</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav("/addresses")}>Address Book</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" /> Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); nav("/"); }}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button onClick={() => nav("/auth")} className="rounded-full bg-foreground text-background hover:bg-foreground/90" size="sm">Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm">
          <div>
            <div className="text-lg font-extrabold tracking-tighter mb-2">PROVENDER</div>
            <p className="text-muted-foreground max-w-xs">Crave the city, delivered uncompromised.</p>
          </div>
          <div className="label-mono">© 2026 — Demo build</div>
        </div>
      </footer>

      {/* Profile Settings Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" /> Profile Settings
            </DialogTitle>
          </DialogHeader>
          {user && (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">User ID (UUID)</Label>
                <div className="bg-muted p-2.5 rounded-lg text-xs font-mono select-all truncate border border-border mt-1">
                  {user.id}
                </div>
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  required
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Mail ID (Email)</Label>
                <Input
                  required
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="name@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Key className="h-3 w-3" /> Change Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={profileForm.password}
                    onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                    placeholder="Type new password (or leave as is)"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={savingProfile} className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

