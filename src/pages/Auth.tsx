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
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  display_name: z.string().trim().min(2, "Display name must be at least 2 characters").max(80),
  role: z.enum(["customer", "owner", "delivery"]),
});
type SignupFormValues = z.infer<typeof signupSchema>;

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
    setInfoMessage("Account created successfully! Please sign in with your email and password below.");
    setActiveTab("signin");
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="label-mono mb-3">(account)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Welcome to Provender.</h1>

        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
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

function SignInForm({ onDone, infoMessage }: { onDone: () => void; infoMessage: string | null }) {
  const { setMockRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  async function submit(data: LoginFormValues) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
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
      <form onSubmit={handleSubmit(submit)} className="space-y-4 card-flat p-6">
        {infoMessage && (
          <div className="bg-primary-soft border border-primary text-accent-foreground p-4 rounded-xl text-sm font-medium animate-slide-in mb-2 leading-relaxed">
            {infoMessage}
          </div>
        )}
        <div>
          <Label htmlFor="signin-email">Email</Label>
          <Input id="signin-email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500 font-semibold mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="signin-password">Password</Label>
          <div className="relative mt-1">
            <Input id="signin-password" type={showPassword ? "text" : "password"} {...register("password")} className="pr-10" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 font-semibold mt-1">{errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <Link to="/forgot-password" className="block text-center text-sm underline text-muted-foreground">
          Forgot password?
        </Link>
      </form>
      {import.meta.env.DEV && (
        <div className="card-flat p-6 border-dashed border-primary/40 bg-primary-soft/10 mt-6 animate-slide-in">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">Fast Testing Bypass (No Verification Needed)</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDevBypass("customer")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Customer</Button>
            <Button variant="outline" size="sm" onClick={() => handleDevBypass("owner")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Kitchen Owner</Button>
            <Button variant="outline" size="sm" onClick={() => handleDevBypass("delivery")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Delivery Partner</Button>
            <Button variant="outline" size="sm" onClick={() => handleDevBypass("admin")} className="rounded-full text-xs font-medium hover:bg-primary-soft">Login as Admin</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", display_name: "", role: "customer" }
  });

  const passwordVal = watch("password") || "";
  const roleVal = watch("role");

  async function submit(data: SignupFormValues) {
    const strength = evaluatePassword(data.password);
    if (strength.score < 2) {
      toast.error("Please choose a stronger password");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: data.display_name, role: data.role },
      },
    });
    setLoading(false);

    if (signUpError) {
      toast.error(signUpError.message);
    } else {
      toast.success("Account created successfully!");
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 card-flat p-6">
      <div>
        <Label htmlFor="signup-name">Display name</Label>
        <Input id="signup-name" {...register("display_name")} />
        {errors.display_name && <p className="text-xs text-red-500 font-semibold mt-1">{errors.display_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-500 font-semibold mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative mt-1">
          <Input id="signup-password" type={showPassword ? "text" : "password"} {...register("password")} className="pr-10" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 font-semibold mt-1">{errors.password.message}</p>}
        <PasswordStrengthMeter password={passwordVal} />
      </div>
      <div>
        <Label className="mb-2 block">I am a...</Label>
        <RadioGroup value={roleVal} onValueChange={(v) => setValue("role", v as any)} className="grid grid-cols-3 gap-2">
          {(["customer", "owner", "delivery"] as const).map((r) => (
            <label key={r} className={`cursor-pointer border rounded-xl p-3 text-center text-sm capitalize transition-all ${roleVal === r ? "border-primary bg-primary-soft text-primary font-semibold" : "border-border text-muted-foreground hover:bg-muted/30"}`}>
              <RadioGroupItem value={r} className="sr-only" />{r}
            </label>
          ))}
        </RadioGroup>
        {errors.role && <p className="text-xs text-red-500 font-semibold mt-1">{errors.role.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold">
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
