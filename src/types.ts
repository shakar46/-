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

export interface RequestAction {
  id: string;
  requestId: string;
  createdBy: string;
  createdAt: any;
  instantFix?: string;
  resolution: string;
}

export interface CRMRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  clientPhoto?: string;
  clientPhotos?: string[];
  message: string;
  classification: string;
  classificationSection?: string | string[];
  status: 'new' | 'in_progress' | 'done' | 'under_review' | 'cancelled';
  managerId?: string;
  branchId: string;
  branchName?: string;
  deadlineAt?: any;
  completedAt?: any;
  createdAt: any;
  updatedAt?: any;

  // New Fields from TZ
  dateReceived?: string; // Дата поступления жалобы
  orderDate?: string; // Дата заказа
  additionalComment?: string; // Прилагательный комментарий (multi-select searchable)
  productEmployee?: string[]; // Продукт / Сотрудник (multi-select searchable)
  orderCheck?: string; // Чек заказа
  briefDescription?: string; // Краткое описание
  source?: string; // Источник
  samplePhotoEvidence?: string[]; // Образец / Фото
  extraPhoto?: string[]; // Дополнительная информация (фото)
  complaintTaker?: string; // Кто принял жалобу (specialist)
  sipAudio?: string; // SIP-аудиозапись
  responsibleForCorrection?: string; // Ответственный за коррекцию (manager)
  deadlineStatus?: string; // Срок устранения (Выполнен в срок / Просрочено / и т.д.)
  instantCorrection?: string; // Моментальная коррекция
  finalResolution?: string; // Решение
  rootCauseAnalysis?: string; // Анализ корневых причин ("Почему")
  fiveWhys?: string[]; // Structured 5 whys analysis
  motivationStatus?: string[]; // Статус для отдела мотивации и аналитики
  motivationDept?: string; // Отдел мотивации
  correctiveActions?: string; // Корректирующие действия
  significance?: 'Низкая' | 'Средняя' | 'Критическая'; // Значимость обращения
  classificationConfirmed?: string; // Подтверждённая классификация (full path)
  analyticsPhotos?: string[]; // Фото подтверждающей информации в аналитике
  confirmedClassification?: string; // (deprecated)
  confirmedSection?: string; // Подтверждённый раздел
  confirmedMotivationDept?: string; // Подтверждённый отдел мотивации
  validityStatus?: 'обоснованный' | 'не обоснованный' | 'выявляется'; // Статус обоснованности
}

export interface Dictionary {
  id: string; // classification, section, comment, product, source, etc.
  name: string;
  groups?: {
    name: string;
    items: string[];
  }[];
  items?: string[];
}

export interface User {
  uid: string;
  nickname: string;
  displayName: string;
  login: string;
  role: 'operator' | 'manager' | 'admin' | 'owner' | 'head' | 'viewer';
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
