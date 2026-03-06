import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function MagicLinkVerify() {
  const { token } = useParams<{ token: string }>();
  const { loginWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loginWithMagicLink(token)
        .then(() => navigate('/my-applications'))
        .catch(err => setError(err instanceof Error ? err.message : 'Invalid or expired link'));
    }
  }, [token]);

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <a href="/login" className="text-blue-600 hover:text-blue-800">Try signing in again</a>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <p className="text-gray-500">Verifying your link...</p>
    </div>
  );
}
