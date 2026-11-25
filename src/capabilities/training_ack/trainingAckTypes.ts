import type { TrainingCourseStatus } from './domain/trainingAckEngine';

export type TrainingCourseRow = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  status: TrainingCourseStatus;
  revision: number;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainingAssigneeRow = {
  id: string;
  organization_id: string;
  course_id: string;
  department_id: string | null;
  member_id: string | null;
};

export type TrainingAcknowledgmentRow = {
  id: string;
  organization_id: string;
  course_id: string;
  member_id: string;
  course_revision: number;
  acked_at: string;
  user_agent: string | null;
};

export type MyTrainingCourse = TrainingCourseRow & {
  assigned: boolean;
  acknowledgment: TrainingAcknowledgmentRow | null;
};
