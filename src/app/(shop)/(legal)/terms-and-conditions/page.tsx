import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, formatAddress, operatedBy } from "@/lib/business";

export const metadata: Metadata = {
  title: `Terms & Conditions | ${BUSINESS.brandName}`,
  description: `The terms that apply when you use ${BUSINESS.website} and buy from ${BUSINESS.brandName}.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      href="/terms-and-conditions"
      title="Terms & Conditions"
      intro={
        <p>
          These terms apply to your use of {BUSINESS.website} (the &quot;Website&quot;) and to every order you place
          with {BUSINESS.brandName}. By using the Website or placing an order, you agree to them. Please read them
          together with our <Link href="/privacy-policy">Privacy Policy</Link>,{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>, <Link href="/payment-policy">Payment Policy</Link> and{" "}
          <Link href="/cancellation-and-refund-policy">Cancellation &amp; Refund Policy</Link>.
        </p>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        The Website and the {BUSINESS.brandName} brand are owned and operated by <strong>{operatedBy()}</strong>{" "}
        (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), from {formatAddress()}
        {BUSINESS.gstRegistered && BUSINESS.gstin && <> (GSTIN {BUSINESS.gstin})</>}.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You need an account to place an order. You can sign up with your email address or with Google.</li>
        <li>
          You must be at least 18 years old, or use the Website with the involvement of a parent or legal guardian.
        </li>
        <li>
          You are responsible for keeping your login details safe and for all activity on your account. Tell us
          straight away if you think someone else has used it.
        </li>
        <li>The information you give us (name, phone number, address) must be accurate and up to date.</li>
      </ul>

      <h2>3. Our products</h2>
      <ul>
        <li>
          Most of our products are made to order using 3D printing and are finished by hand. Small variations in
          colour, texture, finish and visible print layers are a normal part of the process and are not defects.
        </li>
        <li>
          Product photos are for illustration. Colours can look different on different screens, and dimensions are
          approximate.
        </li>
        <li>
          Product availability shown on the Website can change at any time. Stock is confirmed only when your payment
          succeeds.
        </li>
      </ul>

      <h2>4. Personalised products</h2>
      <p>Some products are made with text or a photo that you provide (for example a name keychain or photo frame).</p>
      <ul>
        <li>
          We make the product exactly as you entered it, so please check spelling, spacing and your photo before
          ordering. We cannot accept returns for mistakes in the details you provided.
        </li>
        <li>
          You confirm that you own, or have permission to use, any photo or text you upload, and that it does not
          infringe anyone&apos;s rights or break any law.
        </li>
        <li>
          We may refuse or cancel (with a full refund) an order whose content is offensive, unlawful, infringes
          someone else&apos;s rights, or cannot be produced to an acceptable quality.
        </li>
        <li>
          If your photo is low resolution, the Website will warn you that the print may look blurry. If you continue,
          you accept the resulting quality.
        </li>
        <li>You allow us to use your uploaded content only to make and deliver your order.</li>
      </ul>

      <h2>5. Prices</h2>
      <ul>
        <li>All prices are in Indian Rupees (₹).</li>
        {BUSINESS.gstRegistered ? (
          <li>Prices include applicable taxes (GST).</li>
        ) : (
          <li>
            The price shown is the final price of the product. We are not registered under GST, so no GST is charged
            and we do not issue GST tax invoices.
          </li>
        )}
        <li>Shipping charges, if any, are shown at checkout before you pay.</li>
        <li>
          The price you pay is the one shown at checkout when you place the order. If a product was clearly listed at
          a wrong price because of an error, we may cancel the order and refund you in full.
        </li>
      </ul>

      <h3>Coupons</h3>
      <ul>
        <li>One coupon can be used per order. Coupons have no cash value and cannot be exchanged.</li>
        <li>
          Each coupon may have its own conditions, such as a minimum order value, an end date or a limit on how many
          times it can be used. These are checked when you place the order.
        </li>
        <li>Coupons apply to the products in your order, not to shipping charges.</li>
        <li>
          If you cancel or return an order, the refund is the amount you actually paid. A used coupon is not
          reissued.
        </li>
        <li>We may withdraw or change a coupon at any time, or cancel orders that misuse coupons.</li>
      </ul>

      <h2>6. Orders</h2>
      <ul>
        <li>
          Your order is confirmed only after your payment succeeds. You will see the confirmation on your order page.
        </li>
        <li>
          We may decline or cancel an order (for example if a product becomes unavailable, there is a pricing error,
          or we suspect fraud). If you have already paid, we refund the full amount to your original payment method.
        </li>
        <li>You can follow every order from the &quot;My Orders&quot; section of your account.</li>
      </ul>

      <h2>7. Payment, shipping, cancellations and refunds</h2>
      <p>
        These are covered in detail in our <Link href="/payment-policy">Payment Policy</Link>,{" "}
        <Link href="/shipping-policy">Shipping Policy</Link>, <Link href="/delivery-policy">Delivery Policy</Link> and{" "}
        <Link href="/cancellation-and-refund-policy">Cancellation &amp; Refund Policy</Link>, which form part of these
        terms.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Website&apos;s design, text, photographs, product designs and logos belong to us or our licensors. You
        may not copy, reproduce, resell or use them commercially without our written permission. Names and marks of
        third parties belong to their respective owners.
      </p>

      <h2>9. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Website for any unlawful or fraudulent purpose;</li>
        <li>try to gain unauthorised access to the Website, other accounts or our systems;</li>
        <li>upload content that is unlawful, offensive, or infringes someone else&apos;s rights;</li>
        <li>interfere with the Website&apos;s operation, or copy its content with automated tools.</li>
      </ul>

      <h2>10. Limitation of liability</h2>
      <p>
        To the extent permitted by law, our total liability for any claim relating to an order is limited to the
        amount you paid for that order. We are not liable for indirect or consequential losses, or for delays caused by
        events outside our reasonable control (such as courier disruptions, natural disasters, strikes or government
        action). Nothing in these terms limits your rights under the Consumer Protection Act, 2019.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to compensate us for any loss we suffer because you broke these terms or because content you
        uploaded infringed someone else&apos;s rights.
      </p>

      <h2>12. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Courts at {BUSINESS.jurisdictionCity}, {BUSINESS.address.state}{" "}
        have jurisdiction over any dispute, without affecting any right you have to approach a consumer commission.
        Please contact us first: most issues can be resolved quickly.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. The version on this page, with its effective date, applies to
        orders placed from that date.
      </p>

      <h2>14. Contact and grievances</h2>
      <p>
        Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call {BUSINESS.phone} (
        {BUSINESS.supportHours}). Complaints can also be sent to our Grievance Officer — see{" "}
        <Link href="/contact-us">Contact Us</Link>.
      </p>
    </LegalPage>
  );
}
