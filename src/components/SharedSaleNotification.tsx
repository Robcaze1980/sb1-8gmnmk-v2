import React from 'react';
import { toast } from 'react-hot-toast';
import { Check, X } from 'lucide-react';
import { respondToSharedSale, markNotificationAsRead } from '../lib/supabase';

interface SharedSaleNotificationProps {
  notification: any;
  onAction: () => void;
}

export default function SharedSaleNotification({ notification, onAction }: SharedSaleNotificationProps) {
  const handleResponse = async (response: 'accepted' | 'rejected') => {
    try {
      await respondToSharedSale(notification.sale_id, response);
      await markNotificationAsRead(notification.id);
      toast.success(`Sale ${response} successfully`);
      onAction();
    } catch (error) {
      console.error('Error responding to shared sale:', error);
      toast.error('Failed to respond to shared sale');
    }
  };

  return (
    <div className="border-b border-gray-200 last:border-0 py-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <p className="text-sm font-medium">
            Stock #{notification.sales.stock_number}
          </p>
          <p className="text-sm text-gray-500">
            ${notification.sales.sale_price.toLocaleString()}
          </p>
        </div>
        <p className="text-sm text-gray-600">
          {notification.sales.customer_name}
        </p>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {new Date(notification.sales.date).toLocaleDateString()}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => handleResponse('accepted')}
              className="p-1 text-green-600 hover:text-green-800 transition-colors"
              title="Accept"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleResponse('rejected')}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Reject"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}