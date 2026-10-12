import { useState, useEffect } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

export interface CustomerLinkInfo {
  id: string;
  name: string;
  phone?: string;
  organizationId: string;
}

export function useCustomerLink() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [currentCustomer, setCurrentCustomer] = useState<CustomerLinkInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && currentOrganization) {
      setCurrentCustomer({
        id: user.id,
        name: user.user_metadata?.full_name || '고객',
        phone: user.phone || undefined,
        organizationId: currentOrganization.id,
      });
    } else {
      setCurrentCustomer(null);
    }
  }, [user, currentOrganization]);

  return { currentCustomer, loading };
}
