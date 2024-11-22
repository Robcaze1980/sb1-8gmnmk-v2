import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ApprovalEntry, updateApprovalStatus } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface ApprovalsListProps {
  approvals: ApprovalEntry[];
  onApprovalUpdate: () => void;
}

export default function ApprovalsList({ approvals, onApprovalUpdate }: ApprovalsListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleApproval = async (approval: ApprovalEntry, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !comment) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(approval.id);
    try {
      await updateApprovalStatus(approval.type, approval.id, status, comment);
      toast.success(`${approval.type.charAt(0).toUpperCase() + approval.type.slice(1)} ${status} successfully`);
      onApprovalUpdate();
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval status');
    } finally {
      setProcessing(null);
      setComment('');
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvals.map(approval => (
        <div
          key={approval.id}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                approval.type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {approval.type.toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {approval.user_email}
              </span>
              <span className="text-sm text-gray-500">
                ${approval.amount.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">
                {format(new Date(approval.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleApproval(approval, 'approved')}
                disabled={!!processing}
                className="p-1 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => toggleExpand(approval.id)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {expandedItems.has(approval.id) ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {expandedItems.has(approval.id) && (
            <div className="p-4 space-y-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter comment (required for rejection)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => handleApproval(approval, 'rejected')}
                  disabled={!!processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {processing === approval.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}