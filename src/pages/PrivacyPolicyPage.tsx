import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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
        <p className="text-cream-300 mb-8">Effective Date: 15 August 2026</p>

        <div className="space-y-3 text-cream-200 mb-10">
          <p><strong>Business Name:</strong> Nawa Cafe</p>
          <p><strong>Address:</strong> Al Banafsaj St. Hzza Bin Zayed Stadium Building 15, Al Ain, United Arab Emirates</p>
          <p><strong>Email:</strong> <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a></p>
          <p><strong>Phone / WhatsApp:</strong> <a href="tel:0506584176" className="underline hover:text-cream-100">0506584176</a></p>
        </div>

        <p className="text-cream-200 mb-10">
          This Privacy Policy explains how Nawa Cafe collects, uses, stores and shares information when you use
          our website, create an account, place an order, or contact us. It is written to be read and understood
          by our customers, not just by lawyers.
        </p>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-cream-200 mb-3">Depending on how you use the website, we may collect:</p>
          <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2">
            <li><strong>Order information:</strong> name, phone number, email address, delivery or pickup details, table number for dine-in, items ordered, customer notes, order total and payment status</li>
            <li><strong>Account information (if you create an account):</strong> name, phone, email address and a password, which is stored only in encrypted form and is never visible to us</li>
            <li><strong>Email confirmation codes:</strong> a temporary code sent to confirm your address, stored in scrambled (hashed) form and deleted after a short period</li>
            <li><strong>Rewards information:</strong> your stamp card progress, rewards earned and redeemed, and referral records showing which account invited another</li>
            <li><strong>Sign-in security data (if you choose it):</strong> a passkey / Face ID or fingerprint credential. This stores a security key only — your actual fingerprint or face data never leaves your device and we never receive it</li>
            <li><strong>Technical and usage information:</strong> IP address, browser and device type, approximate location, pages visited and website activity</li>
          </ul>
          <p className="text-cream-200 mt-3">
            We do not collect or store your card number. Card details are entered directly with our payment
            provider.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">2. How We Use Information</h2>
          <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2">
            <li>To take, prepare and deliver your orders</li>
            <li>To contact you about an order or a question you have sent us</li>
            <li>To create and secure your account, and confirm that your email address is yours</li>
            <li>To run the stamp card and referral rewards, including working out what you have earned</li>
            <li>To improve the website, understand traffic, and keep the site secure and free from misuse</li>
            <li>To meet legal, tax and accounting obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">3. Who We Share Information With</h2>
          <p className="text-cream-200 mb-3">
            To run this website we use a small number of trusted service providers — our{" "}
            <Link
              to="/our-partners"
              target="_blank"
              rel="noreferrer noopener"
              className="underline font-semibold hover:text-cream-100"
            >
              partners
            </Link>{" "}
            — for hosting, storing orders and accounts, sending emails and processing payments. Your information
            is shared with them only so they can provide those services to us, and they may not use it for their
            own purposes.
          </p>
          <p className="text-cream-200 mb-3">
            You can see the full list, what each one receives, and where they are based on our{" "}
            <Link
              to="/our-partners"
              target="_blank"
              rel="noreferrer noopener"
              className="underline font-semibold hover:text-cream-100"
            >
              partners page
            </Link>
            .
          </p>
          <p className="text-cream-200">
            <strong>We do not sell your personal information</strong>, and we do not share it with advertisers or
            data brokers. We may also disclose information where we are legally required to, or where it is
            necessary to protect our rights, our staff or our customers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">4. Where Your Information Is Stored</h2>
          <p className="text-cream-200">
            Some of our service providers store and process information on servers outside the United Arab
            Emirates, including in the United States. This means your information may be transferred to, and
            handled in, countries with different data protection rules than the UAE. We only work with
            established providers that offer recognised security standards and contractual protections for the
            information they hold on our behalf. By using the website and placing an order, you agree to your
            information being handled in this way.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">5. Cookies and Analytics</h2>
          <p className="text-cream-200 mb-3">
            We use cookies and similar technologies for two purposes. Essential cookies keep the website working —
            for example keeping you signed in and remembering your cart. Analytics cookies help us understand how
            the site is used.
          </p>
          <p className="text-cream-200">
            Analytics only runs if you accept it in the cookie banner shown when you first visit. You can decline
            and still use the website normally, and you can change your mind at any time by clearing cookies in
            your browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">6. How Long We Keep Information</h2>
          <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2">
            <li><strong>Order records:</strong> kept while needed for business, accounting and legal purposes</li>
            <li><strong>Account and rewards information:</strong> kept for as long as your account is open</li>
            <li><strong>Email confirmation codes:</strong> expire within minutes and are deleted within about two months</li>
            <li><strong>Technical and analytics data:</strong> kept only for a limited period for security and reporting</li>
          </ul>
          <p className="text-cream-200 mt-3">
            When information is no longer needed, we delete it or remove the details that identify you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">7. Your Rights and Choices</h2>
          <p className="text-cream-200 mb-3">You may ask us to:</p>
          <ul className="list-disc list-inside text-cream-200 space-y-1 ml-2">
            <li>Tell you what personal information we hold about you</li>
            <li>Correct information that is wrong or out of date</li>
            <li>Delete your account and the personal information linked to it</li>
            <li>Stop sending you non-essential emails</li>
            <li>Object to, or ask us to limit, certain uses of your information</li>
          </ul>
          <p className="text-cream-200 mt-3">
            Contact us using the details below and we will respond within a reasonable period. Deleting your
            account will also remove your stamp card progress and any rewards you have earned. We may need to keep
            certain order and payment records where the law requires it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">8. Security</h2>
          <p className="text-cream-200">
            We take reasonable technical and organisational measures to protect your information. Passwords are
            stored encrypted, confirmation codes are stored scrambled rather than in plain text, and access to
            customer records is restricted to what is needed to run the cafe. No online system can be guaranteed
            to be completely secure, but we work to keep your information safe and will act promptly if a problem
            arises.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">9. Children</h2>
          <p className="text-cream-200">
            The website is intended for general use and accounts are meant for adults. We do not knowingly collect
            personal information from children without the involvement of a parent or guardian. If you believe a
            child has given us information, contact us and we will remove it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">10. Contact Us</h2>
          <p className="text-cream-200 mb-3">For any privacy question or request, please contact:</p>
          <div className="text-cream-200 space-y-1">
            <p><strong>Nawa Cafe</strong></p>
            <p>Address: Al Banafsaj St. Hzza Bin Zayed Stadium Building 15, Al Ain, United Arab Emirates</p>
            <p>Email: <a href="mailto:support@nawacafe.com" className="underline hover:text-cream-100">support@nawacafe.com</a></p>
            <p>Phone / WhatsApp: <a href="tel:0506584176" className="underline hover:text-cream-100">0506584176</a></p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold mb-4">11. Changes to This Policy</h2>
          <p className="text-cream-200">
            We may update this Privacy Policy as our services change. The current version will always be published
            on this page with its effective date. If we make a significant change to how we use your information,
            we will make that clear on the website.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
