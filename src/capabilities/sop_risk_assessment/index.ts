export { sop_risk_assessmentCapability } from './manifest';
export { sopRiskAssessmentSetupSchema } from './setupSchema';
export { sopRiskAssessmentResources } from './resources';
/** @deprecated 데모 UI. 진입점은 DesktopSopRiskMatrixView만 사용한다. */
export { DesktopSopRiskMatrixView } from './components/DesktopSopRiskMatrixView';
export { RiskApprovalInboxView } from './components/RiskApprovalInboxView';
export { DocumentApprovalStepper } from './components/DocumentApprovalStepper';
export { ApprovalActionModal } from './components/ApprovalActionModal';
export { RevisionHistoryModal } from './components/RevisionHistoryModal';
export { WorkerRepledgeModal } from './components/WorkerRepledgeModal';
export * from './domain/approvalEngine';
