import Header from "@/components/Header";
import Footer from "@/components/Footer";

const RefundPolicyPage = () => {
  return (
    <div className="min-h-screen bg-coffee-900 text-cream-100">
      <Header />
      <main className="container mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-3xl">
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-cream-300 mb-8">Effective Date: April 7, 2026</p>

        <div className="space-y-3 text-cream-200 mb-10">
          <p><strong>Business Name:</strong> Nawacafe</p>
          <p><strong>Address:</strong> Al Banafsaj St. Hzza Bin Zayed Stadium Building 15</p>
          <p><strong>Email:</strong> <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a></p>
          <p><strong>Phone / WhatsApp:</strong> <a href="tel:0506584176" className="underline hover:text-cream-100">0506584176</a></p>
        </div>

        <p className="text-cream-200 mb-6">
          At Nawacafe, all orders placed through the website are considered final once submitted.
        </p>

        <p className="text-cream-200 mb-4">
          Because customers are given the opportunity to review their items, quantities, details, and total amount before completing the order, we do not provide refunds after an order has been placed. This includes:
        </p>

        <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2 mb-6">
          <li>No full refunds</li>
          <li>No partial refunds</li>
          <li>No change-of-mind refunds</li>
        </ul>

        <p className="text-cream-200 mb-6">
          Once an order is confirmed, it enters our preparation and service process, and for that reason it cannot be refunded.
        </p>

        <p className="text-cream-200 mb-6">
          If a customer experiences an issue with an order and would like us to review it, they may contact us at{" "}
          <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a>{" "}
          with their full name, phone number, order details, and any relevant explanation. We will review the matter and respond as appropriate, but submission of a complaint does not guarantee any refund.
        </p>

        <p className="text-cream-200">
          Nawacafe may update this Refund Policy at any time by publishing the updated version on the website.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicyPage;
