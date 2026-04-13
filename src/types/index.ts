export interface ProjectFile {
  id?: number;
  projectId: string;
  path: string;
  content: string; // Base64 or Text
  isFolder: boolean;
  updatedAt: number;
}

export interface Project {
  id: string; // Project Name or UUID
  name: string;
  createdAt: number;
  updatedAt?: number;
  lastDeployedAt?: number;
  deploymentUrl?: string;
  deploymentId?: string;
  isDeployed?: boolean;
  source?: "manual" | "import";
  temporary?: boolean;
}

export interface GlobalStat {
  id: string;
  value: number;
}

export interface VercelToken {
  id?: number;
  name: string;
  value: string;
  isTrial: boolean;
  isActive: boolean;
}
