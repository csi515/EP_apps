import type { MboStatus, MboLevel } from './mboEngine';
import type { MboVisibilityType } from './mboVisibilityEngine';

export interface ObjectiveNode {
  id: string;
  parentId: string | null;
  level: MboLevel;
  departmentName: string;
  departmentId?: string | null;
  ownerName: string;
  ownerId?: string | null;
  title: string;
  description: string;
  successCriteria: string;
  status: MboStatus;
  startDate: string;
  targetDate: string;
  weight: number;
  progressRate: number;
  revision: number;
  isRevised?: boolean;
  revisionCount?: number;
  targetValue?: string | number | null;
  rejectionReason?: string;
  evaluatorId?: string | null;
  visibilityType?: MboVisibilityType;
  sharedMemberIds?: string[];
  deletedAt?: string | null;
}
