import React, { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ContactPage: React.FC = () => {
  const { submitContactForm } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setIsSubmitting(true);
    await submitContactForm(name, email, phone, message);
    setIsSubmitting(false);
    setSubmitted(true);
    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="bg-[#FCFCFA] min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] tracking-[0.35em] text-[#8C7853] uppercase font-medium block">
            Client Support
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#121212] font-medium tracking-wide">
            Contact LaClassé Abaya
          </h1>
          <p className="text-xs text-[#666666]">
            Inquire about custom orders, size advice, or shipping directly with our client concierge.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Info Column */}
          <div className="lg:col-span-5 bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs space-y-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C7853] font-semibold block mb-1">
                Direct Contact
              </span>
              <h3 className="font-serif text-2xl font-medium text-[#121212]">
                LaClassé Abaya Atelier
              </h3>
            </div>

            <div className="space-y-4 text-xs text-[#555555]">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#8C7853] flex-shrink-0" />
                <div>
                  <strong className="text-[#121212] block mb-0.5">WhatsApp Support:</strong>
                  +91 93805 09397
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#8C7853] flex-shrink-0" />
                <div>
                  <strong className="text-[#121212] block mb-0.5">Instagram DM:</strong>
                  @laclasseabaya
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Concierge CTA */}
            <div className="pt-6 border-t border-[#EAEAEA]">
              <h4 className="font-serif text-lg text-[#121212] mb-2">Need Immediate Guidance?</h4>
              <p className="text-xs text-[#666666] mb-4">
                Chat live with our client support on WhatsApp for instant assistance and order customization.
              </p>
              <a
                href="https://wa.me/919380509397?text=Hello%20LaClass%C3%A9%20Abaya!%20I%20have%20an%20inquiry%20regarding%20your%20collections."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-[#FCFCFA] py-3 text-xs font-semibold uppercase tracking-[0.15em] rounded-xs transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open WhatsApp (+91 9380509397)</span>
              </a>
            </div>
          </div>

          {/* Right Contact Form */}
          <div className="lg:col-span-7 bg-[#FAF8F5] border border-[#F0ECE1] p-8 rounded-xs">
            <h3 className="font-serif text-2xl font-medium text-[#121212] mb-4">Send Us a Message</h3>

            {submitted ? (
              <div className="bg-[#e8f5e9] border border-[#a5d6a7] text-[#2e7d32] p-4 rounded-xs text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
                <span>Thank you! Your message has been received by our atelier team. We will respond within 12 hours.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#555555] mb-1 font-medium">Your Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Suhana Parveen"
                      className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3.5 py-2.5 text-xs rounded-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#555555] mb-1 font-medium">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. suhana@example.com"
                      className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3.5 py-2.5 text-xs rounded-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#555555] mb-1 font-medium">Phone Number / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98470 12345"
                    className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3.5 py-2.5 text-xs rounded-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#555555] mb-1 font-medium">Your Message / Inquiry *</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your custom bridal requirements or order questions..."
                    className="w-full bg-[#FCFCFA] border border-[#D1CDC7] px-3.5 py-2.5 text-xs rounded-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Message...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
