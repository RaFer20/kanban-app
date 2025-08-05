import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { boardApi } from "../lib/api";

export function AdminSystemPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOutput, setResetOutput] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleResetDemo() {
    if (!window.confirm('Are you sure you want to reset all demo data? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      setResetOutput(null);
      
      const response = await boardApi.resetDemoData();
      setMessage(response.message || 'Demo data reset successfully');
      setResetOutput(response.output || '');
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setMessage(null);
        setResetOutput(null);
      }, 5000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to reset demo data');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewBoards() {
    navigate('/admin/boards');
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">System Actions</h1>
        <Link 
          to="/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back to Admin
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Demo Data Reset */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Reset Demo Data</h2>
              <p className="text-gray-600">Restore the demo boards and tasks</p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This will:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Delete all existing demo boards and tasks</li>
              <li>Create fresh demo boards with sample data</li>
              <li>Reset guest user permissions</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResetDemo}
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset Demo Data'}
            </button>

            {/* Quick action after reset */}
            {message && (
              <button
                onClick={handleViewBoards}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Updated Boards →
              </button>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">System Information</h2>
              <p className="text-gray-600">Current system status</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Auth Service:</span>
              <span className="text-green-600 font-medium">✓ Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Board Service:</span>
              <span className="text-green-600 font-medium">✓ Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Database:</span>
              <span className="text-green-600 font-medium">✓ Connected</span>
            </div>
            {message && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Reset:</span>
                  <span className="text-green-600 font-medium">Just now ✓</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <strong>{message}</strong>
          </div>
          {resetOutput && (
            <div className="mt-2 p-3 bg-green-50 rounded text-sm font-mono whitespace-pre-line">
              {resetOutput}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
    </div>
  );
}