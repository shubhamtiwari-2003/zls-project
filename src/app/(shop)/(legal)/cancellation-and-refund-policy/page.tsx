import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, POLICY_TERMS } from "@/lib/business";

export const metadata: Metadata = {
  title: `Cancellation & Refund Policy | ${BUSINESS.brandName}`,
  description: `How to cancel an order, return a product or get a refund from ${BUSINESS.brandName}.`,
};

export default function CancellationRefundPolicyPage() {
  return (
    <LegalPage
      href="/cancellation-and-refund-policy"
      title="Cancellation & Refund Policy"
      intro={
        <p>
          Most of our products are made to order, and some are personalised just for you. This policy explains when
          an order can be cancelled or returned, and how refunds work.
        </p>
      }
    >
      <h2>1. Cancelling an order</h2>
      <ul>
        <li>
          <strong>Before production starts:</strong> you can cancel for a full refund while your order shows as
          &quot;New order&quot; on your order page. Email or call us with your order number.
        </li>
        <li>
          <strong>After production starts</strong> (status &quot;Printing&quot; or later): the order is being made for
          you and can no longer be cancelled.
        </li>
        <li>
          <strong>Unpaid orders</strong> are cancelled automatically if payment is not completed, and nothing is
          charged.
        </li>
        <li>
          <strong>Cancelled by us:</strong> if we cannot fulfil your order (for example the product is unavailable or
          your PIN code cannot be served), we cancel it and refund you in full.
        </li>
      </ul>

      <h2>2. Damaged, defective or wrong items</h2>
      <p>
        If your order arrives damaged, defective, incomplete or different from what you ordered, tell us within{" "}
        <strong>{POLICY_TERMS.damageReportHours} hours of delivery</strong> with your order number and photos of the
        product and packaging (and the unboxing video, if you have one). After checking, we will offer a{" "}
        <strong>free replacement or a full refund</strong>, including any shipping charge. This applies to all products,
        including personalised ones.
      </p>

      <h2>3. Returns of standard products</h2>
      <p>
        Standard (non-personalised) products can be returned within{" "}
        <strong>{POLICY_TERMS.returnWindowDays} days of delivery</strong> if you change your mind, provided they are:
      </p>
      <ul>
        <li>unused and in the same condition you received them;</li>
        <li>in the original packaging, with all parts included.</li>
      </ul>
      <p>
        Contact us to start a return. You will need to send the product back to us or pay the reverse pickup charge, and
        the original shipping charge is not refunded. Once we receive and check the product, we refund the product
        price.
      </p>

      <h2>4. Personalised products</h2>
      <p>
        Products made with your name, text or photo are made only for you and cannot be resold, so they{" "}
        <strong>cannot be returned or exchanged</strong> for change of mind or for mistakes in the details you
        entered. They are still fully covered if they arrive damaged, defective or wrong (section 2).
      </p>

      <h2>5. Natural variations</h2>
      <p>
        3D-printed and hand-finished products have small variations in colour, texture and visible print layers. These
        are part of the process and are not considered defects.
      </p>

      <h2>6. How refunds are paid</h2>
      <ul>
        <li>Refunds go back to your original payment method (card, UPI, net banking or wallet) through Razorpay.</li>
        <li>
          We start the refund within 2 business days of approving it. It then reaches your account within{" "}
          {POLICY_TERMS.refundDays}, depending on your bank.
        </li>
        <li>We do not offer refunds in cash.</li>
      </ul>

      <h2>7. How to contact us</h2>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone} ({BUSINESS.supportHours})
        with your order number. You can find your orders in <Link href="/orders">My Orders</Link>.
      </p>
    </LegalPage>
  );
}
