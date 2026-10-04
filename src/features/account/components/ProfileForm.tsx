"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/features/auth/store/authStore";

interface ProfileFields {
  first_name: string;
  last_name: string;
  display_name: string;
}

interface ProfileFormProps {
  email: string;
  initial: ProfileFields;
}

const FIELDS: { key: keyof ProfileFields; label: string; autoComplete: string }[] = [
  { key: "first_name", label: "First name", autoComplete: "given-name" },
  { key: "last_name", label: "Last name", autoComplete: "family-name" },
  { key: "display_name", label: "Display name", autoComplete: "nickname" },
];

export function ProfileForm({ email, initial }: ProfileFormProps) {
  const user = useAuthStore((state) => state.user);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [form, setForm] = useState<ProfileFields>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    const values = {
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      display_name: form.display_name.trim() || null,
    };

    if ([values.first_name, values.last_name, values.display_name].some((v) => v && v.length > 100)) {
      setError("Names must be 100 characters or fewer.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    // Only these columns are editable by users (role is locked by column grants).
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("user_id");

    setSaving(false);

    if (updateError || !data?.length) {
      console.log("Profile update error:", updateError);
      setError(updateError?.message ?? "Could not save your profile.");
      return;
    }

    setSaved(true);
    // Refresh the header name.
    fetchProfile(user.id);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-border bg-surface p-6">
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input
          value={email}
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-border bg-background px-4 py-3 text-muted"
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className={`block text-sm ${field.key === "display_name" ? "sm:col-span-2" : ""}`}>
            <span className="font-medium">{field.label}</span>
            <input
              value={form[field.key]}
              onChange={(e) => {
                setForm((current) => ({ ...current, [field.key]: e.target.value }));
                setSaved(false);
              }}
              autoComplete={field.autoComplete}
              disabled={saving}
              maxLength={100}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-[#003D29]/20"
            />
          </label>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check size={16} />
            Saved
          </span>
        )}
        <button
          type="submit"
          disabled={saving || !user}
          className="flex items-center gap-2 rounded-full bg-[#003D29] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#002B1D] disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
