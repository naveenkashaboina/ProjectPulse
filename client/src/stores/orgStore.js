import { create } from 'zustand';

const useOrgStore = create((set) => ({
  currentOrg: null,
  currentProject: null,
  projectRole: null,

  setCurrentOrg: (org) => set({ currentOrg: org }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjectRole: (role) => set({ projectRole: role }),
  clearOrgContext: () => set({
    currentOrg: null,
    currentProject: null,
    projectRole: null,
  }),
}));

export default useOrgStore;
