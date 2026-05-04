import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  display_name: z.string().trim().min(1).max(80),
  role: z.enum(["customer", "owner", "delivery"]),
});

export default function Auth() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const from = loc.state?.from || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) nav(from, { replace: true }); });
  }, []);

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="label-mono mb-3">(account)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Welcome to Provender.</h1>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 mb-6 rounded-full bg-muted p-1">
            <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin"><SignInForm onDone={() => nav(from, { replace: true })} /></TabsContent>
          <TabsContent value="signup"><SignUpForm onDone={() => nav(from, { replace: true })} /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Signed in"); onDone(); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 card-flat p-6">
      <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      <Button type="submit" disabled={loading} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", display_name: "", role: "customer" as const });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.display_name, role: parsed.data.role },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created"); onDone(); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 card-flat p-6">
      <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required /></div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
      <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
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
