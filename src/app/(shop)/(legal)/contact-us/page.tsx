import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { LegalPage } from "@/components/legal/LegalPage";
import { BUSINESS, formatAddress, operatedBy } from "@/lib/business";

export const metadata: Metadata = {
  title: `Contact Us | ${BUSINESS.brandName}`,
  description: `Contact ${BUSINESS.brandName} for orders, delivery, payments and refunds.`,
};

export default function ContactUsPage() {
  const officer = BUSINESS.grievanceOfficer;
  const cardClass = "rounded-2xl border border-border bg-surface p-5";
  const titleClass = "flex items-center gap-2 font-semibold text-foreground";

  return (
    <LegalPage
      href="/contact-us"
      title="Contact Us"
      showUpdated={false}
      intro={
        <p>
          Questions about an order, delivery, payment or refund? We are happy to help. Please include your order
          number so we can find it quickly — you can see it in <Link href="/orders" className="font-medium text-foreground underline underline-offset-4">My Orders</Link>.
        </p>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cardClass}>
          <p className={titleClass}>
            <Mail className="h-4 w-4" /> Email
          </p>
          <p className="mt-2">
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </p>
        </div>

        <div className={cardClass}>
          <p className={titleClass}>
            <Phone className="h-4 w-4" /> Phone
          </p>
          <p className="mt-2">
            <a href={`tel:${BUSINESS.phone.replace(/[^+\d]/g, "")}`}>{BUSINESS.phone}</a>
          </p>
        </div>

        <div className={cardClass}>
          <p className={titleClass}>
            <Clock className="h-4 w-4" /> Support hours
          </p>
          <p className="mt-2">{BUSINESS.supportHours}</p>
          <p className="mt-1 text-sm">We reply to emails within 1 business day.</p>
        </div>

        <div className={cardClass}>
          <p className={titleClass}>
            <MapPin className="h-4 w-4" /> Business address
          </p>
          <p className="mt-2">
            <strong>{BUSINESS.brandName}</strong>
            <br />
            {formatAddress()}
          </p>
          {BUSINESS.gstRegistered && BUSINESS.gstin && <p className="mt-1 text-sm">GSTIN: {BUSINESS.gstin}</p>}
        </div>
      </div>

      <div className={`${cardClass} mt-4`}>
        <p className={titleClass}>
          <ShieldCheck className="h-4 w-4" /> Grievance Officer
        </p>
        <p className="mt-2">
          {officer.name && (
            <>
              {officer.name}
              <br />
            </>
          )}
          Email: <a href={`mailto:${officer.email}`}>{officer.email}</a>
          <br />
          Phone: {BUSINESS.phone}
        </p>
        <p className="mt-2 text-sm">
          For complaints about our products, services or how we handle your personal data. We acknowledge complaints
          within 48 hours and aim to resolve them within 30 days.
        </p>
      </div>

      <p>
        {BUSINESS.brandName} is operated by {operatedBy()}. Website: {BUSINESS.website}
      </p>
    </LegalPage>
  );
}
