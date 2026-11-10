import { useMboManagementWorkspaceState } from './useMboManagementWorkspaceState';
import { useMboManagementObjectivesDerived } from './useMboManagementObjectivesDerived';
import { useMboManagementDashboardDerived } from './useMboManagementDashboardDerived';
import { useMboManagementWorkspaceActions } from './useMboManagementWorkspaceActions';

export function useMboManagementWorkspace() {
  const state = useMboManagementWorkspaceState();
  const obj = useMboManagementObjectivesDerived(state);
  const dash = useMboManagementDashboardDerived(state, obj);
  const actions = useMboManagementWorkspaceActions(state, obj, dash);

  return {
    ...state,
    ...obj,
    ...dash,
    ...actions,
  };
}

export type MboManagementWorkspace = ReturnType<typeof useMboManagementWorkspace>;
