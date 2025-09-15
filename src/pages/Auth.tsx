import { Navigate } from 'react-router-dom';

export default function Auth() {
  // For now, redirect directly to the main app since we simplified authentication
  return <Navigate to="/" replace />;
}