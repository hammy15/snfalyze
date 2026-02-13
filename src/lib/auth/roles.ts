// Role definitions and permission matrix for SNFalyze RBAC

export type UserRole = 'admin' | 'vp' | 'analyst' | 'viewer';

export interface RoleDefinition {
  label: string;
  description: string;
  level: number; // Higher = more permissions
  color: string;
}

export const ROLES: Record<UserRole, RoleDefinition> = {
  admin: {
    label: 'Admin',
    description: 'Full system access, user management, settings',
    level: 100,
    color: '#EF4444',
  },
  vp: {
    label: 'VP',
    description: 'All deals, approvals, team management',
    level: 75,
    color: '#8B5CF6',
  },
  analyst: {
    label: 'Analyst',
    description: 'Assigned deals, analysis, document upload',
    level: 50,
    color: '#3B82F6',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to assigned deals',
    level: 25,
    color: '#6B7280',
  },
};

export type Permission =
  | 'deals:view_all'
  | 'deals:view_assigned'
  | 'deals:create'
  | 'deals:edit'
  | 'deals:delete'
  | 'deals:assign'
  | 'documents:upload'
  | 'documents:delete'
  | 'analysis:run'
  | 'analysis:approve'
  | 'export:pdf'
  | 'users:manage'
  | 'settings:manage';

const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  admin: [
    'deals:view_all', 'deals:view_assigned', 'deals:create', 'deals:edit', 'deals:delete', 'deals:assign',
    'documents:upload', 'documents:delete',
    'analysis:run', 'analysis:approve',
    'export:pdf',
    'users:manage', 'settings:manage',
  ],
  vp: [
    'deals:view_all', 'deals:view_assigned', 'deals:create', 'deals:edit', 'deals:assign',
    'documents:upload', 'documents:delete',
    'analysis:run', 'analysis:approve',
    'export:pdf',
  ],
  analyst: [
    'deals:view_assigned', 'deals:create', 'deals:edit',
    'documents:upload',
    'analysis:run',
    'export:pdf',
  ],
  viewer: [
    'deals:view_assigned',
    'export:pdf',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function canViewAllDeals(role: UserRole): boolean {
  return hasPermission(role, 'deals:view_all');
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'users:manage');
}

export function getRoleLevel(role: UserRole): number {
  return ROLES[role]?.level ?? 0;
}
