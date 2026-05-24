import { Link, NavLink } from "react-router-dom";
import { ShoppingBag, MapPin, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const { count } = useCart();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const nav = (url: string) => { window.location.href = url; };

  const dashboardLink = roles.includes("admin") ? "/admin"
    : roles.includes("owner") ? "/owner"
    : roles.includes("delivery") ? "/delivery"
    : "/orders";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link to="/" className="text-xl font-extrabold tracking-tighter">PROVENDER</Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/" end className={({ isActive }) => `px-3 py-2 rounded-full ${isActive ? "bg-foreground text-background" : "hover:bg-muted"}`}>Restaurants</NavLink>
            {user && <NavLink to="/orders" className={({ isActive }) => `px-3 py-2 rounded-full ${isActive ? "bg-foreground text-background" : "hover:bg-muted"}`}>Orders</NavLink>}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Brooklyn, NY</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => nav("/cart")} className="rounded-full relative">
              <ShoppingBag className="h-4 w-4 mr-1" /> Cart
              {count > 0 && <span className="ml-2 mono text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{count}</span>}
            </Button>

            {user ? (
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
                  <DropdownMenuItem onClick={() => nav("/orders")}>Order History</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav("/addresses")}>Address Book</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); nav("/"); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
    </div>
  );
}
