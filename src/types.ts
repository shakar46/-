export interface Complaint {
  id: string;
  dateReceived: string;
  orderDate: string;
  classification: string;
  classificationSection: string;
  reasonComment: string;
  productOrEmployee: string;
  branchName: string;
  orderCheck: string;
  description: string;
  source: string;
  customerName: string;
  phone: string;
  samplePhoto: string;
  extraInfo: string;
  acceptedBy: string;
  sipRecord: string;
  responsible: string;
  deadline: string;
  quickFix: string;
  rootCauseAnalysis: string;
  status: string;
  correctiveAction: string;
}

export interface CRMRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  clientPhoto?: string;
  message: string;
  classification: string;
  status: 'in_progress' | 'done';
  managerId?: string;
  branchId: string;
  deadlineAt?: any;
  completedAt?: any;
  createdAt: any;
}

export interface RequestAction {
  id: string;
  requestId: string;
  instantFix?: string;
  resolution: string;
  createdBy: string;
  createdAt: any;
}

export interface User {
  uid: string;
  nickname: string;
  displayName: string;
  login: string;
  role: 'operator' | 'manager' | 'admin' | 'owner' | 'viewer';
  branchId?: string;
  phone?: string;
  photoUrl?: string;
  createdAt: any;
}

export interface PoisoningAppeal {
  id?: string;
  appeal_id?: string; // Reference to the main appeal if linked
  symptoms: string;
  duration: string;
  people_consumed: number;
  people_symptoms: number;
  stomach_state: 'Голодный' | 'Сытый';
  time_after_consumption: string;
  suspected_ingredients: string;
  previous_cases: string;
  medical_report: boolean;
  is_aggressive: boolean;
  created_at: string;
  branch_name: string;
  client_name: string;
  client_phone: string;
}
