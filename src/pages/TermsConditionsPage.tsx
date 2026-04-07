import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsConditionsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-coffee-900 text-cream-100">
      <Header />
      <main className="container mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-cream-300 hover:text-cream-100 transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-2">Terms &amp; Conditions</h1>
        <p className="text-cream-300 mb-8">Effective Date: April 7, 2026</p>

        <p className="text-cream-200 mb-6">
          These Terms &amp; Conditions govern the use of the Nawacafe website and any services offered through it, including browsing, online ordering, and contacting us.
        </p>

        <div className="space-y-3 text-cream-200 mb-10">
          <p><strong>Business Name:</strong> Nawacafe</p>
          <p><strong>Address:</strong> Al Banafsaj St. Hzza Bin Zayed Stadium Building 15</p>
          <p><strong>Email:</strong> <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a></p>
          <p><strong>Phone / WhatsApp:</strong> <a href="tel:0506584176" className="underline hover:text-cream-100">0506584176</a></p>
        </div>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">1. Use of Website</h2>
          <p className="text-cream-200">
            By using this website, you agree to use it lawfully and not misuse, damage, copy, or interfere with the website or its services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">2. Menu, Pricing, and Availability</h2>
          <p className="text-cream-200">
            Menu items, prices, images, and descriptions may change at any time without notice. We try to keep all information accurate, but errors may happen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">3. Orders</h2>
          <p className="text-cream-200">
            All orders placed through the website are subject to acceptance and availability. Nawacafe may refuse or cancel an order if an item is unavailable, payment fails, details are incorrect, or misuse is suspected.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">4. Pickup and Delivery</h2>
          <p className="text-cream-200">
            Pickup and delivery times are estimates only and may be affected by traffic, demand, or other circumstances. Customers must provide correct contact and delivery details.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">5. Payments</h2>
          <p className="text-cream-200">
            Payments are processed through approved payment methods or third-party payment providers like Ziina. Nawacafe does not claim to store full card details unless explicitly stated.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">6. Refunds and Cancellations</h2>
          <p className="text-cream-200">
            Refunds and cancellations are subject to our{" "}
            <Link to="/refund-policy" className="underline hover:text-cream-100">Refund / Cancellation Policy</Link>.
            {" "}Once food preparation has started, change-of-mind cancellations may not be accepted.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">7. Allergies</h2>
          <p className="text-cream-200">
            Customers must inform Nawacafe of any allergies or dietary restrictions before placing an order. We cannot guarantee a completely allergen-free environment unless clearly stated.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">8. Intellectual Property</h2>
          <p className="text-cream-200">
            All website content, including text, branding, images, and design, belongs to Nawacafe unless otherwise stated and may not be copied or reused without permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">9. Liability</h2>
          <p className="text-cream-200">
            Nawacafe is not responsible for indirect or consequential loss arising from use of the website, delays, or matters outside our reasonable control, to the extent permitted by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">10. Privacy</h2>
          <p className="text-cream-200">
            Use of this website is also subject to our{" "}
            <Link to="/privacy-policy" className="underline hover:text-cream-100">Privacy Policy</Link>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">11. Governing Law</h2>
          <p className="text-cream-200">
            These Terms are governed by the laws of the United Arab Emirates and the applicable laws of the relevant Emirate.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">12. Changes</h2>
          <p className="text-cream-200">
            Nawacafe may update these Terms at any time by publishing the updated version on the website.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TermsConditionsPage;
