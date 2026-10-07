import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, POLICY_TERMS, operatedBy } from "@/lib/business";

export const metadata: Metadata = {
  title: `Data Privacy Policy | ${BUSINESS.brandName}`,
  description: `Your rights over your personal data at ${BUSINESS.brandName} and how to use them.`,
};

export default function DataPrivacyPolicyPage() {
  const officer = BUSINESS.grievanceOfficer;

  return (
    <LegalPage
      href="/data-privacy-policy"
      title="Data Privacy Policy"
      intro={
        <p>
          This policy explains how {BUSINESS.brandName} protects your personal data, how long we keep it, and the
          rights you have under India&apos;s Digital Personal Data Protection Act, 2023 and the Information Technology
          Act, 2000. It adds to our <Link href="/privacy-policy">Privacy Policy</Link>, which describes what we
          collect and why.
        </p>
      }
    >
      <h2>1. Who is responsible for your data</h2>
      <p>
        {BUSINESS.brandName}, operated by {operatedBy()}, decides how and why your personal data is used (the
        &quot;Data Fiduciary&quot;). Our service providers (listed in the Privacy Policy) process data only on our
        instructions.
      </p>

      <h2>2. Consent</h2>
      <ul>
        <li>
          We process your data with your consent, given when you create an account, place an order or upload a photo,
          and for purposes needed to fulfil your order or comply with the law.
        </li>
        <li>
          You can withdraw consent at any time by writing to us. Withdrawing consent does not affect processing already
          done, and we may be unable to continue providing services that need that data (for example, delivering an
          order).
        </li>
      </ul>

      <h2>3. Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> a summary of the personal data we hold about you and how we use it;
        </li>
        <li>
          <strong>Correct and update</strong> inaccurate or incomplete data (you can update your profile and addresses
          yourself on your account page);
        </li>
        <li>
          <strong>Erase</strong> your data when it is no longer needed for the purpose it was collected, unless we
          must keep it by law;
        </li>
        <li>
          <strong>Withdraw consent</strong> you previously gave;
        </li>
        <li>
          <strong>Grievance redressal</strong> — raise a complaint about how your data is handled;
        </li>
        <li>
          <strong>Nominate</strong> a person to exercise these rights on your behalf in case of death or incapacity.
        </li>
      </ul>

      <h2>4. How to make a request</h2>
      <p>
        Email <a href={`mailto:${officer.email}`}>{officer.email}</a> from the email address on your account, with the
        subject &quot;Data request&quot; and what you would like us to do. We may ask you to confirm your identity
        before acting. We respond within 30 days.
      </p>
      <p>
        <strong>Deleting your account:</strong> send us a deletion request and we will delete your account, saved
        addresses, cart and uploaded photos. Records of past orders and payments are kept only as long as needed for
        refunds, disputes and legal requirements, and are then deleted.
      </p>

      <h2>5. How long we keep data</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Kept for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account and saved addresses</td>
            <td>Until you delete your account or ask us to</td>
          </tr>
          <tr>
            <td>Orders and payment references</td>
            <td>As long as needed for refunds, disputes and legal requirements (up to 8 years)</td>
          </tr>
          <tr>
            <td>Photos uploaded but not ordered</td>
            <td>Deleted automatically after {POLICY_TERMS.uploadRetentionDays} days</td>
          </tr>
          <tr>
            <td>Photos and text used in an order</td>
            <td>With the order, to handle production, delivery and any replacement; deleted on request after delivery</td>
          </tr>
          <tr>
            <td>Cart contents</td>
            <td>Until you remove the items or place the order</td>
          </tr>
        </tbody>
      </table>

      <h2>6. How we protect data</h2>
      <ul>
        <li>All connections to the Website are encrypted (HTTPS).</li>
        <li>Account data is protected with access rules so customers can only see their own information.</li>
        <li>Uploaded photos are stored privately and opened only through secure, signed links.</li>
        <li>Card, UPI and bank details are handled entirely by Razorpay and are never stored by us.</li>
        <li>Only authorised staff can access order details, and only when needed for their work.</li>
      </ul>

      <h2>7. Where data is stored</h2>
      <p>
        Our service providers may store data on secure servers outside India. When they do, we use providers that
        apply appropriate safeguards and process data only for the purposes described in our policies.
      </p>

      <h2>8. Data breaches</h2>
      <p>
        If a personal data breach occurs that affects you, we will inform you and the Data Protection Board of India
        as required by law, and take steps to limit its impact.
      </p>

      <h2>9. Grievance Officer</h2>
      <p>
        {officer.name ? (
          <>
            <strong>{officer.name}</strong>, Grievance Officer
          </>
        ) : (
          <strong>Grievance Officer</strong>
        )}
        <br />
        {BUSINESS.brandName}
        <br />
        Email: <a href={`mailto:${officer.email}`}>{officer.email}</a>
        <br />
        Phone: {BUSINESS.phone} ({BUSINESS.supportHours})
      </p>
      <p>
        We acknowledge complaints within 48 hours and aim to resolve them within 30 days. If you are not satisfied with
        our response, you may approach the Data Protection Board of India.
      </p>
    </LegalPage>
  );
}
