import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/features/account/components/ProfileForm";
import { AddressBook } from "@/features/account/components/AddressBook";
import { listAddresses } from "@/lib/addresses.server";
import type { SavedAddress } from "@/lib/checkout-validation";

export const metadata: Metadata = {
  title: "Profile | Z Layer Studio",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/account");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) console.error("Profile load error:", error);

  let addresses: SavedAddress[] = [];

  try {
    addresses = await listAddresses(supabase, user.id);
  } catch (addressError) {
    console.error("Saved addresses error:", addressError);
  }

  const defaultName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.display_name ||
    "";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Link
            href="/orders"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-foreground/40"
          >
            <Package size={16} />
            My Orders
          </Link>
        </div>

        <ProfileForm
          email={user.email ?? ""}
          initial={{
            first_name: profile?.first_name ?? "",
            last_name: profile?.last_name ?? "",
            display_name: profile?.display_name ?? "",
          }}
        />

        <AddressBook initialAddresses={addresses} defaultName={defaultName} />
      </section>
    </main>
  );
}
