import React from 'react';
import { Home, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorPageProps {
  code?: number;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
}

export function ErrorPage({
  code = 404,
  title,
  message,
  showHomeButton = true,
  showBackButton = true,
  showRefreshButton = true,
}: ErrorPageProps) {
  const defaultContent: Record<number, { title: string; message: string }> = {
    404: {
      title: 'Page Not Found',
      message: 'The page you\'re looking for doesn\'t exist or has been moved.',
    },
    500: {
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
    },
    403: {
      title: 'Access Denied',
      message: 'You don\'t have permission to access this resource.',
    },
    429: {
      title: 'Too Many Requests',
      message: 'You\'ve sent too many requests. Please slow down.',
    },
    503: {
      title: 'Service Unavailable',
      message: 'The service is temporarily unavailable. Please try again later.',
    },
  };

  const content = defaultContent[code] || {
    title: title || 'Something Went Wrong',
    message: message || 'An unexpected error occurred.',
  };

  return (
    <div className="error-page">
      <div className="error-page-code">{code}</div>
      <h1 className="error-page-title">{title || content.title}</h1>
      <p className="error-page-message">{message || content.message}</p>
      <div className="error-page-actions">
        {showBackButton && (
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        )}
        {showHomeButton && (
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Home size={16} />
            Home
          </Link>
        )}
        {showRefreshButton && (
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}