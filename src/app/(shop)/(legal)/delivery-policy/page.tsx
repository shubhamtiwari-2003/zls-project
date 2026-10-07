import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, POLICY_TERMS } from "@/lib/business";
import { FULFILLMENT_STEPS } from "@/lib/order-status";

export const metadata: Metadata = {
  title: `Delivery Policy | ${BUSINESS.brandName}`,
  description: `Delivery timelines, tracking and what to do if your ${BUSINESS.brandName} order arrives damaged.`,
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  printing: "Your order is being made and finished.",
  out_for_shipping: "Packed and handed to our courier partner. Tracking details are now available.",
  in_transit: "On its way to your city.",
  out_for_delivery: "With the delivery agent, arriving today.",
  delivered: "Delivered to your address.",
};

export default function DeliveryPolicyPage() {
  return (
    <LegalPage
      href="/delivery-policy"
      title="Delivery Policy"
      intro={
        <p>
          This policy explains how long delivery takes after your order ships, how to follow it, and what to do if
          something goes wrong. Shipping charges and preparation times are in our{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>
      }
    >
      <h2>1. Delivery timelines</h2>
      <p>After your order is dispatched, delivery usually takes:</p>
      <table>
        <thead>
          <tr>
            <th>Destination</th>
            <th>Estimated delivery after dispatch</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Metro cities</td>
            <td>{POLICY_TERMS.deliveryDaysMetro}</td>
          </tr>
          <tr>
            <td>Rest of India</td>
            <td>{POLICY_TERMS.deliveryDaysOther}</td>
          </tr>
        </tbody>
      </table>
      <p>
        Add our preparation time (see the <Link href="/shipping-policy">Shipping Policy</Link>) to estimate when your
        order will arrive. These are estimates, not guarantees: remote areas, festivals, weather and courier delays can
        add time.
      </p>

      <h2>2. Tracking your order</h2>
      <p>
        Follow your order anytime in <Link href="/orders">My Orders</Link>. It moves through these stages:
      </p>
      <ol>
        {FULFILLMENT_STEPS.map((step) => (
          <li key={step.value}>
            <strong>{step.label}</strong> — {STEP_DESCRIPTIONS[step.value]}
          </li>
        ))}
      </ol>
      <p>Once your order is shipped, the courier name and tracking number are shown on the order page.</p>

      <h2>3. Receiving your order</h2>
      <ul>
        <li>
          The courier may call the phone number on your order before delivering. Please keep it reachable.
        </li>
        <li>
          If the outer package looks opened, tampered with or badly damaged, you may refuse to accept it and contact us
          straight away.
        </li>
        <li>
          We strongly recommend recording a continuous video while opening the package. It helps us settle any damage
          claim quickly.
        </li>
      </ul>

      <h2>4. Failed delivery</h2>
      <p>
        The courier usually makes up to three delivery attempts. If delivery fails (for example because nobody was
        available, the address was incomplete or the package was refused without reason), the order is returned to
        us. We can then reship it once you pay the shipping charge again, or cancel it and refund the product amount
        minus the shipping costs incurred.
      </p>

      <h2>5. Damaged, defective or wrong items</h2>
      <p>
        If your order arrives damaged, defective, incomplete or different from what you ordered, contact us within{" "}
        <strong>{POLICY_TERMS.damageReportHours} hours of delivery</strong> with:
      </p>
      <ul>
        <li>your order number;</li>
        <li>photos of the product and the packaging;</li>
        <li>the unboxing video, if you recorded one.</li>
      </ul>
      <p>
        Once verified, we will send a replacement or give you a full refund, at no extra cost. Details are in our{" "}
        <Link href="/cancellation-and-refund-policy">Cancellation &amp; Refund Policy</Link>.
      </p>

      <h2>6. Shown as delivered but not received</h2>
      <p>
        Check with family, neighbours and building security first. If you still cannot find it, contact us within{" "}
        {POLICY_TERMS.damageReportHours} hours and we will raise an investigation with the courier.
      </p>

      <h2>7. Contact</h2>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone} ({BUSINESS.supportHours}).
      </p>
    </LegalPage>
  );
}
