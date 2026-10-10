"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { refreshStorefront } from "@/lib/refresh-storefront";
import {
  CAMPAIGN_SELECT,
  PLACEMENTS,
  PROMOTION_SELECT,
  campaignStatus,
  toneClass,
  type CampaignStatus,
  type Placement,
  type PromoCampaign,
  type Promotion,
} from "@/lib/promotions";
import { PromotionForm, emptyItem, toItemDraft, type ItemDraft } from "@/components/admin/promotions/PromotionForm";

/*
  Admin → Promotions. A campaign is one event (Diwali Sale, New Year…) with
  dates; inside it: homepage banners, header announcements, a popup and
  product page notices. Everything in a campaign appears at its start and
  disappears at its end, with no one having to switch it on or off.
*/

const STATUS: Record<CampaignStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-success/10 text-success" },
  scheduled: { label: "Scheduled", className: "bg-warning/10 text-warning" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
  off: { label: "Off", className: "bg-muted text-muted-foreground" },
};

const STATUS_ORDER: CampaignStatus[] = ["live", "scheduled", "off", "ended"];

// Name suggestions for a new campaign.
const EVENT_NAMES = ["Diwali Sale", "Dhanteras", "Bhai Dooj", "Christmas", "New Year Sale", "Black Friday", "Valentine's Day", "Holi", "Raksha Bandhan", "Independence Day"];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

