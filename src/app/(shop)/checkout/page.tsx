import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listAddresses } from "@/lib/addresses.server";
import type { SavedAddress } from "@/lib/checkout-validation";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout | Z Layer Studio",
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login is required to place an order.
  if (!user) {
    redirect("/sign-in?next=/checkout");
  }

  // Address book: most recently used first. Archived (replaced) ones hidden.
  let savedAddresses: SavedAddress[] = [];

  try {
    savedAddresses = await listAddresses(supabase, user.id);
  } catch (error) {
    console.error("Saved addresses error:", error);
  }

  return (
    <CheckoutForm
      email={user.email ?? ""}
      defaultName={(user.user_metadata?.full_name as string | undefined) ?? ""}
      savedAddresses={savedAddresses}
    />
  );
}
