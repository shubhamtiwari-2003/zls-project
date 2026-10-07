import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, POLICY_TERMS } from "@/lib/business";
import { getShopSettings } from "@/lib/shop-settings.server";

export const metadata: Metadata = {
  title: `Payment Policy | ${BUSINESS.brandName}`,
  description: `Accepted payment methods, payment security and failed payments at ${BUSINESS.brandName}.`,
};

export default async function PaymentPolicyPage() {
  const { paymentWindowMinutes: paymentMinutes, orderReservationMinutes } = await getShopSettings();

  return (
    <LegalPage
      href="/payment-policy"
      title="Payment Policy"
      intro={
        <p>
          This policy explains how you can pay on {BUSINESS.website}, how your payment is kept secure and what happens
          if a payment fails.
        </p>
      }
    >
      <h2>1. Payment gateway</h2>
      <p>
        All online payments are processed securely by <strong>Razorpay</strong>, an RBI-authorised payment
        aggregator. When you click &quot;Pay&quot; at checkout, Razorpay&apos;s secure payment window opens on our
        site, where you complete the payment.
      </p>

      <h2>2. Accepted payment methods</h2>
      <ul>
        <li>UPI (Google Pay, PhonePe, Paytm, BHIM and other UPI apps)</li>
        <li>Credit and debit cards (Visa, Mastercard, RuPay and others supported by Razorpay)</li>
        <li>Net banking from major Indian banks</li>
        <li>Wallets and other methods shown in the Razorpay window</li>
      </ul>
      <p>
        The methods available to you are shown in the payment window and may change from time to time.{" "}
        <strong>Cash on delivery is not available.</strong>
      </p>

      <h2>3. Prices, currency and invoices</h2>
      <ul>
        <li>All payments are in Indian Rupees (₹).</li>
        <li>
          {BUSINESS.gstRegistered
            ? "Prices include applicable GST."
            : "Prices shown are final: we are not registered under GST, so no GST is charged."}{" "}
          Any shipping charge is shown before you pay.
        </li>
        <li>The amount charged is always the total shown at checkout, calculated by our system from current prices.</li>
        <li>
          Your order page shows a full breakdown of what you paid.
          {BUSINESS.gstRegistered
            ? " Need a GST invoice? Contact us with your order number and we will send it."
            : " As we are not GST-registered, we cannot issue GST tax invoices."}
        </li>
      </ul>

      <h2>4. When your order is confirmed</h2>
      <p>
        Your order is confirmed only after Razorpay confirms that the payment succeeded. You will be taken to your order
        page, where the payment status is shown.
      </p>
      <ul>
        <li>The payment window stays open for {paymentMinutes} minutes.</li>
        <li>
          Items in an unpaid order are held for you for {orderReservationMinutes} minutes. After that the order is
          cancelled automatically and the items are released.
        </li>
      </ul>

      <h2>5. Failed or interrupted payments</h2>
      <ul>
        <li>
          If a payment fails, you are not charged and can try again. Your cart stays saved.
        </li>
        <li>
          If money was debited but the order was not confirmed (for example due to a network issue), the amount is
          refunded automatically to your original payment method, usually within {POLICY_TERMS.refundDays}. If it is
          not, contact us with your bank reference and we will help.
        </li>
        <li>If you are accidentally charged twice for the same order, the extra amount is refunded in full.</li>
      </ul>

      <h2>6. Refunds</h2>
      <p>
        Approved refunds are made to the original payment method through Razorpay within {POLICY_TERMS.refundDays}. The
        time for the money to show in your account depends on your bank. See our{" "}
        <Link href="/cancellation-and-refund-policy">Cancellation &amp; Refund Policy</Link>.
      </p>

      <h2>7. Payment security</h2>
      <ul>
        <li>
          Your card, UPI and bank details are entered directly on Razorpay&apos;s PCI-DSS compliant checkout and are
          never stored on our servers.
        </li>
        <li>Every payment is verified on our server before an order is confirmed.</li>
        <li>
          We will never ask for your card number, CVV, UPI PIN or OTP by phone, email or message. Do not share them with
          anyone.
        </li>
      </ul>

      <h2>8. Chargebacks and disputes</h2>
      <p>
        If something is wrong with a payment, please contact us first so we can resolve it quickly. If you raise a
        chargeback with your bank, we will share the order and delivery details with the bank and Razorpay to resolve
        it.
      </p>

      <h2>9. Contact</h2>
      <p>
        For payment questions, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone}{" "}
        with your order number and payment reference.
      </p>
    </LegalPage>
  );
}
