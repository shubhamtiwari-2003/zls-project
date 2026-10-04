"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Store,
  Upload,
  Phone,
  Mail,
  Truck,
//   Instagram,
  Globe,
  Save,
} from "lucide-react";

export default function Settings() {
  const [form, setForm] = useState({
    storeName: "Z Layer Studio",
    email: "support@zlayerstudio.com",
    phone: "+91 9876543210",
    website: "www.zlayerstudio.com",
    instagram: "@zlayerstudio",
    shippingCharge: 0,
    freeShippingAbove: 999,
    processingDays: "2-4",
  });

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted">
          Manage your store branding and business configuration.
        </p>
      </div>

      {/* Store Info */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Store size={20} />
          <h2 className="text-xl font-semibold">Store Information</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Store Name
            </label>
            <input
              value={form.storeName}
              onChange={(e) => update("storeName", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Website
            </label>
            <input
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-5 text-xl font-semibold">Brand Assets</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo */}
          <div>
            <label className="mb-3 block text-sm font-medium">
              Store Logo
            </label>

            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border bg-background">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain p-3"
                />
              </div>

              <button className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 hover:bg-surface-secondary">
                <Upload size={16} />
                Upload
              </button>
            </div>
          </div>

          {/* Hero Banner */}
          <div>
            <label className="mb-3 block text-sm font-medium">
              Hero Banner
            </label>

            <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center">
              <Upload className="mx-auto" />
              <p className="mt-2 text-sm">Upload homepage banner</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-5 text-xl font-semibold">Contact</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Mail size={15} />
              Email
            </label>

            <input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Phone size={15} />
              Phone
            </label>

            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>
        </div>
      </section>

      {/* Shipping */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Truck size={20} />
          <h2 className="text-xl font-semibold">Shipping Rules</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Shipping Charge
            </label>

            <input
              type="number"
              value={form.shippingCharge}
              onChange={(e) =>
                update("shippingCharge", Number(e.target.value))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Free Above
            </label>

            <input
              type="number"
              value={form.freeShippingAbove}
              onChange={(e) =>
                update("freeShippingAbove", Number(e.target.value))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Processing Days
            </label>

            <input
              value={form.processingDays}
              onChange={(e) =>
                update("processingDays", e.target.value)
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          {/* <Instagram size={20} /> */}
          <h2 className="text-xl font-semibold">Social Media</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Instagram
            </label>

            <input
              value={form.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Globe size={15} />
              Website
            </label>

            <input
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3"
            />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 font-medium text-background hover:opacity-90">
          <Save size={18} />
          Save Changes
        </button>
      </div>
    </div>
  );
}