import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './apiClient';
import { Project, Inverter } from '../types';
import { useAuthStore } from '../store/useAuthStore';

interface BackendProject {
  id: number;
  name: string;
  location: string | null;
  capacity_kw: number;
  created_at: string;
  inverters: any[];
  monthly_data?: any[];
}

export const extractId = (code: string): number => {
  const match = code.match(/PRJ-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const mapBackendProject = (bp: BackendProject): Project => ({
  projectCode: `PRJ-${bp.id}`,      
  projectName: bp.name,
  projectState: bp.location || 'Unknown',
  projectOwner: 'Talf Solar India',       
  dateOfCommissioning: bp.created_at,
  tariff: 4.5,                      
  inverters: bp.inverters.map((inv: any) => ({
    name: inv.serial_number,
    kwac: inv.capacity_kw || 50,
    deviceSn: inv.serial_number,
    id: inv.id, 
  })),
  monthlyData: bp.monthly_data ? 
    Object.fromEntries(bp.monthly_data.map((m: any) => [m.month, m])) 
    : {},                  
  breakdownEvents: [],              
});

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const data = await apiClient<BackendProject[]>('/projects/');
      return data.map(mapBackendProject);
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (newUser: any) => 
      apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify(newUser),
      }),
  });
};

export const useLogin = () => {
  const setToken = useAuthStore(state => state.setToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: any) => {
      // FastAPI expects x-www-form-urlencoded for OAuth2 password grant
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setToken(data.access_token);
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Refetch user info
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newProject: { name: string, location: string, capacity_kw: number }) => 
      apiClient('/projects/', {
        method: 'POST',
        body: JSON.stringify(newProject),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useAddInverter = (projectId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newInverter: { serial_number: string, vendor_type: string, api_key: string, api_secret: string }) => 
      apiClient(`/projects/${projectId}/inverters`, {
        method: 'POST',
        body: JSON.stringify(newInverter),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useTriggerSync = (projectCode: string) => {
  const projectId = extractId(projectCode);
  return useMutation({
    mutationFn: () => apiClient(`/projects/${projectId}/sync`, { method: 'POST' }),
  });
};

export const useProject = (projectCode: string) => {
  const id = extractId(projectCode);
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const data = await apiClient<BackendProject>(`/projects/${id}`);
      return mapBackendProject(data);
    },
    enabled: !!id,
  });
};

export const useUpdateProject = (projectCode: string) => {
  const id = extractId(projectCode);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updated: any) => apiClient(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(updated) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useInverter = (id: number) => {
  return useQuery({
    queryKey: ['inverters', id],
    queryFn: () => apiClient<any>(`/inverters/${id}`),
    enabled: !!id,
  });
};

export const useProxyData = (inverterSn: string) => {
  return useQuery({
    queryKey: ['proxy', inverterSn],
    queryFn: async () => {
      if (!inverterSn) throw new Error("No Inverter SN");
      return await apiClient(`/proxy/inverters/${inverterSn}/live-status`);
    },
    enabled: !!inverterSn,
    refetchInterval: 60000, 
  });
};

export const useKPIs = (projectCode: string) => {
  const id = extractId(projectCode);
  return useQuery({
    queryKey: ['projects', id, 'kpis'],
    queryFn: () => apiClient<any>(`/projects/${id}/kpis`),
    enabled: !!id,
  });
};

export const useRecalculateKPIs = (projectCode: string) => {
  const id = extractId(projectCode);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient(`/projects/${id}/kpis/recalculate`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', id, 'kpis'] }),
  });
};

export const useMonthlyData = (projectCode: string) => {
  const id = extractId(projectCode);
  return useQuery({
    queryKey: ['projects', id, 'monthly-data'],
    queryFn: () => apiClient<any[]>(`/projects/${id}/monthly-data`),
    enabled: !!id,
  });
};

export const useUploadMonthlyCSV = (projectCode: string) => {
  const id = extractId(projectCode);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/projects/${id}/monthly-data/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error('CSV Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id, 'monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id, 'kpis'] });
    },
  });
};

export const useBreakdownEvents = (inverterId: number) => {
  return useQuery({
    queryKey: ['inverters', inverterId, 'events'],
    queryFn: () => apiClient<any[]>(`/inverters/${inverterId}/breakdown-events`),
    enabled: !!inverterId,
  });
};

export const useAddBreakdownEvent = (inverterId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (event: any) => apiClient(`/inverters/${inverterId}/breakdown-events`, { method: 'POST', body: JSON.stringify(event) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inverters', inverterId, 'events'] }),
  });
};

export const useModuleBuilds = () => {
  return useQuery({
    queryKey: ['module-builds'],
    queryFn: () => apiClient<any[]>('/module-builds/'),
  });
};

export const useCreateModuleBuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (build: any) => apiClient('/module-builds/', { method: 'POST', body: JSON.stringify(build) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['module-builds'] }),
  });
};

export const useMe = () => {
  const setToken = useAuthStore(state => state.setToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await apiClient<any>('/auth/me');
      if (user && user.role) {
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
           setToken(currentToken, user.role.toLowerCase());
        }
      }
      return user;
    },
    retry: false,
  });
};
