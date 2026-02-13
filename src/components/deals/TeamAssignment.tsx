'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  X,
  Shield,
  Crown,
  Eye,
  Briefcase,
  Check,
} from 'lucide-react';

interface Assignment {
  id: string;
  userId: string;
  role: string;
  assignedAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userAvatar: string | null;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface TeamAssignmentProps {
  dealId: string;
  className?: string;
}

const roleIcons: Record<string, typeof Shield> = {
  admin: Crown,
  vp: Shield,
  analyst: Briefcase,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  admin: 'text-red-500',
  vp: 'text-purple-500',
  analyst: 'text-blue-500',
  viewer: 'text-gray-500',
};

export function TeamAssignment({ dealId, className }: TeamAssignmentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
    fetchUsers();
  }, [dealId]);

  async function fetchAssignments() {
    try {
      const res = await fetch(`/api/deals/${dealId}/assign`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch {}
  }

  async function assignUser(userId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        fetchAssignments();
        setShowAddUser(false);
      }
    } catch {}
  }

  async function removeUser(userId: string) {
    try {
      await fetch(`/api/deals/${dealId}/assign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      fetchAssignments();
    } catch {}
  }

  const assignedUserIds = new Set(assignments.map(a => a.userId));
  const unassignedUsers = availableUsers.filter(u => !assignedUserIds.has(u.id));

  return (
    <div className={cn('neu-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Team
          </h3>
          <span className="text-xs text-surface-400">{assignments.length} members</span>
        </div>
        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
        >
          <UserPlus className="w-4 h-4 text-surface-500" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-surface-200 dark:bg-surface-700" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-20" />
                <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-xs text-surface-500 text-center py-3">No team members assigned</p>
      ) : (
        <div className="space-y-2">
          {assignments.map(assignment => {
            const Icon = roleIcons[assignment.userRole] || Briefcase;
            const color = roleColors[assignment.userRole] || 'text-gray-500';

            return (
              <div key={assignment.id} className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white">
                    {assignment.userName?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-surface-800 dark:text-surface-200 truncate">
                      {assignment.userName}
                    </span>
                    <Icon className={cn('w-3 h-3', color)} />
                  </div>
                  <span className="text-[10px] text-surface-400 capitalize">
                    {assignment.role || assignment.userRole}
                  </span>
                </div>
                <button
                  onClick={() => removeUser(assignment.userId)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                >
                  <X className="w-3 h-3 text-rose-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Dropdown */}
      {showAddUser && (
        <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-500 mb-2">Add team member:</p>
          {unassignedUsers.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-2">
              {availableUsers.length === 0 ? 'No users registered yet' : 'All users assigned'}
            </p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {unassignedUsers.map(user => {
                const Icon = roleIcons[user.role] || Briefcase;
                const color = roleColors[user.role] || 'text-gray-500';

                return (
                  <button
                    key={user.id}
                    onClick={() => assignUser(user.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800 rounded transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-surface-700 dark:text-surface-300 truncate block">
                        {user.name}
                      </span>
                    </div>
                    <Icon className={cn('w-3 h-3', color)} />
                    <Check className="w-3 h-3 text-surface-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
