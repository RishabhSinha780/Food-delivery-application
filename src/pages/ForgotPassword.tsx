import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.string().trim().email().max(255);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) { toast.error("Enter a valid email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setSent(true); toast.success("Reset link sent"); }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="label-mono mb-3">(recover)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Forgot password?</h1>
        {sent ? (
          <div className="card-flat p-6 space-y-3">
            <p>We sent a reset link to <span className="font-semibold">{email}</span>. Check your inbox.</p>
            <Link to="/auth" className="underline text-sm">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 card-flat p-6">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
            <Link to="/auth" className="block text-center text-sm underline text-muted-foreground">Back to sign in</Link>
          </form>
        )}
      </div>
    </Layout>
  );
}
