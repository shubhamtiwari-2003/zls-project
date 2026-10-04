import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCartItems, priceCart } from "@/lib/pricing.server";
import {
  normalizeAddress,
  validateAddress,
  type ShippingAddress,
} from "@/lib/checkout-validation";
import { createRazorpayOrder, razorpayKeyId } from "@/lib/razorpay.server";
import { cancelOrder, expireStaleOrders } from "@/lib/orders.server";

export const runtime = "nodejs";

/**
 * Creates an order and a matching Razorpay order.
 *
 * The browser sends only variant IDs, quantities, customization values and
 * the address. Every amount is computed here from the database, so a
 * tampered cart cannot change what the customer is charged.
 *
 * Body: { items: [{ key, variantId, quantity, customization? }] } plus ONE of:
 *   { addressId }                         → use a saved address
 *   { address, replacesAddressId? }       → new address, or an edit of a
 *                                           saved one (saved as a new row)
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asUuid = (value: unknown): string | null =>
  typeof value === "string" && UUID_RE.test(value) ? value : null;
export async function POST(request: Request) {
  try {
    // 1. Signed-in user only
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in to check out." }, { status: 401 });
    }

    // 2. Validate input
    let body: {
      items?: unknown;
      address?: unknown;
      addressId?: unknown;
      replacesAddressId?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const items = parseCartItems(body?.items);

    if (!items) {
      return NextResponse.json({ error: "Your cart is empty or invalid." }, { status: 400 });
    }

    const addressId = asUuid(body?.addressId);
    let address: ShippingAddress | null = null;

    if (addressId) {
      // Saved address: RLS only returns it if it belongs to this user.
      const { data: saved } = await supabase
        .from("addresses")
        .select("full_name, phone, line1, line2, city, state, postal_code")
        .eq("id", addressId)
        .is("archived_at", null)
        .maybeSingle();

      if (!saved) {
        return NextResponse.json(
          { error: "That saved address no longer exists. Please choose another." },
          { status: 400 }
        );
      }

      address = normalizeAddress(saved);
    } else {
      address = normalizeAddress(body?.address);
      const fieldErrors = validateAddress(address);

      if (Object.keys(fieldErrors).length) {
        return NextResponse.json(
          { error: "Please fix the highlighted fields.", fieldErrors },
          { status: 400 }
        );
      }
    }

    // 3. Release stock held by abandoned checkouts, then price from the DB
    const admin = createAdminClient();

    try {
      await expireStaleOrders(admin);
    } catch (error) {
      // Not fatal: the cron job (/api/orders/expire) also does this.
      console.error("Expire stale orders error:", error);
    }

    const { quote, snapshots } = await priceCart(supabase, items);

    if (quote.invalid.length) {
      return NextResponse.json(
        { error: "Some personalised items need your attention. Please review your cart.", quote },
        { status: 409 }
      );
    }

    if (quote.unavailable.length || quote.outOfStock.length) {
      return NextResponse.json(
        { error: "Some items in your cart are out of stock or no longer available.", quote },
        { status: 409 }
      );
    }

    if (quote.adjusted.length) {
      return NextResponse.json(
        {
          error: "Some quantities were reduced to match available stock. Please review your order.",
          quote,
        },
        { status: 409 }
      );
    }

    if (!quote.lines.length) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // 4. Resolve address + create order + items + reserve stock, in one transaction

    const { data: created, error: createError } = await admin.rpc("create_order", {
      p_user_id: user.id,
      p_address_id: addressId,
      p_address: addressId ? null : address,
      p_replaces_address_id: addressId ? null : asUuid(body?.replacesAddressId),
      p_items: quote.lines.map((line) => ({
        product_id: line.productId,
        variant_id: line.variantId,
        product_name: line.name,
        variant_title: line.variantTitle,
        image_url: line.image,
        sku: line.sku,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        total_price: line.lineTotal,
        customization: snapshots.get(line.lineKey)?.length ? snapshots.get(line.lineKey) : null,
        customization_key: line.customizationKey,
      })),
      p_subtotal: quote.subtotal,
      p_shipping: quote.shipping,
      p_total: quote.total,
    });

    // Stock is re-checked inside the transaction (order_items trigger), in
    // case someone else bought the last units since the quote.
    if (createError?.message.includes("Insufficient stock")) {
      return NextResponse.json(
        { error: "Sorry — an item just sold out. Please review your cart." },
        { status: 409 }
      );
    }

    if (createError || !created) {
      throw new Error(createError?.message ?? "Order creation returned no data.");
    }

    const { id: orderId, order_number: orderNumber } = created as {
      id: string;
      order_number: string;
    };

    // 5. Create the Razorpay order for the server-computed total
    let razorpayOrder;

    try {
      razorpayOrder = await createRazorpayOrder({
        amountPaise: quote.total * 100,
        receipt: orderNumber,
        notes: { order_id: orderId, user_id: user.id },
      });
    } catch (error) {
      console.error("Razorpay order error:", error);

      // Cancel and release the reserved stock.
      await cancelOrder(admin, orderId).catch((cancelError) =>
        console.error("Cancel after Razorpay failure error:", cancelError)
      );

      return NextResponse.json(
        { error: "Could not start the payment. Please try again." },
        { status: 502 }
      );
    }

    const { error: linkError } = await admin
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", orderId);

    if (linkError) throw new Error(linkError.message);

    return NextResponse.json({
      orderId,
      orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayKeyId(),
      prefill: {
        name: address.full_name,
        email: user.email ?? "",
        contact: address.phone,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);

    return NextResponse.json(
      { error: "Something went wrong while placing your order." },
      { status: 500 }
    );
  }
}
