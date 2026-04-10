import Dexie, { type Table } from "dexie";
import { ProjectFile, Project, GlobalStat, VercelToken } from "../types";

export type { ProjectFile, Project, GlobalStat, VercelToken };

export class VFSDB extends Dexie {
  files!: Table<ProjectFile>;
  projects!: Table<Project>;
  stats!: Table<GlobalStat>;
  tokens!: Table<VercelToken>;

  constructor() {
    super("VFSDB");
    this.version(4).stores({
      files: "++id, projectId, path",
      projects: "id, name, createdAt, isDeployed",
      stats: "id",
      tokens: "++id, name, isActive",
    });
  }
}

export const db = new VFSDB();
