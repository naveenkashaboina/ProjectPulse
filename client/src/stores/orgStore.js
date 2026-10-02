import { create } from 'zustand';

const useOrgStore = create((set) => ({
  currentOrg: null,
  currentProject: null,
  projectRole: null,

  setCurrentOrg: (org) => set({ currentOrg: org }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjectRole: (role) => set({ projectRole: role }),
  clearProjectContext: () => set({
    currentProject: null,
    projectRole: null,
  }),
  clearOrgContext: () => set({
    currentOrg: null,
    currentProject: null,
    projectRole: null,
  }),
}));

export default useOrgStore;
