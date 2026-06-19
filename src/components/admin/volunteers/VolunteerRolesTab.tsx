/**
 * Volunteer Roles Tab
 * Admin list/management of volunteer roles
 */

import { useState } from 'react';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { VolunteerStatusBadge } from './VolunteerStatusBadge';
import { VolunteerRoleForm } from './VolunteerRoleForm';
import { COMMITMENT_TYPE_LABELS } from '@/lib/volunteer/status';
import {
  useVolunteerRoles,
  useCreateVolunteerRole,
  useUpdateVolunteerRole,
  useDeleteVolunteerRole,
} from '@/hooks/useVolunteer';
import type { VolunteerRole, VolunteerCommitmentType } from '@/lib/types/volunteer';
import { useToast, type Toast } from '@/hooks/useToast';

export function VolunteerRolesTab() {
  const { data: roles, isLoading } = useVolunteerRoles();
  const createRole = useCreateVolunteerRole();
  const updateRole = useUpdateVolunteerRole();
  const deleteRole = useDeleteVolunteerRole();
  const { toasts, showToast, removeToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  const handleCreate = () => {
    setEditingRole(null);
    setIsFormOpen(true);
  };

  const handleEdit = (role: VolunteerRole) => {
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, data });
        showToast('Role updated', 'success');
      } else {
        await createRole.mutateAsync(data as any);
        showToast('Role created', 'success');
      }
      setIsFormOpen(false);
      setEditingRole(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save role', 'error');
    }
  };

  const handleDelete = async (role: VolunteerRole) => {
    if (!confirm(`Delete "${role.title}"? This cannot be undone.`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      showToast('Role deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete role', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-5 w-48 bg-gray-100 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">
          Volunteer Roles {roles ? `(${roles.length})` : ''}
        </h3>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-black bg-brand-primary hover:bg-[#e8d95e] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      {!roles || roles.length === 0 ? (
        <AdminEmptyState
          icon={<Briefcase className="w-6 h-6" />}
          title="No volunteer roles yet"
          description="Create your first volunteer role to start building the job board."
          action={{ label: 'Create First Role', onClick: handleCreate }}
        />
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all cursor-pointer"
              onClick={() => handleEdit(role)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-black">{role.title}</h4>
                    <VolunteerStatusBadge status={role.status} type="role" />
                    {role.is_public && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Public
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{COMMITMENT_TYPE_LABELS[role.commitment_type as VolunteerCommitmentType]}</span>
                    {role.spots_available && (
                      <span>{role.spots_available} spots</span>
                    )}
                    <span>{(role as any).application_count || 0} applications</span>
                    {role.application_deadline && (
                      <span>Deadline: {new Date(role.application_deadline).toLocaleDateString()}</span>
                    )}
                  </div>
                  {role.summary && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{role.summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(role); }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VolunteerRoleForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingRole(null); }}
        onSave={handleSave}
        role={editingRole}
        isSaving={createRole.isPending || updateRole.isPending}
      />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((t: Toast) => (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer transition-all ${
                t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
