import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";
import { evaluatePassword } from "@/lib/passwordStrength";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from URL hash automatically and emits PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (evaluatePassword(password).score < 2) { toast.error("Please choose a stronger password"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); nav("/", { replace: true }); }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="label-mono mb-3">(reset)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Set a new password.</h1>
        <form onSubmit={submit} className="space-y-4 card-flat p-6">
          <div>
            <Label>New password</Label>
            <div className="relative mt-1">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
          </div>
          <div>
            <Label>Confirm password</Label>
            <div className="relative mt-1">
              <Input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="pr-10" />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
            {loading ? "Updating..." : ready ? "Update password" : "Verifying link..."}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
