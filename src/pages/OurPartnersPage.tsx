import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Partner {
  name: string;
  role: string;
  data: string;
  location: string;
  policy: string;
}

const PARTNERS: Partner[] = [
  {
    name: "Supabase",
    role: "Database, customer accounts and sign-in",
    data:
      "Name, phone number, email address, password (stored encrypted, never in readable form), order history, delivery details, stamp card progress, referral records and email confirmation codes.",
    location: "United States",
    policy: "https://supabase.com/privacy",
  },
  {
    name: "Vercel",
    role: "Website hosting and delivery",
    data:
      "Technical data needed to serve the site: IP address, browser and device type, and page request logs. Information you type into forms passes through Vercel on its way to our database, but Vercel does not keep your account or order records.",
    location: "Global content delivery network",
    policy: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Resend",
    role: "Sending account emails",
    data:
      "Your name and email address, used to send confirmation codes and account emails. We do not use it to sell your address or send third-party advertising.",
    location: "United States",
    policy: "https://resend.com/legal/privacy-policy",
  },
  {
    name: "Ziina",
    role: "Online payments",
    data:
      "Payment details you enter during checkout, plus the order amount and reference. Card numbers are handled by Ziina directly — Nawa Cafe never receives or stores them.",
    location: "United Arab Emirates",
    policy: "https://ziina.com/privacy",
  },
  {
    name: "Google Fonts",
    role: "Delivering the typefaces used on this site",
    data:
      "Your IP address and browser type, sent automatically when your browser downloads the fonts used for our text. No account, order or cookie information is involved. We do not use Google Analytics or any Google advertising product.",
    location: "United States",
    policy: "https://policies.google.com/privacy",
  },
];

const OurPartnersPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-coffee-900 text-cream-100">
      <Header />
      <main className="container mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm text-cream-300 transition-colors hover:text-cream-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-playfair text-3xl font-bold sm:text-4xl">Our Partners</h1>
        <p className="mt-2 text-cream-300">Last updated: 15 August 2026</p>

        <p className="mt-8 text-cream-200">
          Running the Nawa Cafe website means relying on a small number of trusted companies for
          things like hosting, storing orders, sending emails and taking payments. They are listed
          here so you can see exactly who handles your information and why.
        </p>
        <p className="mt-4 text-cream-200">
          These companies act on our instructions and may only use your information to provide their
          service to us. <strong>We do not sell your personal information</strong>, and we do not
          share it with advertisers or data brokers.
        </p>

        <div className="mt-10 space-y-5">
          {PARTNERS.map((partner) => (
            <section
              key={partner.name}
              className="rounded-xl border border-cream-100/15 bg-coffee-800/50 p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-playfair text-xl font-semibold">{partner.name}</h2>
                <a
                  href={partner.policy}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-sm text-cream-300 underline hover:text-cream-100"
                >
                  Their privacy policy <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="mt-1 text-sm font-medium text-cream-300">{partner.role}</p>
              <p className="mt-3 text-cream-200">{partner.data}</p>
              <p className="mt-3 text-sm text-cream-300">
                <strong>Where data is handled:</strong> {partner.location}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="font-playfair text-xl font-semibold">Website statistics stay with us</h2>
          <p className="mt-3 text-cream-200">
            We measure how the website is used with our own system, stored in our own database. We do
            not use Google Analytics, advertising trackers, or third-party geolocation lookups, and no
            outside company receives your browsing activity on this site.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-playfair text-xl font-semibold">Data stored outside the UAE</h2>
          <p className="mt-3 text-cream-200">
            Some of these companies store or process information on servers outside the United Arab
            Emirates, including in the United States. By using the website and placing an order you
            agree to your information being handled in this way. We only work with providers that
            offer recognised security and contractual protections for the data they hold on our
            behalf.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-playfair text-xl font-semibold">Questions or requests</h2>
          <p className="mt-3 text-cream-200">
            If you want to know what we hold about you, correct it, or have it deleted, contact us
            at{" "}
            <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">
              support@nawacafe.com
            </a>{" "}
            or on{" "}
            <a href="tel:0506584176" className="underline hover:text-cream-100">
              050 658 4176
            </a>
            . This list may change as our services change, and the updated version will always be
            published on this page.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OurPartnersPage;
