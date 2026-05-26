import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Pencil, X, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const data = JSON.parse(localStorage.getItem("mock_addresses") || "[]");
      setAddresses(data.filter((a: any) => a.user_id === user.id));
      setLoading(false);
      return;
    }
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
  const navigate = useNavigate();
  const [form, setForm] = useState({ label: "Home", line1: "", city: "Brooklyn", postal_code: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", line1: "", city: "", postal_code: "" });

  const [editOriginal, setEditOriginal] = useState({ label: "", line1: "", city: "", postal_code: "" });
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isDirty = editingId !== null && (
    editForm.label !== editOriginal.label ||
    editForm.line1 !== editOriginal.line1 ||
    editForm.city !== editOriginal.city ||
    editForm.postal_code !== editOriginal.postal_code
  );

  // Warn on browser tab close / refresh / external nav
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function startEdit(a: Address) {
    setEditingId(a.id);
    const snap = { label: a.label, line1: a.line1, city: a.city, postal_code: a.postal_code || "" };
    setEditForm(snap);
    setEditOriginal(snap);
  }
  function requestCancel() {
    if (isDirty) { setConfirmCancel(true); return; }
    setEditingId(null);
  }
  function discardEdit() {
    setConfirmCancel(false);
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editForm.line1.trim()) { toast.error("Street address required"); return; }
    if (editForm.line1.length > 200 || editForm.label.length > 50) { toast.error("Input too long"); return; }
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const data = JSON.parse(localStorage.getItem("mock_addresses") || "[]") as Address[];
      const idx = data.findIndex((a) => a.id === id);
      if (idx !== -1) {
        data[idx] = {
          ...data[idx],
          label: editForm.label.trim() || "Home",
          line1: editForm.line1.trim(),
          city: editForm.city.trim() || "Brooklyn",
          postal_code: editForm.postal_code.trim() || null,
        };
        localStorage.setItem("mock_addresses", JSON.stringify(data));
      }
      toast.success("Address updated");
      setEditingId(null);
      refresh();
      return;
    }

    const { error } = await supabase.from("addresses").update({
      label: editForm.label.trim() || "Home",
      line1: editForm.line1.trim(),
      city: editForm.city.trim() || "Brooklyn",
      postal_code: editForm.postal_code.trim() || null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Address updated");
    setEditingId(null);
    refresh();
  }

  async function add() {
    if (!user) return;
    if (!form.line1.trim()) { toast.error("Street address required"); return; }
    if (form.line1.length > 200 || form.label.length > 50) { toast.error("Input too long"); return; }
    setSaving(true);
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const data = JSON.parse(localStorage.getItem("mock_addresses") || "[]") as Address[];
      data.push({
        id: `address-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        label: form.label.trim() || "Home",
        line1: form.line1.trim(),
        city: form.city.trim() || "Brooklyn",
        postal_code: form.postal_code.trim() || null,
      });
      localStorage.setItem("mock_addresses", JSON.stringify(data));
      setSaving(false);
      setForm({ label: "Home", line1: "", city: "Brooklyn", postal_code: "" });
      toast.success("Address saved");
      refresh();
      return;
    }

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
    const isMock = localStorage.getItem("mock_role") !== null;
    if (isMock) {
      const data = JSON.parse(localStorage.getItem("mock_addresses") || "[]") as Address[];
      const filtered = data.filter((a) => a.id !== id);
      localStorage.setItem("mock_addresses", JSON.stringify(filtered));
      toast.success("Address deleted");
      refresh();
      return;
    }

    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Address deleted");
    refresh();
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-in">
        <Button variant="ghost" size="sm" className="mb-6 inline-flex items-center gap-1 pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
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
            <div key={a.id} className="card-flat p-4">
              {editingId === a.id ? (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Label</Label><Input maxLength={50} value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} /></div>
                    <div><Label>Postal code</Label><Input maxLength={20} value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} /></div>
                    <div className="sm:col-span-2"><Label>Street address</Label><Input maxLength={200} value={editForm.line1} onChange={(e) => setEditForm({ ...editForm, line1: e.target.value })} /></div>
                    <div className="sm:col-span-2"><Label>City</Label><Input maxLength={100} value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(a.id)} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={requestCancel} className="rounded-full">
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold">{a.label}</div>
                      <div className="text-sm text-muted-foreground">{a.line1}</div>
                      <div className="text-sm text-muted-foreground">{a.city}{a.postal_code ? `, ${a.postal_code}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(a)} className="rounded-full">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(a.id)} className="rounded-full">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your edits to this address will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardEdit}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
