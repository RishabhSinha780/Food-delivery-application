import { supabase } from "@/integrations/supabase/client";

export async function listMyDeliveries(partnerId: string) {
  const { data, error } = await supabase
    .from("deliveries")
    .select("*, orders(*, restaurants(name, city))")
    .or(`partner_id.eq.${partnerId},partner_id.is.null`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acceptDelivery(deliveryId: string, partnerId: string) {
  const { error } = await supabase
    .from("deliveries")
    .update({ partner_id: partnerId, status: "assigned" as never })
    .eq("id", deliveryId);
  if (error) throw error;
}

export async function updateDeliveryStatus(deliveryId: string, status: string, etaMinutes?: number) {
  const patch: Record<string, unknown> = { status };
  if (etaMinutes !== undefined) patch.eta_minutes = etaMinutes;
  const { error } = await supabase.from("deliveries").update(patch).eq("id", deliveryId);
  if (error) throw error;
}
