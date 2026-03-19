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

export interface Appeal {
  id?: string;
  client_name: string;
  client_phone: string;
  complaint_text: string;
  status: string;
  product_employee?: string;
  classification_section?: string;
  adjective_comment?: string;
  branch_name: string;
  source: string;
  created_at: string;
  updated_at: string;
  order_date?: string;
  complaint_classification?: string;
  order_receipt?: string;
  motivation_status?: string;
  deadline?: string;
  root_cause_analysis?: string;
  corrective_actions?: string;
  accepted_by?: string;
  responsible_person?: string;
  sip_link?: string;
  complaint_photos?: string[];
  completion_date?: string;
  confirmed_classification?: string;
  confirmed_section?: string;
  solution?: string;
  instant_correction?: string;
  justification_status?: 'Обосновано' | 'Необосновано';
}
