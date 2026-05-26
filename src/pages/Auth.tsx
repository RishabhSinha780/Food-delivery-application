import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { evaluatePassword } from "@/lib/passwordStrength";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().min(1).max(80),
  role: z.enum(["customer", "owner", "delivery"]),
});



export default function Auth() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const from = loc.state?.from || "/";
  const [activeTab, setActiveTab] = useState("signin");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) nav(from, { replace: true }); });
  }, []);

  const handleSignupSuccess = () => {
    setInfoMessage("Account created successfully! We've sent a verification link to your email. Please check your inbox and confirm your email, then sign in below.");
    setActiveTab("signin");
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="label-mono mb-3">(account)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Welcome to Provender.</h1>

        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          // Clear the banner message if they manually switch tabs
          if (val === "signup") {
            setInfoMessage(null);
          }
        }}>
          <TabsList className="grid grid-cols-2 mb-6 rounded-full bg-muted p-1">
            <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <SignInForm onDone={() => nav(from, { replace: true })} infoMessage={infoMessage} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm onDone={handleSignupSuccess} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

import { useAuth } from "@/lib/auth";

function SignInForm({ onDone, infoMessage }: { onDone: () => void; infoMessage: string | null }) {
  const { setMockRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Signed in"); onDone(); }
  }

  const handleDevBypass = async (role: "customer" | "owner" | "delivery" | "admin") => {
    setLoading(true);
    await setMockRole(role);
    setLoading(false);
    toast.success(`Dev Bypass: Logged in as ${role}`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4 card-flat p-6">
        {infoMessage && (
          <div className="bg-primary-soft border border-primary text-accent-foreground p-4 rounded-xl text-sm font-medium animate-slide-in mb-2 leading-relaxed">
            {infoMessage}
          </div>
        )}
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div>
          <Label>Password</Label>
          <div className="relative mt-1">
            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <Link to="/forgot-password" className="block text-center text-sm underline text-muted-foreground">
          Forgot password?
        </Link>
      </form>

      <div className="card-flat p-6 border-dashed border-primary/40 bg-primary-soft/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">Fast Testing Bypass (No Verification Needed)</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDevBypass("customer")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Customer</Button>
          <Button variant="outline" size="sm" onClick={() => handleDevBypass("owner")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Kitchen Owner</Button>
          <Button variant="outline" size="sm" onClick={() => handleDevBypass("delivery")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Delivery Partner</Button>
          <Button variant="outline" size="sm" onClick={() => handleDevBypass("admin")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Admin</Button>
        </div>
      </div>
    </div>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", display_name: "", role: "customer" as const });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    const strength = evaluatePassword(parsed.data.password);
    if (strength.score < 2) {
      toast.error("Please choose a stronger password");
      return;
    }

    console.log("Supabase SignUp Request Payload:", {
      email: parsed.data.email,
      role: parsed.data.role,
      display_name: parsed.data.display_name,
    });

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.display_name, role: parsed.data.role },
      },
    });
    setLoading(false);

    if (error) {
      console.error("Supabase SignUp Error details:", {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      toast.error(error.message);
    } else {
      console.log("Supabase SignUp Success response data:", data);
      toast.success("Account created successfully!");
      onDone();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 card-flat p-6">
      <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required /></div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
      <div>
        <Label>Password</Label>
        <div className="relative mt-1">
          <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="pr-10" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <PasswordStrengthMeter password={form.password} />
      </div>
      <div>
        <Label className="mb-2 block">I am a...</Label>
        <RadioGroup value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "customer" })} className="grid grid-cols-3 gap-2">
          {(["customer", "owner", "delivery"] as const).map((r) => (
            <label key={r} className={`cursor-pointer border rounded-xl p-3 text-center text-sm capitalize ${form.role === r ? "border-primary bg-primary-soft" : "border-border"}`}>
              <RadioGroupItem value={r} className="sr-only" />{r}
            </label>
          ))}
        </RadioGroup>
      </div>
      <Button type="submit" disabled={loading} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
