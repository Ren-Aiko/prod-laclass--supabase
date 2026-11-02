import React, { FormEvent, useState } from 'react';
import { AlertCircle, Search, Truck } from 'lucide-react';
import { CustomerOrderStatus, fetchCustomerOrderStatus } from '../services/orders';

function getStatusMessage(status: CustomerOrderStatus['status']): string {
  switch (status) {
    case 'Payment Confirmed':
      return 'Your order is confirmed. Awaiting shipment details.';
    case 'Cancelled':
      return 'Your order has been cancelled.';
    case 'Shipped':
      return 'Your order has shipped.';
    case 'Delivered':
      return 'Your order has been delivered.';
    case 'Paid, Awaiting Confirmation':
      return 'Your payment is awaiting confirmation.';
    default:
      return `Your order status is ${status}.`;
  }
}

export const OrderStatusPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState<CustomerOrderStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setOrder(null);
    setIsSearching(true);

    try {
      setOrder(await fetchCustomerOrderStatus(orderNumber.trim(), contact.trim()));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to look up this order. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-[60vh] bg-[#FCFCFC] py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[10px] tracking-[0.35em] text-[#B55232] uppercase font-medium block mb-2">
            Order Tracking
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#121212] font-medium">
            Check Your Order Status
          </h1>
          <p className="mt-3 text-sm text-[#666666]">
            Enter your order reference and the phone number or email used at checkout.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white border border-[#EAEAEA] p-6 sm:p-8 space-y-5">
          <div>
            <label htmlFor="order-number" className="block text-xs font-medium text-[#555555] mb-1.5">
              Order Reference
            </label>
            <input
              id="order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              required
              maxLength={80}
              autoComplete="off"
              placeholder="e.g. LC-2026-1234"
              className="w-full border border-[#CDCDCD] px-3 py-2.5 text-sm focus:outline-none focus:border-[#B55232]"
            />
          </div>

          <div>
            <label htmlFor="order-contact" className="block text-xs font-medium text-[#555555] mb-1.5">
              Checkout Phone Number or Email
            </label>
            <input
              id="order-contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              required
              maxLength={254}
              autoComplete="email"
              placeholder="Phone number or email"
              className="w-full border border-[#CDCDCD] px-3 py-2.5 text-sm focus:outline-none focus:border-[#B55232]"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full bg-[#121212] hover:bg-[#B55232] disabled:opacity-60 text-white py-3 text-xs font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {isSearching ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {errorMessage && (
          <div role="alert" className="mt-5 flex items-start gap-2 border border-[#E8B7A5] bg-[#FFF4F0] p-4 text-sm text-[#71301F]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {order && (
          <section aria-live="polite" className="mt-6 border border-[#CDCDCD] bg-[#F8F8F8] p-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#B55232] font-semibold">
              Order {order.orderNumber}
            </p>
            <h2 className="mt-2 font-serif text-2xl text-[#121212]">
              {getStatusMessage(order.status)}
            </h2>
            {(order.courierName || order.trackingNumber) && (
              <div className="mt-4 flex items-start gap-2 text-sm text-[#555555]">
                <Truck className="w-4 h-4 mt-0.5 text-[#B55232]" />
                <p>
                  {order.courierName && (
                    <>
                      Courier: <strong>{order.courierName}</strong>
                    </>
                  )}
                  {order.courierName && order.trackingNumber && ' · '}
                  {order.trackingNumber && (
                    <>
                      Tracking number: <strong className="font-mono">{order.trackingNumber}</strong>
                    </>
                  )}
                </p>
              </div>
            )}
            {!order.courierName && !order.trackingNumber &&
              (order.status === 'Payment Confirmed' || order.status === 'Shipped' || order.status === 'Delivered') && (
              <p className="mt-2 text-sm text-[#666666]">
                Shipment details are not available yet. Please check back later.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
};