function dateRange(campaign: PromoCampaign): string {
  const from = formatDate(campaign.starts_at);
  const to = formatDate(campaign.ends_at);
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}, no end date`;
  if (to) return `Now → ${to}`;
  return "Always on (no dates)";
}

// ISO ↔ <input type="datetime-local"> (local time).
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10";
const labelClass = "block text-sm font-medium";
const hintClass = "mt-1 text-xs text-muted-foreground";

function Switch({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-success" : "bg-zinc-400"}`}
      aria-label={label}
      aria-pressed={on}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function Promotions() {
  const [campaigns, setCampaigns] = useState<PromoCampaign[] | null>(null);
  const [items, setItems] = useState<Promotion[]>([]);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [campaignDraft, setCampaignDraft] = useState<PromoCampaign | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [campaignResult, itemResult] = await Promise.all([
      supabase.from("promo_campaigns").select(CAMPAIGN_SELECT).order("created_at", { ascending: false }),
      supabase.from("promotions").select(PROMOTION_SELECT).order("sort_order"),
    ]);

    const error = campaignResult.error ?? itemResult.error;
    if (error) {
      console.log("Promotions load error:", error);
      setLoadError(error.message.includes("promo") ? "Promotions tables not found. Run the promotions migration in Supabase." : error.message);
      return;
    }

    setLoadError("");
    setCampaigns((campaignResult.data ?? []) as PromoCampaign[]);
    setItems((itemResult.data ?? []) as Promotion[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
  }, [load]);

  // After any change: reload the list and show it on the shop straight away.
  const changed = useCallback(() => {
    refreshStorefront();
    return load();
  }, [load]);

  const toggleCampaign = async (campaign: PromoCampaign) => {
    setBusyId(campaign.id);
    const { error } = await supabase.from("promo_campaigns").update({ is_active: !campaign.is_active }).eq("id", campaign.id);
    setBusyId(null);
    if (error) setNotice(error.message);
    else changed();
  };

  const removeCampaign = async (campaign: PromoCampaign) => {
    const count = items.filter((item) => item.campaign_id === campaign.id).length;
    const what = count ? ` and its ${count} item${count === 1 ? "" : "s"}` : "";
    if (!window.confirm(`Delete “${campaign.name}”${what}? This can't be undone.`)) return;

    setBusyId(campaign.id);
    const { error } = await supabase.from("promo_campaigns").delete().eq("id", campaign.id);
    setBusyId(null);

    if (error) {
      setNotice(error.message);
      return;
    }
    if (openId === campaign.id) setOpenId(null);
    changed();
  };

  const open = campaigns?.find((campaign) => campaign.id === openId) ?? null;

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {loadError ? (
        <>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{loadError}</p>
        </>
      ) : !campaigns ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading promotions…
        </div>
      ) : open ? (
        <CampaignEditor
          campaign={open}
          items={items.filter((item) => item.campaign_id === open.id)}
          busy={busyId === open.id}
          onBack={() => setOpenId(null)}
          onEdit={() => setCampaignDraft(open)}
          onToggle={() => toggleCampaign(open)}
          onDelete={() => removeCampaign(open)}
          onChanged={changed}
          onError={setNotice}
        />
      ) : (
        <CampaignList
          campaigns={campaigns}
          items={items}
          busyId={busyId}
          onNew={() => setCampaignDraft("new")}
          onOpen={setOpenId}
          onToggle={toggleCampaign}
          onDelete={removeCampaign}
        />
      )}

      {campaignDraft && (
        <CampaignForm
          campaign={campaignDraft === "new" ? null : campaignDraft}
          onClose={() => setCampaignDraft(null)}
          onSaved={(id) => {
            setCampaignDraft(null);
            setOpenId(id);
            changed();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Campaign list                               */
/* -------------------------------------------------------------------------- */

function CampaignList({
  campaigns,
  items,
  busyId,
  onNew,
  onOpen,
  onToggle,
  onDelete,
}: {
  campaigns: PromoCampaign[];
  items: Promotion[];
  busyId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onToggle: (campaign: PromoCampaign) => void;
  onDelete: (campaign: PromoCampaign) => void;
}) {
  const sorted = [...campaigns].sort(
    (a, b) => STATUS_ORDER.indexOf(campaignStatus(a)) - STATUS_ORDER.indexOf(campaignStatus(b)) || b.priority - a.priority
  );
  const liveCount = campaigns.filter((campaign) => campaignStatus(campaign) === "live").length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="mt-1 text-muted-foreground">
            Campaigns for festivals and sales: homepage banners, header announcements, a popup and product page notices.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
        >
          <Plus size={16} /> New campaign
        </button>
      </div>

      {liveCount > 1 && (
        <p className="rounded-xl bg-info/10 px-4 py-3 text-sm text-info">
          {liveCount} campaigns are live at once. Their banners and messages all show, highest priority first; only the
          highest-priority popup shows.
        </p>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No campaigns yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create one for your next event, e.g. “Diwali Sale”. Set its dates, add banners and messages, and it goes live
            on its own when the sale starts.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {sorted.map((campaign) => {
              const status = STATUS[campaignStatus(campaign)];
              const own = items.filter((item) => item.campaign_id === campaign.id);
              const banner = own.find((item) => item.placement === "hero_banner" && item.image_url);

              return (
                <li key={campaign.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                  <button type="button" onClick={() => onOpen(campaign.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                    <div className="relative hidden h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
                      {banner ? (
                        <Image src={banner.image_url!} alt="" fill sizes="96px" className="object-cover" />
                      ) : (
                        <Megaphone className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{campaign.name}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                        {campaign.priority > 0 && <span className="text-xs text-muted-foreground">Priority {campaign.priority}</span>}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays size={12} /> {dateRange(campaign)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {own.length === 0
                          ? "Nothing added yet"
                          : PLACEMENTS.map((placement) => {
                              const count = own.filter((item) => item.placement === placement.value).length;
                              return count ? `${count} ${placement.label.toLowerCase()}` : null;
                            })
                              .filter(Boolean)
                              .join(" · ")}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      on={campaign.is_active}
                      onClick={() => onToggle(campaign)}
                      disabled={busyId === campaign.id}
                      label={campaign.is_active ? `Switch off ${campaign.name}` : `Switch on ${campaign.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => onOpen(campaign.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${campaign.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(campaign)}
                      disabled={busyId === campaign.id}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      aria-label={`Delete ${campaign.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Campaign editor                              */
/* -------------------------------------------------------------------------- */

function CampaignEditor({
  campaign,
  items,
  busy,
  onBack,
  onEdit,
  onToggle,
  onDelete,
  onChanged,
  onError,
}: {
  campaign: PromoCampaign;
  items: Promotion[];
  busy: boolean;
  onBack: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const status = STATUS[campaignStatus(campaign)];

  const of = (placement: Placement) =>
    items.filter((item) => item.placement === placement).sort((a, b) => a.sort_order - b.sort_order);

  const run = async (id: string, action: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusyItem(id);
    const { error } = await action();
    setBusyItem(null);
    if (error) onError(error.message);
    onChanged();
  };

  const toggleItem = (item: Promotion) =>
    run(item.id, () => supabase.from("promotions").update({ is_active: !item.is_active }).eq("id", item.id));

  const removeItem = (item: Promotion) => {
    if (!window.confirm("Delete this item? This can't be undone.")) return;
    run(item.id, () => supabase.from("promotions").delete().eq("id", item.id));
  };

  // Swap with the neighbour, then renumber the list 0, 1, 2…
  const move = (list: Promotion[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;

    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    run(list[index].id, async () => {
      const results = await Promise.all(
        reordered.map((item, position) =>
          item.sort_order === position ? null : supabase.from("promotions").update({ sort_order: position }).eq("id", item.id)
        )
      );
      return { error: results.find((result) => result?.error)?.error ?? null };
    });
  };

  return (
    <>
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> All campaigns
        </button>

        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays size={14} /> {dateRange(campaign)}
              {campaign.priority > 0 && ` · Priority ${campaign.priority}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch on={campaign.is_active} onClick={onToggle} disabled={busy} label={campaign.is_active ? "Switch campaign off" : "Switch campaign on"} />
            <button type="button" onClick={onEdit} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <Pencil size={14} /> Edit details
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-xl p-2.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              aria-label="Delete campaign"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {PLACEMENTS.map((placement) => {
        const list = of(placement.value);

        return (
          <section key={placement.value} className="rounded-3xl border border-border bg-surface">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold">{placement.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {placement.description}
                  {placement.value === "popup" && list.length > 1 && " Only the first one is shown."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(emptyItem(placement.value))}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {list.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((item, index) => (
                  <li key={item.id} className={`flex items-center gap-3 px-5 py-3 ${item.is_active ? "" : "opacity-60"}`}>
                    <ItemThumb item={item} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title || <span className="text-muted-foreground">Image only</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          item.body,
                          item.link_url && `→ ${item.link_url}`,
                          item.placement === "product_notice" &&
                            (item.target === "all"
                              ? "All products"
                              : item.target === "categories"
                                ? `${item.category_ids.length} categor${item.category_ids.length === 1 ? "y" : "ies"}`
                                : `${item.product_ids.length} product${item.product_ids.length === 1 ? "" : "s"}`),
                          !item.is_active && "Hidden",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {list.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => move(list, index, -1)}
                            disabled={index === 0 || busyItem !== null}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(list, index, 1)}
                            disabled={index === list.length - 1 || busyItem !== null}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </>
                      )}
                      <Switch
                        on={item.is_active}
                        onClick={() => toggleItem(item)}
                        disabled={busyItem === item.id}
                        label={item.is_active ? "Hide" : "Show"}
                      />
                      <button
                        type="button"
                        onClick={() => setDraft(toItemDraft(item))}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        disabled={busyItem === item.id}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {draft && (
        <PromotionForm
          campaignId={campaign.id}
          draft={draft}
          nextSortOrder={Math.max(-1, ...of(draft.placement).map((item) => item.sort_order)) + 1}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function ItemThumb({ item }: { item: Promotion }) {
  const image = item.image_url;
  if (image) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-lg bg-muted ${item.placement === "hero_banner" ? "h-10 w-24" : "h-10 w-14"}`}>
        <Image src={image} alt="" fill sizes="96px" className="object-cover" />
      </div>
    );
  }
  return <span aria-hidden className={`${toneClass(item.tone)} h-10 w-14 shrink-0 rounded-lg`} />;
}

/* -------------------------------------------------------------------------- */
/*                                Campaign form                               */
/* -------------------------------------------------------------------------- */

function CampaignForm({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: PromoCampaign | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(campaign?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(campaign?.ends_at ?? null));
  const [priority, setPriority] = useState(String(campaign?.priority ?? 0));
  const [isActive, setIsActive] = useState(campaign?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const save = async () => {
    if (!name.trim()) return setError("Give the campaign a name.");
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) return setError("The end must be after the start.");

    const row = {
      name: name.trim(),
      starts_at: fromLocalInput(startsAt),
      ends_at: fromLocalInput(endsAt),
      priority: Math.min(100, Number(priority) || 0),
      is_active: isActive,
    };

    setSaving(true);
    const result = campaign
      ? await supabase.from("promo_campaigns").update(row).eq("id", campaign.id).select("id").single()
      : await supabase.from("promo_campaigns").insert(row).select("id").single();
    setSaving(false);

    if (result.error || !result.data) {
      console.log("Save campaign error:", result.error);
      setError(result.error?.message ?? "Could not save. Are you signed in as an admin?");
      return;
    }

    onSaved(result.data.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-form-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="campaign-form-title" className="text-lg font-semibold">
            {campaign ? "Campaign details" : "New campaign"}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label htmlFor="campaign-name" className={labelClass}>
              Name
            </label>
            <input
              id="campaign-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value.slice(0, 80));
                setError(null);
              }}
              placeholder={`e.g. Diwali Sale ${year}`}
              className={inputClass}
              autoFocus
            />
            <p className={hintClass}>Only you see this.</p>
            {!campaign && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EVENT_NAMES.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => setName(`${event} ${year}`)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  >
                    {event}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="campaign-start" className={labelClass}>
                Starts
              </label>
              <input id="campaign-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} />
              <p className={hintClass}>Empty = straight away.</p>
            </div>
            <div>
              <label htmlFor="campaign-end" className={labelClass}>
                Ends
              </label>
              <input id="campaign-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputClass} />
              <p className={hintClass}>Empty = until you switch it off.</p>
            </div>
          </div>

          <div>
            <label htmlFor="campaign-priority" className={labelClass}>
              Priority
            </label>
            <input
              id="campaign-priority"
              inputMode="numeric"
              value={priority}
              onChange={(event) => setPriority(event.target.value.replace(/\D/g, "").slice(0, 3))}
              className={`${inputClass} max-w-28`}
            />
            <p className={hintClass}>
              0–100. When campaigns overlap (e.g. an always-on campaign and a Diwali sale), the higher number shows first.
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4" />
            On (goes live between the dates above)
          </label>

          {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {campaign ? "Save" : "Create campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
