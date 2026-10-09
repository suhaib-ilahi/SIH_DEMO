export type Status =
  | "Open"
  | "In Review"
  | "Escalated"
  | "Resolved"
  | "Monitoring";
export type Priority = "Critical" | "High" | "Medium" | "Low";
export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface Complaint extends BaseRecord {
  reference: string;
  category: string;
  amount: number;
  location: string;
  status: Status;
  caseId: string;
}
export interface Case extends BaseRecord {
  reference: string;
  title: string;
  priority: Priority;
  status: Status;
  assignee: string;
  complaintIds: string[];
  accountIds: string[];
  riskScore: number;
}
export interface Account extends BaseRecord {
  number: string;
  bank: string;
  type: "Mule" | "Suspect" | "Beneficiary";
  riskScore: number;
  status: string;
  caseId: string;
}
export interface Transaction extends BaseRecord {
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  channel: string;
  location: string;
  caseId: string;
}
export interface EntityRelationship extends BaseRecord {
  sourceId: string;
  targetId: string;
  relationship: string;
  strength: number;
}
export interface CashOutCandidate extends BaseRecord {
  location: string;
  type: "ATM" | "Branch" | "POS";
  latitude: number;
  longitude: number;
  riskScore: number;
  amount: number;
  predictionId: string;
}
export interface Prediction extends BaseRecord {
  candidateIds: string[];
  confidence: number;
  window: string;
  rationale: string;
  caseId: string;
}
export type InterventionStatus =
  | "Pending review"
  | "Under review"
  | "Awaiting information"
  | "Approved for authorised action"
  | "Action initiated (simulated)"
  | "Completed"
  | "Unsuccessful"
  | "Cancelled"
  | "Closed without action"
  | "Recommended"
  | "In Progress";
export interface InterventionReview {
  id: string;
  actor: string;
  action: string;
  reason?: string;
  createdAt: string;
}
export interface InterventionRecommendation extends BaseRecord {
  caseId: string;
  action: string;
  owner: string;
  urgency: Priority;
  status: InterventionStatus;
  candidateId?: string;
  reviewHistory?: InterventionReview[];
  outcomeId?: string;
  responseFeasibility?: "High" | "Medium" | "Low" | "Unknown";
}
export interface EarlyWarning extends BaseRecord {
  title: string;
  signal: string;
  severity: Priority;
  entities: number;
  status:
    | "New"
    | "Under review"
    | "Escalated"
    | "Monitoring"
    | "Dismissed"
    | "Resolved"
    | "Triaged"
    | string;
  category?: string;
  confidence?: number;
  region?: string;
  caseIds?: string[];
  accountIds?: string[];
  transactionIds?: string[];
  explanation?: string;
  limitations?: string;
  recommendation?: string;
  owner?: string;
  detectedPeriod?: string;
}
export interface Alert extends BaseRecord {
  title: string;
  detail: string;
  priority: Priority;
  acknowledged: boolean;
  caseId?: string;
  category?: string;
  sourceType?: string;
  sourceId?: string;
  region?: string;
  owner?: string;
  status?:
    | "New"
    | "Under review"
    | "Escalated"
    | "Resolved"
    | "Dismissed"
    | string;
  recommendedNextStep?: string;
  reviewHistory?: {
    id: string;
    action: string;
    reason?: string;
    actor: string;
    createdAt: string;
  }[];
}
export interface AlternateExitEvent extends BaseRecord {
  type: string;
  route: string;
  accountId: string;
  amount: number;
  riskScore: number;
  status: string;
  caseId?: string;
  currency?: string;
  sourceAccountId?: string;
  destinationEntity?: string;
  location?: string;
  eventType?: string;
  sourceNote?: string;
  observedAt?: string;
  predictionId?: string;
}
export interface InvestigationNote extends BaseRecord {
  caseId: string;
  author: string;
  text: string;
  category?: string;
  entityId?: string;
}
export interface EvidenceItem extends BaseRecord {
  caseId: string;
  name: string;
  type: string;
  size: string;
  verified: boolean;
  description?: string;
  sourceReference?: string;
  provenance?: string;
  integrityStatus?: string;
  reviewStatus?: string;
  collectedAt?: string;
}
export interface InterventionOutcome extends BaseRecord {
  interventionId: string;
  result: string;
  amountProtected: number;
  recordedBy: string;
}
export interface AuditEvent extends BaseRecord {
  actor: string;
  action: string;
  target: string;
  detail: string;
}
export interface UserProfile extends BaseRecord {
  name: string;
  role: string;
  unit: string;
}
export interface StrategicPattern extends BaseRecord {
  name: string;
  description: string;
  trend: string;
  confidence: number;
  affectedDistricts: number;
}
export interface Dataset {
  complaints: Complaint[];
  cases: Case[];
  accounts: Account[];
  transactions: Transaction[];
  relationships: EntityRelationship[];
  candidates: CashOutCandidate[];
  predictions: Prediction[];
  interventions: InterventionRecommendation[];
  warnings: EarlyWarning[];
  alerts: Alert[];
  alternateExits: AlternateExitEvent[];
  notes: InvestigationNote[];
  evidence: EvidenceItem[];
  outcomes: InterventionOutcome[];
  audit: AuditEvent[];
  users: UserProfile[];
  patterns: StrategicPattern[];
}
