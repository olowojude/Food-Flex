/**
 * Search Utility with Debounce
 * Save as: frontend/src/lib/searchUtils.js
 */

import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for debounced search
 * Delays API calls until user stops typing
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for managing search state
 */
export function useSearch(searchFunction, options = {}) {
  const {
    minChars = 2,
    debounceDelay = 500,
    onResults,
    onError,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const debouncedQuery = useDebounce(query, debounceDelay);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if query is too short
    if (!debouncedQuery || debouncedQuery.length < minChars) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const searchResults = await searchFunction(debouncedQuery, {
          signal: abortControllerRef.current.signal,
        });
        
        setResults(searchResults);
        onResults?.(searchResults);
      } catch (err) {
        // Ignore abort errors
        if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
          setError(err.message || 'Search failed');
          onError?.(err);
        }
      } finally {
        setLoading(false);
      }
    };

    performSearch();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, minChars, searchFunction]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearResults: () => setResults([]),
  };
}