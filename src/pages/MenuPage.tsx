import Header from '@/components/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import LoyaltyOfferBanner from '@/components/LoyaltyOfferBanner';

const MenuPage = () => {

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <LoyaltyOfferBanner source="menu" />
        <Menu />
      </div>
      <Footer />
    </div>
  );
};

export default MenuPage;
