import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";

export type Address = {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  city: string;
  postal_code: string | null;
};

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) { setAddresses([]); return; }
    setLoading(true);
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAddresses((data || []) as Address[]);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);
  return { addresses, loading, refresh };
}

export default function Addresses() {
  const { user } = useAuth();
  const { addresses, refresh } = useAddresses();
  const [form, setForm] = useState({ label: "Home", line1: "", city: "Brooklyn", postal_code: "" });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!user) return;
    if (!form.line1.trim()) { toast.error("Street address required"); return; }
    if (form.line1.length > 200 || form.label.length > 50) { toast.error("Input too long"); return; }
    setSaving(true);
    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      label: form.label.trim() || "Home",
      line1: form.line1.trim(),
      city: form.city.trim() || "Brooklyn",
      postal_code: form.postal_code.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setForm({ label: "Home", line1: "", city: "Brooklyn", postal_code: "" });
    toast.success("Address saved");
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="label-mono mb-3">(address book)</p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-8">Your saved addresses.</h1>

        <div className="card-flat p-6 mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Add new address</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Label</Label><Input maxLength={50} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home, Work..." /></div>
            <div><Label>Postal code</Label><Input maxLength={20} value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Street address</Label><Input maxLength={200} value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="123 Bedford Ave, Apt 4B" /></div>
            <div className="sm:col-span-2"><Label>City</Label><Input maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <Button onClick={add} disabled={saving} className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Saving..." : "Save address"}
          </Button>
        </div>

        <div className="space-y-3">
          {addresses.length === 0 && <p className="text-muted-foreground text-sm">No addresses saved yet.</p>}
          {addresses.map((a) => (
            <div key={a.id} className="card-flat p-4 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-sm text-muted-foreground">{a.line1}</div>
                  <div className="text-sm text-muted-foreground">{a.city}{a.postal_code ? `, ${a.postal_code}` : ""}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(a.id)} className="rounded-full">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
