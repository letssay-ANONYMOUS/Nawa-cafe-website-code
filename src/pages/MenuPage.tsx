import Header from '@/components/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';

const MenuPage = () => {

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <Menu />
      </div>
      <Footer />
    </div>
  );
};

export default MenuPage;
