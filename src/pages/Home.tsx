import React from 'react';
import { Hero } from '../components/sections/Hero/Hero';
import { FeaturedCollections } from '../components/sections/Collections/FeaturedCollections';
import { NewArrivals } from '../components/sections/Products/NewArrivals';
import { WhyChooseUs } from '../components/sections/WhyChooseUs';
import { TestimonialsSection } from '../components/sections/TestimonialsSection';
import { InstagramGrid } from '../components/sections/InstagramGrid';
import { FAQSection } from '../components/sections/FAQSection';
import { CategoryType, Product } from '../types';

interface HomePageProps {
  onSelectCategory: (category: CategoryType) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateShop: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectCategory,
  onSelectProduct,
  onNavigateShop
}) => {
  return (
    <main className="min-h-screen">
      <Hero
        onShopClick={onNavigateShop}
        onBridalClick={() => onSelectCategory('Bridal')}
      />

      <FeaturedCollections onSelectCategory={onSelectCategory} />

      <NewArrivals
        onSelectProduct={onSelectProduct}
        onViewAllClick={onNavigateShop}
      />

      <WhyChooseUs />

      <TestimonialsSection />

      <InstagramGrid />

      <FAQSection />
    </main>
  );
};
