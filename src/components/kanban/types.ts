export type DealStatus =
  | 'new'
  | 'analyzing'
  | 'reviewed'
  | 'under_loi'
  | 'due_diligence'
  | 'closed'
  | 'passed';

export interface KanbanDealData {
  id: string;
  name: string;
  status: DealStatus;
  value?: number;
  beds?: number;
  facilities: { id: string; name: string }[];
  assignee?: string;
  lastActivity?: Date;
  nextAction?: string;
  nextActionDate?: Date;
  probability?: number;
  assetType?: string;
  primaryState?: string;
}
