import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { TradeInEntry } from '../lib/supabase';

interface TradeInFormProps {
  onClose: () => void;
  onTradeInAdded: () => void;
  editTradeIn?: TradeInEntry | null;
}

export default function TradeInForm({ onClose, onTradeInAdded, editTradeIn }: TradeInFormProps) {
  const { session } = useAuth();
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editTradeIn) {
      setAmount(String(editTradeIn.amount));
      setComment(editTradeIn.comment);
      setDate(editTradeIn.date.split('T')[0]);
    }
  }, [editTradeIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      toast.error('Please enter an amount');
      return;
    }

    if (!comment) {
      toast.error('Please enter a comment');
      return;
    }

    if (comment.split(' ').length > 100) {
      toast.error('Comment cannot exceed 100 words');
      return;
    }

    setIsSubmitting(true);
    try {
      const tradeInData = {
        user_id: session?.user.id,
        amount: Number(amount),
        comment,
        date
      };

      if (editTradeIn) {
        const { error } = await supabase
          .from('trade_ins')
          .update(tradeInData)
          .eq('id', editTradeIn.id);

        if (error) throw error;
        toast.success('Trade-in commission updated successfully');
      } else {
        const { error } = await supabase
          .from('trade_ins')
          .insert([tradeInData]);

        if (error) throw error;
        toast.success('Trade-in commission added successfully');
      }

      onTradeInAdded();
      onClose();
    } catch (error: any) {
      console.error('Error saving trade-in commission:', error);
      toast.error(error.message || 'Error saving trade-in commission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Trade-In Commission Amount <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter negotiated amount"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Comment (max 100 words) <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter details about the trade-in deal"
        />
        <p className="mt-1 text-sm text-gray-500">
          {comment.split(' ').length}/100 words
        </p>
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
          {isSubmitting ? 'Saving...' : (editTradeIn ? 'Update Trade-In Commission' : 'Save Trade-In Commission')}
        </button>
      </div>
    </form>
  );
}