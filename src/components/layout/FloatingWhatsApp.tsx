import React from 'react';
import { MessageCircle } from 'lucide-react';

interface FloatingWhatsAppProps {
  productName?: string;
  size?: string;
  length?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  productName,
  size,
  length
}) => {
  const phoneNumber = '919380509397'; // LaClassé Abaya WhatsApp Concierge Number
  
  let text = 'Hello LaClassé Abaya Concierge! I would like to inquire about your luxury abaya collections.';
  if (productName) {
    text = `Hello LaClassé Abaya! I am interested in ordering the *${productName}*${size ? ` (Size: ${size})` : ''}${length ? ` (Length: ${length})` : ''}. Could you please guide me with availability?`;
  }

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba5a] text-[#FCFCFA] p-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-2 group border border-white/20"
      aria-label="Contact Laclassé Concierge on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 fill-current" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-xs font-medium tracking-wider uppercase pr-1">
        WhatsApp Concierge
      </span>
    </a>
  );
};
