import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../api/auth.api';
import type { Role } from '../../api/types';

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
}

/** Route guard: renders children only when the logged-in user has one of `roles`. */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
