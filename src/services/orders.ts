import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "pending" | "accepted" | "preparing" | "ready" | "picked_up"
  | "out_for_delivery" | "delivered" | "cancelled";

export async function listMyOrders(customerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, restaurants(name, image_url), order_items(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrder(id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, restaurants(name, image_url, city), order_items(*), deliveries(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status: status as never })
    .eq("id", id);
  if (error) throw error;
}

export async function mostOrderedRestaurantIds(customerId: string, limit = 4) {
  const { data, error } = await supabase
    .from("orders")
    .select("restaurant_id")
    .eq("customer_id", customerId)
    .limit(50);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.restaurant_id, (counts.get(r.restaurant_id) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
