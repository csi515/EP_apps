// @ts-nocheck
/**
 * EP personal_plant_ops capability list 경로 → 기존 capability 화면.
 * App.tsx CAPABILITY_ROUTE_PATHS → IndustryAppRouter → GenericIndustryShell 탭.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface CapabilityListView {
  capability: string;
  exportName: string;
  View: LazyExoticComponent<ComponentType>;
}

const views: Record<string, LazyExoticComponent<ComponentType>> = {};
function view(capability: string, name: string, loader: () => Promise<Record<string, unknown>>) {
  const key = `${capability}:${name}`;
  views[key] ??= lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })));
  return { capability, exportName: name, View: views[key] };
}

/** EP 프리셋에 포함된 Capability의 list 경로만 유지 */
export const CAPABILITY_LIST_VIEWS: Record<string, CapabilityListView> = {
  patents: view('patent_ip_asset', 'PatentAssetManagementView', () => import('@/capabilities/patent_ip_asset')),
  'patent-inventors': view('patent_ip_asset', 'PatentAssetManagementView', () => import('@/capabilities/patent_ip_asset')),
  'research-project-gates': view('research_project', 'ResearchProjectManagementView', () => import('@/capabilities/research_project')),
  'research-project-deliverables': view('research_project', 'ResearchProjectManagementView', () => import('@/capabilities/research_project')),
  'whistleblower-grievances': view('whistleblower_grievance', 'GrievanceListPage', () => import('@/capabilities/whistleblower_grievance')),
  'hazardous-substances': view('hazardous_substance_msds', 'HazardousSubstanceManagementView', () => import('@/capabilities/hazardous_substance_msds')),
  'chemical-usage-logs': view('hazardous_substance_msds', 'HazardousSubstanceManagementView', () => import('@/capabilities/hazardous_substance_msds')),
};
