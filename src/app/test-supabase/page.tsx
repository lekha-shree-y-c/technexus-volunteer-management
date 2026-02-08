'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test 1: Check environment variables
    testResults.envVars = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    // Test 2: Try to count volunteers
    try {
      const { count, error } = await supabase
        .from('volunteers')
        .select('*', { count: 'exact', head: true });
      
      testResults.countTest = {
        success: !error,
        count,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        } : null,
      };
    } catch (err) {
      testResults.countTest = {
        success: false,
        exception: err instanceof Error ? err.message : String(err),
      };
    }

    // Test 3: Try to fetch one volunteer
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .limit(1);
      
      testResults.fetchTest = {
        success: !error,
        dataCount: data?.length || 0,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        } : null,
      };
    } catch (err) {
      testResults.fetchTest = {
        success: false,
        exception: err instanceof Error ? err.message : String(err),
      };
    }

    // Test 4: Try to fetch active volunteers
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('status', 'Active');
      
      testResults.activeTest = {
        success: !error,
        dataCount: data?.length || 0,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        } : null,
      };
    } catch (err) {
      testResults.activeTest = {
        success: false,
        exception: err instanceof Error ? err.message : String(err),
      };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Supabase Connection Test</h1>
        
        {loading ? (
          <div className="text-white">Running tests...</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(results).map(([testName, result]) => (
              <div key={testName} className="bg-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4 capitalize">
                  {testName.replace(/([A-Z])/g, ' $1').trim()}
                </h2>
                <pre className="bg-slate-950 text-green-400 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={testConnection}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Re-run Tests
        </button>
      </div>
    </div>
  );
}
