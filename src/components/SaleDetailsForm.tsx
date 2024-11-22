import React, { useState, useEffect, memo } from 'react';
import { supabase, getUserIdFromEmail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

interface FormData {
  stock_number: string;
  customer_name: string;
  sale_type: 'New' | 'Used' | 'Trade-In';
  sale_price: string;
  accessories_price: string;
  warranty_price: string;
  warranty_cost: string;
  maintenance_price: string;
  maintenance_cost: string;
  shared_with_email: string;
  date: string;
}

interface SaleDetailsFormProps {
  onClose: () => void;
  onSaleAdded: () => void;
  editSale?: any | null;
}

const defaultFormData: FormData = {
  stock_number: '',
  customer_name: '',
  sale_type: 'Used',
  sale_price: '',
  accessories_price: '',
  warranty_price: '',
  warranty_cost: '',
  maintenance_price: '',
  maintenance_cost: '',
  shared_with_email: '',
  date: new Date().toISOString().split('T')[0],
};

const SaleDetailsForm = ({ onClose, onSaleAdded, editSale }: SaleDetailsFormProps) => {
  const { session } = useAuth();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editSale) {
      setFormData({
        ...editSale,
        sale_price: String(editSale.sale_price),
        accessories_price: String(editSale.accessories_price || ''),
        warranty_price: String(editSale.warranty_price || ''),
        warranty_cost: String(editSale.warranty_cost || ''),
        maintenance_price: String(editSale.maintenance_price || ''),
        maintenance_cost: String(editSale.maintenance_cost || ''),
        shared_with_email: editSale.shared_with_email || '',
        date: editSale.date.split('T')[0],
      });
      setIsShared(!!editSale.shared_with_email);
    }
  }, [editSale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.stock_number || !formData.customer_name || !formData.sale_price || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isShared && !formData.shared_with_email) {
      toast.error('Please enter an email for shared sale');
      return;
    }

    setIsSubmitting(true);
    try {
      let shared_with_id = null;
      if (isShared && formData.shared_with_email) {
        shared_with_id = await getUserIdFromEmail(formData.shared_with_email);
        if (!shared_with_id) {
          toast.error('User not found with the provided email');
          setIsSubmitting(false);
          return;
        }
      }

      const saleData = {
        ...formData,
        user_id: session?.user.id,
        sale_price: Number(formData.sale_price),
        accessories_price: Number(formData.accessories_price) || 0,
        warranty_price: Number(formData.warranty_price) || 0,
        warranty_cost: Number(formData.warranty_cost) || 0,
        maintenance_price: Number(formData.maintenance_price) || 0,
        maintenance_cost: Number(formData.maintenance_cost) || 0,
        shared_with_email: isShared ? formData.shared_with_email : null,
        shared_with_id: isShared ? shared_with_id : null,
        shared_status: isShared ? 'pending' : null,
      };

      const { error } = editSale
        ? await supabase.from('sales').update(saleData).eq('id', editSale.id)
        : await supabase.from('sales').insert([saleData]);

      if (error) throw error;
      
      toast.success(editSale ? 'Sale updated successfully' : 'Sale added successfully');
      onSaleAdded();
      onClose();
    } catch (error: any) {
      console.error('Error saving sale:', error);
      toast.error(error.message || 'Error saving sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Form fields remain unchanged */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stock Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="stock_number"
            required
            value={formData.stock_number}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="customer_name"
            required
            value={formData.customer_name}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Sale Type</label>
          <select
            name="sale_type"
            value={formData.sale_type}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="Used">Used</option>
            <option value="New">New</option>
            <option value="Trade-In">Trade-In</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sale Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sale Price <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="sale_price"
            required
            min="0"
            step="0.01"
            value={formData.sale_price}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Accessories Price</label>
          <input
            type="number"
            name="accessories_price"
            min="0"
            step="0.01"
            value={formData.accessories_price}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Warranty Price</label>
          <input
            type="number"
            name="warranty_price"
            min="0"
            step="0.01"
            value={formData.warranty_price}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Warranty Cost</label>
          <input
            type="number"
            name="warranty_cost"
            min="0"
            step="0.01"
            value={formData.warranty_cost}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Maintenance Price</label>
          <input
            type="number"
            name="maintenance_price"
            min="0"
            step="0.01"
            value={formData.maintenance_price}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Maintenance Cost</label>
          <input
            type="number"
            name="maintenance_cost"
            min="0"
            step="0.01"
            value={formData.maintenance_cost}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="is_shared"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_shared" className="ml-2 block text-sm text-gray-900">
            Shared Sale
          </label>
        </div>

        {isShared && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Shared With (Email) <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="shared_with_email"
              required={isShared}
              value={formData.shared_with_email}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (editSale ? 'Update Sale' : 'Add Sale')}
        </button>
      </div>
    </form>
  );
};

export default memo(SaleDetailsForm);