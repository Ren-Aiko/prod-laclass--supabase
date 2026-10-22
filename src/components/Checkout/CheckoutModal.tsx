import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Hash
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Order, CustomerDetails } from '../../types';
import { createOrder } from '../../services/orders';
import { submitOrder } from '../../services/order';
import { CheckoutPayload } from '../../types/database';
import logo from '../../assets/SVG-02 (12)-Photoroom.png';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { cart, subtotal, discountAmount, shippingFee, grandTotal, appliedCoupon, clearCart } = useCart();

  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');

  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Kerala',
    pincode: '',
    notes: ''
  });

  // UTR / Transaction ID State (Replaces screenshot upload)
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const upiId = '9380509397@okbizaxis';
  const upiName = 'LaClassé Abaya Atelier';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customer.fullName || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.pincode) {
      setErrorMessage('Please fill in all required delivery fields.');
      return;
    }

    setStep('payment');
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitOrderWithUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUtr = utrNumber.trim().replace(/\s+/g, '');

    // Validation: Bank Reference / UTR Number requirement (min. 8 characters)
    if (!cleanUtr || cleanUtr.length < 8) {
      setErrorMessage('Please enter a valid Bank Reference / UTR Number (min. 8 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const shippingAddressFormatted = customer.address 
        ? `${customer.address}, ${customer.city || ''}, ${customer.state || ''} - ${customer.pincode || ''}`
        : '';

      const orderPayload: CheckoutPayload = {
        customer_name: customer.fullName,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_address: shippingAddressFormatted,
        utr_number: cleanUtr,
        coupon_code: appliedCoupon?.code,
        notes: customer.notes,
        items: cart.map(item => {
          const isCustom = item.selectedSize === 'Custom';
          let variantId: string | null = null;
          if (!isCustom) {
            const matchedVar = item.product.variants?.find(
              v => v.size === item.selectedSize && (!item.selectedLength || v.length === item.selectedLength)
            );
            variantId = matchedVar?.id || (item.product.id !== item.product.product_id ? item.product.id : null);
          }

          return {
            product_id: item.product.product_id || item.product.productId || item.product.id,
            product_variant_id: variantId,
            product_name: item.product.name,
            quantity: item.quantity,
            size: item.selectedSize,
            length: isCustom ? null : (item.selectedLength || null),
            custom_measurements: isCustom ? (item.customMeasurements as any || null) : null
          };
        })
      };

      // Call submitOrder invoking atomic submit_manual_order RPC
      const result = await submitOrder(orderPayload);
      const generatedOrderId = result.order_number || `LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        orderId: generatedOrderId,
        date: new Date().toISOString().split('T')[0],
        customer,
        items: cart.map(item => ({
          product_id: item.product.product_id || item.product.id,
          name: item.product.name,
          size: item.selectedSize,
          length: item.selectedLength,
          price_at_purchase: item.product.offerPrice ?? item.product.price,
          quantity: item.quantity,
        })),
        amount: subtotal,
        discountAmount,
        couponCode: appliedCoupon?.code,
        shippingFee,
        grandTotal: result.total_amount || grandTotal,
        utrNumber: cleanUtr,
        status: 'Paid, Awaiting Confirmation',
        paymentStatus: 'Paid, Awaiting Confirmation',
        paymentMethod: 'UPI_QR_MANUAL',
        notes: customer.notes
      };

      setCompletedOrder(newOrder);
      setStep('success');
      clearCart();
    } catch (err: any) {
      console.error('Order submission error:', err);
      try {
        const fallbackId = `LC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const fallbackOrder: Order = {
          orderId: fallbackId,
          date: new Date().toISOString().split('T')[0],
          customer,
          items: cart.map(item => ({
            product_id: item.product.product_id || item.product.id,
            name: item.product.name,
            size: item.selectedSize,
            length: item.selectedLength,
            price_at_purchase: item.product.offerPrice ?? item.product.price,
            quantity: item.quantity,
          })),
          amount: subtotal,
          discountAmount,
          couponCode: appliedCoupon?.code,
          shippingFee,
          grandTotal,
          utrNumber: cleanUtr,
          status: 'Paid, Awaiting Confirmation',
          paymentStatus: 'Paid, Awaiting Confirmation',
          paymentMethod: 'UPI_QR_MANUAL',
          notes: customer.notes
        };
        await createOrder(fallbackOrder);
        setCompletedOrder(fallbackOrder);
        setStep('success');
        clearCart();
      } catch (fallbackErr: any) {
        setErrorMessage(err.message || fallbackErr?.message || 'Failed to complete order. Please check your connection or stock availability.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setStep('details');
    setCompletedOrder(null);
    setUtrNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-[#FCFCFA] border border-[#EAEAEA] rounded-xs shadow-2xl w-full max-w-4xl overflow-hidden relative max-h-[92vh] my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#F0ECE1] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LA.CLASSÈ" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-1.5 border-l border-[#E5E0D8] pl-3">
              <Lock className="w-3.5 h-3.5 text-[#8C7853]" />
              <h2 className="font-serif text-lg font-medium tracking-wide text-[#121212]">
                {step === 'success' ? 'Order Confirmation' : 'Bespoke Atelier Checkout'}
              </h2>
            </div>
          </div>
          <button
            onClick={handleResetModal}
            className="p-1 text-[#121212] hover:text-[#8C7853] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {errorMessage && (
            <div className="mb-6 p-4 bg-[#fff1f0] border border-[#ffa39e] text-[#cf1322] text-xs rounded-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: CUSTOMER & DELIVERY DETAILS */}
          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs">
              
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#121212] mb-4 pb-2 border-b border-[#F0ECE1]">
                    1. Delivery & Contact Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[#555555] mb-1 font-medium">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={customer.fullName}
                        onChange={handleInputChange}
                        placeholder="e.g. Fatima Zahra"
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#555555] mb-1 font-medium">Email Address (for Order Updates) *</label>
                      <input
                        type="email"
                        name="email"
                        value={customer.email}
                        onChange={handleInputChange}
                        placeholder="fatima@example.com"
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#555555] mb-1 font-medium">Phone Number (with WhatsApp) *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={customer.phone}
                        onChange={handleInputChange}
                        placeholder="+91 98470 12345"
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#555555] mb-1 font-medium">Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        value={customer.pincode}
                        onChange={handleInputChange}
                        placeholder="e.g. 682036"
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#555555] mb-1 font-medium">City / District *</label>
                      <input
                        type="text"
                        name="city"
                        value={customer.city}
                        onChange={handleInputChange}
                        placeholder="e.g. Kochi / Kozhikode / Bengaluru"
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[#555555] mb-1 font-medium">Street Address / House / Villa *</label>
                      <input
                        type="text"
                        name="address"
                        value={customer.address}
                        onChange={handleInputChange}
                        placeholder="e.g. House #14, Royal Greens, Marine Drive"
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[#555555] mb-1 font-medium">State *</label>
                      <select
                        name="state"
                        value={customer.state}
                        onChange={handleInputChange}
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2.5 rounded-xs focus:outline-none focus:border-[#121212]"
                      >
                        <option value="Kerala">Kerala</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Other">Other States across India</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[#555555] mb-1 font-medium">Special Atelier Requests / Sizing Notes</label>
                      <textarea
                        name="notes"
                        rows={2}
                        value={customer.notes}
                        onChange={handleInputChange}
                        placeholder="e.g. Please wrap with luxury gift seal."
                        className="w-full bg-[#FAF8F5] border border-[#D1CDC7] px-3 py-2 rounded-xs focus:outline-none focus:border-[#121212]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Column */}
              <div className="space-y-6">
                <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-5 rounded-xs space-y-4">
                  <h3 className="font-serif text-base font-medium text-[#121212] pb-2 border-b border-[#EAEAEA]">
                    Order Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </h3>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-3 text-xs border-b border-[#F0ECE1] pb-2">
                        <img 
                          src={item.product.thumbnail || item.product.image1 || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=400&auto=format&fit=crop'} 
                          alt={item.product.name} 
                          className="w-12 h-14 object-cover rounded-xs shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#121212] truncate">{item.product.name}</h4>
                          <span className="text-[10px] text-[#777777] block">
                            Size: {item.selectedSize} {item.selectedSize !== 'Custom' && item.selectedLength ? `• Length: ${item.selectedLength}` : '• Bespoke Sizing'}
                          </span>
                          <span className="text-[11px] font-semibold text-[#8C7853]">
                            Qty: {item.quantity} × ₹{(item.product.offerPrice ?? item.product.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#EAEAEA] space-y-2 text-xs">
                    <div className="flex justify-between text-[#666666]">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#2e7d32]">
                        <span>Privilege Discount ({appliedCoupon?.code})</span>
                        <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#666666]">
                      <span>Bespoke Packaging & Courier</span>
                      <span className="text-[#2e7d32]">Complimentary</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-[#121212] pt-2 border-t border-[#EAEAEA]">
                      <span>Total Amount to Pay</span>
                      <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] py-3 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to UPI Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* STEP 2: MANUAL UPI QR PAYMENT & 12-DIGIT UTR INPUT */}
          {step === 'payment' && (
            <form onSubmit={handleSubmitOrderWithUtr} className="space-y-8 max-w-2xl mx-auto text-xs">
              
              <div className="text-center space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C7853] font-semibold block">
                  Official Atelier Bank QR
                </span>
                <h3 className="font-serif text-2xl font-medium text-[#121212]">
                  Scan QR & Enter 12-Digit Transaction UTR
                </h3>
                <p className="text-xs text-[#666666] max-w-md mx-auto">
                  Scan the verified UPI QR code below using Google Pay, PhonePe, Paytm, or your banking app. Once completed, enter the 12-digit UTR reference.
                </p>
              </div>

              {/* QR Code Presentation Box */}
              <div className="bg-[#FAF8F5] border border-[#EAEAEA] p-6 rounded-xs flex flex-col sm:flex-row items-center justify-center gap-8 shadow-inner">
                {/* Visual QR Code Card */}
                <div className="bg-white p-4 rounded-xs border border-[#E0DCD3] shadow-md flex flex-col items-center">
                  <div className="w-48 h-48 bg-[#121212] p-2 rounded-xs flex items-center justify-center relative group">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('LaClassé Abaya Order')}`)}`}
                      alt="LaClassé UPI QR Code"
                      className="w-full h-full object-contain bg-white p-1"
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#8C7853] font-medium mt-2">
                    Verified Atelier Merchant
                  </span>
                </div>

                {/* Amount & Account Details */}
                <div className="space-y-4 text-left w-full sm:w-auto">
                  <div>
                    <span className="text-[10px] text-[#777777] uppercase tracking-wider block">Total Transfer Amount</span>
                    <div className="font-serif text-3xl font-semibold text-[#121212]">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-[#777777] uppercase tracking-wider block">UPI ID</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="bg-[#EFECE6] px-2.5 py-1 rounded-xs font-mono text-xs text-[#121212] select-all">
                          {upiId}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="p-1.5 bg-[#121212] text-white rounded-xs hover:bg-[#8C7853] transition-colors cursor-pointer"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-[#a5d6a7]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#777777] uppercase tracking-wider block">Account Name</span>
                      <strong className="text-xs text-[#121212]">{upiName}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#8C7853] font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Real-time D1 inventory reservation upon UTR verification</span>
                  </div>
                </div>
              </div>

              {/* Required 12-Digit UTR Number Input */}
              <div className="bg-[#FFFFFF] border border-[#D1CDC7] p-6 rounded-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#F0ECE1]">
                  <Hash className="w-4 h-4 text-[#8C7853]" />
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-[#121212]">
                    Enter UPI Ref / UTR / Transaction ID (12 digits) *
                  </h4>
                </div>

                <p className="text-xs text-[#666666] leading-relaxed">
                  Please enter the 12-digit UTR/UPI reference number from your payment app. Your order will be confirmed once our atelier verifies the transaction against our bank records.
                </p>

                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                      placeholder="e.g. 427189031456"
                      maxLength={24}
                      className="w-full bg-[#FAF8F5] border-2 border-[#8C7853]/60 focus:border-[#121212] px-4 py-3 rounded-xs text-sm sm:text-base font-mono tracking-wider text-[#121212] focus:outline-none"
                      required
                      autoFocus
                    />
                    <div className="absolute right-3 top-3 text-[11px] font-mono text-[#888888]">
                      {utrNumber.length} / 12 digits
                    </div>
                  </div>
                  <span className="text-[10px] text-[#777777]">
                    The atelier checks bank credits matching this exact transaction number.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  disabled={isSubmitting}
                  className="text-xs text-[#666666] hover:text-[#121212] flex items-center gap-1 font-medium order-2 sm:order-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Delivery Details</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || utrNumber.trim().length < 10}
                  className="w-full sm:w-auto bg-[#8C7853] hover:bg-[#A08B63] disabled:opacity-50 disabled:cursor-not-allowed text-[#FCFCFA] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs shadow-md transition-all flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying & Submitting Order...</span>
                    </>
                  ) : (
                    <span>Confirm Order with UTR #{utrNumber ? utrNumber.slice(-4) : ''}</span>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION SCREEN */}
          {step === 'success' && completedOrder && (
            <div className="text-center py-8 max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 bg-[#8C7853]/15 text-[#8C7853] rounded-full flex items-center justify-center mx-auto border border-[#8C7853]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C7853] font-semibold block mb-1">
                  Transaction Reference Registered
                </span>
                <h3 className="font-serif text-3xl font-medium text-[#121212]">
                  Order Placed Successfully!
                </h3>
                <p className="text-xs text-[#666666] mt-2">
                  Order Reference: <strong className="text-[#121212] font-semibold">{completedOrder.orderId}</strong>
                </p>
              </div>

              {/* Status and UTR Badge */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 bg-[#FAF8F5] border border-[#8C7853]/40 px-4 py-2 rounded-full text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e65100] animate-pulse" />
                  <span className="font-semibold text-[#121212]">
                    Status: {completedOrder.status}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-[#D1CDC7] px-4 py-2 rounded-full text-xs font-mono">
                  <span className="text-[#777777]">UTR:</span>
                  <span className="font-semibold text-[#121212]">{completedOrder.utrNumber}</span>
                </div>
              </div>

              {/* Atelier Note */}
              <div className="bg-[#FAF8F5] border border-[#F0ECE1] p-5 rounded-xs text-xs text-[#555555] leading-relaxed text-left space-y-2">
                <strong className="text-[#121212] block font-semibold">What happens next:</strong>
                <p>
                  1. Our finance team will cross-reference your submitted UTR (<strong className="font-mono text-[#121212]">{completedOrder.utrNumber}</strong>) against incoming bank transfer credits.
                </p>
                <p>
                  2. Once bank credit is verified, status updates to <strong className="text-[#2e7d32]">Payment Confirmed</strong> and bespoke atelier tailoring proceeds.
                </p>
                <p>
                  3. You will receive dispatch updates with your courier tracking number on WhatsApp and email.
                </p>
              </div>

              {/* Order Info Details */}
              <div className="bg-[#FFFFFF] border border-[#EAEAEA] p-4 rounded-xs text-xs text-left divide-y divide-[#F0ECE1]">
                <div className="pb-2 flex justify-between">
                  <span className="text-[#777777]">Customer Name:</span>
                  <span className="font-medium text-[#121212]">{completedOrder.customer.fullName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#777777]">Delivery Destination:</span>
                  <span className="font-medium text-[#121212]">{completedOrder.customer.city || completedOrder.customer.address}</span>
                </div>
                <div className="pt-2 flex justify-between font-semibold text-sm">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#8C7853]">₹{completedOrder.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="flex-1 bg-[#121212] hover:bg-[#8C7853] text-[#FCFCFA] py-3 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>

                <a
                  href={`https://wa.me/919380509397?text=${encodeURIComponent(`Hello LaClassé Atelier! I have placed order ${completedOrder.orderId} with UTR Ref: ${completedOrder.utrNumber}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 border border-[#121212] hover:bg-[#FAF8F5] text-[#121212] py-3 text-xs font-semibold uppercase tracking-[0.2em] rounded-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Chat on WhatsApp Concierge</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
