import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, POLICY_TERMS, operatedBy } from "@/lib/business";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BUSINESS.brandName}`,
  description: `How ${BUSINESS.brandName} collects, uses and protects your personal information.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      href="/privacy-policy"
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal information {BUSINESS.brandName}, operated by {operatedBy()}{" "}
          (&quot;we&quot;), collects when you use {BUSINESS.website}, why we collect it, who we share it with and the
          choices you have. Your rights over your data, and how to use them, are set out in our{" "}
          <Link href="/data-privacy-policy">Data Privacy Policy</Link>.
        </p>
      }
    >
      <h2>1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Account details:</strong> your name and email address, or the name, email and profile photo shared
          by Google if you sign in with Google.
        </li>
        <li>
          <strong>Delivery details:</strong> name, phone number and shipping addresses. Addresses you use are saved to
          your account so you can pick them next time.
        </li>
        <li>
          <strong>Order details:</strong> the products, quantities and prices of your orders.
        </li>
        <li>
          <strong>Personalisation:</strong> text you enter (such as a name for a keychain) and photos you upload for
          personalised products.
        </li>
        <li>
          <strong>Messages:</strong> anything you send us by email or phone.
        </li>
      </ul>

      <h3>Information collected automatically</h3>
      <ul>
        <li>Basic technical data such as IP address, browser type and device, used for security and to run the site.</li>
        <li>
          Cookies and browser storage that keep you signed in, remember your cart and remember settings such as light
          or dark mode (see section 5).
        </li>
      </ul>

      <h3>Payment information</h3>
      <p>
        Payments are processed by <strong>Razorpay</strong>. Your card, UPI and bank details are entered on
        Razorpay&apos;s secure checkout and are <strong>never stored on our servers</strong>. We receive only the
        payment reference, amount, status and payment method needed to confirm your order and handle refunds.
      </p>

      <h2>2. How we use your information</h2>
      <ul>
        <li>to create and manage your account;</li>
        <li>to process payments, make your products and deliver your orders;</li>
        <li>to produce personalised products using the text and photos you provide;</li>
        <li>to send order confirmations, shipping updates and replies to your questions;</li>
        <li>to process cancellations, returns and refunds;</li>
        <li>to prevent fraud and keep the Website secure;</li>
        <li>to keep the records the law requires and to handle disputes.</li>
      </ul>
      <p>
        We do not sell your personal information. We will only send you marketing messages if you have chosen to
        receive them, and you can opt out at any time.
      </p>

      <h2>3. Who we share it with</h2>
      <p>We share information only with the service providers who help us run the store, and only what they need:</p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Razorpay</td>
            <td>Payment processing and refunds</td>
          </tr>
          <tr>
            <td>Courier and logistics partners</td>
            <td>Delivering your order (name, phone number and address)</td>
          </tr>
          <tr>
            <td>Supabase</td>
            <td>Secure hosting of accounts, orders and addresses</td>
          </tr>
          <tr>
            <td>Cloudinary</td>
            <td>Storing product images and, privately, the photos you upload</td>
          </tr>
          <tr>
            <td>Google</td>
            <td>Sign-in, if you choose &quot;Continue with Google&quot;</td>
          </tr>
          <tr>
            <td>Website hosting provider</td>
            <td>Running the Website</td>
          </tr>
        </tbody>
      </table>
      <p>
        We may also disclose information when required by law, by a court or government authority, or to protect our
        rights and the safety of others.
      </p>

      <h2>4. Your uploaded photos</h2>
      <ul>
        <li>Photos you upload for personalised products are stored privately and are not publicly accessible.</li>
        <li>Only you and our production team can view them, and only to make your order.</li>
        <li>
          Photos that never become part of an order are deleted automatically after {POLICY_TERMS.uploadRetentionDays}{" "}
          days.
        </li>
      </ul>

      <h2>5. Cookies and browser storage</h2>
      <p>We use only what the Website needs to work:</p>
      <ul>
        <li>
          <strong>Sign-in cookies</strong> that keep you logged in securely.
        </li>
        <li>
          <strong>Browser storage</strong> that remembers your cart (also saved to your account when you are signed
          in) and your light/dark theme.
        </li>
      </ul>
      <p>
        We do not use advertising cookies. You can clear cookies in your browser settings, but you will then be signed
        out and the Website may not work correctly.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your information only as long as needed for the purposes above, or as long as the law requires (for
        example, order and payment records). Details are in our{" "}
        <Link href="/data-privacy-policy">Data Privacy Policy</Link>.
      </p>

      <h2>7. Security</h2>
      <p>
        Your data is sent over encrypted (HTTPS) connections and stored with providers that use industry-standard
        security. Access to your account data is restricted by account-level permissions, and only authorised staff
        can see order details. No system is completely secure, so please use a strong password and keep it private.
      </p>

      <h2>8. Your choices</h2>
      <ul>
        <li>You can view and update your profile and saved addresses on your account page.</li>
        <li>
          You can ask us to access, correct or delete your data, or withdraw consent, as described in our{" "}
          <Link href="/data-privacy-policy">Data Privacy Policy</Link>.
        </li>
      </ul>

      <h2>9. Children</h2>
      <p>
        The Website is not intended for children under 18 to use on their own. We do not knowingly collect children&apos;s
        data without the consent of a parent or guardian.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Changes take effect when published on this page with a new
        effective date.
      </p>

      <h2>11. Contact</h2>
      <p>
        For any privacy question, email <a href={`mailto:${BUSINESS.grievanceOfficer.email}`}>{BUSINESS.grievanceOfficer.email}</a>{" "}
        or see <Link href="/contact-us">Contact Us</Link>.
      </p>
    </LegalPage>
  );
}
