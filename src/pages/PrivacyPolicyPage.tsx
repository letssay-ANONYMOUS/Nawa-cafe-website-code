import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-coffee-900 text-cream-100">
      <Header />
      <main className="container mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-cream-300 hover:text-cream-100 transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-cream-300 mb-8">Effective Date: April 7, 2026</p>

        <div className="space-y-3 text-cream-200 mb-10">
          <p><strong>Business Name:</strong> Nawacafe</p>
          <p><strong>Address:</strong> Al Banafsaj St. Hzza Bin Zayed Stadium Building 15</p>
          <p><strong>Email:</strong> <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a></p>
          <p><strong>Phone / WhatsApp:</strong> <a href="tel:0506584176" className="underline hover:text-cream-100">0506584176</a></p>
        </div>

        <p className="text-cream-200 mb-10">
          This Privacy Policy explains how Nawacafe collects, uses, and protects information when you use our website, place an order, or contact us.
        </p>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-cream-200 mb-3">We may collect the following information through the website:</p>
          <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2">
            <li>Name</li>
            <li>Phone number</li>
            <li>Email address, if provided</li>
            <li>Delivery or pickup details, if provided</li>
            <li>Order details, including selected items and customer notes</li>
            <li>Payment status</li>
            <li>Basic technical and usage information such as IP address, browser type, device type, general location, pages visited, and website activity</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">2. How We Use Information</h2>
          <p className="text-cream-200 mb-3">We use collected information to:</p>
          <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2">
            <li>Process and manage orders</li>
            <li>Contact customers regarding their orders</li>
            <li>Improve website performance and customer experience</li>
            <li>Understand website traffic and usage</li>
            <li>Maintain website security and prevent misuse</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">3. Analytics and Third-Party Services</h2>
          <p className="text-cream-200">
            Nawacafe may use third-party services such as Google Analytics to understand website traffic and user behavior. These services may collect certain technical information in accordance with their own privacy policies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">4. Cookies</h2>
          <p className="text-cream-200">
            Our website may use cookies or similar technologies for essential website functions and analytics purposes. Users can manage or disable cookies through their browser settings, although some website functions may be affected.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">5. Data Retention and Security</h2>
          <p className="text-cream-200">
            We keep personal information only for as long as reasonably necessary for business, operational, legal, or customer service purposes. We take reasonable measures to protect information, but no online system can be guaranteed to be completely secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">6. Sharing of Information</h2>
          <p className="text-cream-200">
            Nawacafe does not sell customer personal information. Information may only be shared where necessary to operate the website, process orders, complete payments, comply with legal obligations, or protect our rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">7. Contact Us</h2>
          <p className="text-cream-200 mb-3">For any privacy-related questions or requests, please contact:</p>
          <div className="text-cream-200 space-y-1">
            <p><strong>Nawacafe</strong></p>
            <p>Address: Al Banafsaj St. Hzza Bin Zayed Stadium Building 15</p>
            <p>Email: <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a></p>
            <p>Phone / WhatsApp: <a href="tel:0506584176" className="underline hover:text-cream-100">0506584176</a></p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">8. Changes</h2>
          <p className="text-cream-200">
            Nawacafe may update this Privacy Policy at any time by publishing the updated version on the website.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
