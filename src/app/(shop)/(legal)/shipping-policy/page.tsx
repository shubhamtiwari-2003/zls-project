import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, POLICY_TERMS } from "@/lib/business";
import { formatINR } from "@/lib/shop-config";
import { getShopSettings } from "@/lib/shop-settings.server";

export const metadata: Metadata = {
  title: `Shipping Policy | ${BUSINESS.brandName}`,
  description: `Shipping charges, processing times and coverage for ${BUSINESS.brandName} orders.`,
};

export default async function ShippingPolicyPage() {
  const { freeShippingThreshold, shippingFee } = await getShopSettings();

  return (
    <LegalPage
      href="/shipping-policy"
      title="Shipping Policy"
      intro={
        <p>
          This policy explains where we ship, what shipping costs and how long it takes us to get your order ready.
          For delivery timelines, tracking and what happens at your door, see our{" "}
          <Link href="/delivery-policy">Delivery Policy</Link>.
        </p>
      }
    >
      <h2>1. Where we ship</h2>
      <p>
        We currently ship to {POLICY_TERMS.shipsTo}. We do not ship internationally at the moment. If your PIN code is
        not serviceable by our courier partners, we will contact you and, if it cannot be delivered, cancel the order
        with a full refund.
      </p>

      <h2>2. Shipping charges</h2>
      <table>
        <thead>
          <tr>
            <th>Order value</th>
            <th>Shipping charge</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{formatINR(freeShippingThreshold)} and above</td>
            <td>
              <strong>Free</strong>
            </td>
          </tr>
          <tr>
            <td>Below {formatINR(freeShippingThreshold)}</td>
            <td>{formatINR(shippingFee)} per order</td>
          </tr>
        </tbody>
      </table>
      <p>
        The shipping charge is shown in your cart and at checkout before you pay. There are no hidden charges at
        delivery. Cash on delivery is not available.
      </p>

      <h2>3. Processing time</h2>
      <p>
        Most of our products are 3D printed and finished by hand after you order, so we need some time before we can
        hand your order to the courier:
      </p>
      <ul>
        <li>
          <strong>Standard products:</strong> dispatched within {POLICY_TERMS.processingDays}.
        </li>
        <li>
          <strong>Personalised products</strong> (with your name, text or photo): dispatched within{" "}
          {POLICY_TERMS.personalisedProcessingDays}.
        </li>
      </ul>
      <p>
        Business days are Monday to Saturday, excluding public holidays. Processing starts once your payment is
        confirmed. Orders with several products are usually shipped together, once every item is ready.
      </p>

      <h2>4. Dispatch and tracking</h2>
      <ul>
        <li>
          When your order ships, its status changes to &quot;Out for shipping&quot; and the courier name and tracking
          number appear on your order page in <Link href="/orders">My Orders</Link>.
        </li>
        <li>We ship through reputed courier partners chosen for your PIN code.</li>
      </ul>

      <h2>5. Your shipping address</h2>
      <ul>
        <li>
          Please make sure your address, PIN code and phone number are correct and complete. The courier will call this
          number to deliver.
        </li>
        <li>
          Need to change the address? Contact us before the order ships. Once it has shipped, we may not be able to
          change it.
        </li>
        <li>
          If an order is returned to us because of an incorrect address or because nobody could receive it, we can
          reship it after you pay the shipping charge again.
        </li>
      </ul>

      <h2>6. Delays</h2>
      <p>
        Delays can happen during festivals, sales, extreme weather or other events outside our control. If your order
        will be noticeably delayed, we will let you know.
      </p>

      <h2>7. Questions</h2>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone} with your order number.
      </p>
    </LegalPage>
  );
}
