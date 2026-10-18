import type { MemberRole } from '@/lib/supabase/database.types';

/** 조직 멤버 역할. DB `member_role`과 동일 */
export type UserRole = MemberRole;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  staffId?: string | null;
  parentCustomerId?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  email: string;
  permissions?: string[];
  customRole?: {
    id?: string;
    name?: string;
    permissions?: string[];
  } | null;
}
