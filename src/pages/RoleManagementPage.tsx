import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Search, Filter, Edit, Trash2, Lock, Unlock,
  ToggleLeft, ToggleRight, Key, X, CheckCircle, XCircle, Users,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import PermissionSelector from '@/components/PermissionSelector';

const API_URL = '';

// Types
interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  permissions: Permission[];
  user_count: number;
}

interface RoleListResponse {
  roles: Role[];
  total: number;
}

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  permission_ids: number[];
  is_active: boolean;
}

interface UserWithRole {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

interface RoleStats {
  total_roles: number;
  active_roles: number;
  system_roles: number;
  custom_roles: number;
  total_permissions: number;
}

interface RoleManagementPageProps {
  embedded?: boolean;
}

const RoleManagementPage = ({ embedded = false }: RoleManagementPageProps = {}) => {
  // Core data state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUsersDrawer, setShowUsersDrawer] = useState(false);
  const [roleUsers, setRoleUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form state
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    permission_ids: [],
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Compute stats
  const stats: RoleStats = useMemo(() => ({
    total_roles: roles.length,
    active_roles: roles.filter(r => r.is_active).length,
    system_roles: roles.filter(r => r.is_system_role).length,
    custom_roles: roles.filter(r => !r.is_system_role).length,
    total_permissions: permissions.length,
  }), [roles, permissions]);

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const matchesSearch = !searchTerm ||
        role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = !statusFilter ||
        (statusFilter === 'active' && role.is_active) ||
        (statusFilter === 'inactive' && !role.is_active);

      const matchesType = !typeFilter ||
        (typeFilter === 'system' && role.is_system_role) ||
        (typeFilter === 'custom' && !role.is_system_role);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [roles, searchTerm, statusFilter, typeFilter]);

  // Fetch data on mount
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchCategories();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/roles/?include_inactive=true`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data: RoleListResponse = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      alert('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/roles/permissions`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data: Permission[] = await response.json();
      setPermissions(data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/roles/permissions/categories`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data: string[] = await response.json();
      setPermissionCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRoleUsers = async (roleId: number) => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_URL}/admin/roles/${roleId}/users`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch role users');
      const data: UserWithRole[] = await response.json();
      setRoleUsers(data);
    } catch (error) {
      console.error('Error fetching role users:', error);
      setRoleUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingRole && !formData.name.trim()) {
      errors.name = 'Role name is required';
    } else if (!editingRole && !/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      errors.name = 'Name must start with a letter and contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.display_name.trim()) {
      errors.display_name = 'Display name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddModal = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      permission_ids: [],
      is_active: true,
    });
    setFormErrors({});
    setShowRoleModal(true);
  };

  const handleOpenEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permission_ids: role.permissions.map(p => p.id),
      is_active: role.is_active,
    });
    setFormErrors({});
    setShowRoleModal(true);
  };

  const handleOpenUsersDrawer = (role: Role) => {
    setSelectedRole(role);
    fetchRoleUsers(role.id);
    setShowUsersDrawer(true);
  };

  const handleCloseUsersDrawer = () => {
    setShowUsersDrawer(false);
    setSelectedRole(null);
    setRoleUsers([]);
  };

  const handleSubmitRole = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingRole) {
        // Update existing role
        const response = await fetch(`${API_URL}/admin/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            display_name: formData.display_name,
            description: formData.description || null,
            permission_ids: formData.permission_ids,
            is_active: formData.is_active,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update role');
        }
      } else {
        // Create new role
        const response = await fetch(`${API_URL}/admin/roles/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            display_name: formData.display_name,
            description: formData.description || null,
            permission_ids: formData.permission_ids,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create role');
        }
      }

      setShowRoleModal(false);
      await fetchRoles();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (role: Role) => {
    if (role.is_system_role) {
      alert('Cannot deactivate system roles');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          is_active: !role.is_active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to toggle role status');
      }

      await fetchRoles();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`${API_URL}/admin/roles/${selectedRole.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete role');
      }

      setShowDeleteConfirm(false);
      setSelectedRole(null);
      await fetchRoles();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete role');
    }
  };

  const openDeleteConfirm = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteConfirm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          {!embedded && (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-7 h-7" />
              Role Management
            </h1>
          )}
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage roles and their permissions
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Role
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Roles', value: stats.total_roles, icon: Shield, color: 'blue' },
          { label: 'Active Roles', value: stats.active_roles, icon: CheckCircle, color: 'green' },
          { label: 'System Roles', value: stats.system_roles, icon: Lock, color: 'purple' },
          { label: 'Custom Roles', value: stats.custom_roles, icon: Unlock, color: 'orange' },
          { label: 'Total Permissions', value: stats.total_permissions, icon: Key, color: 'gray' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="system">System Roles</option>
                <option value="custom">Custom Roles</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Roles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No roles found
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {role.display_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {role.name}
                        </div>
                        {role.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-xs">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        role.is_system_role
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {role.is_system_role ? (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            System
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            Custom
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        role.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        <Key className="w-3 h-3" />
                        {role.permissions.length}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleOpenUsersDrawer(role)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        {role.user_count}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(role.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(role)}
                          className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit role"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(role)}
                          disabled={role.is_system_role}
                          className={`p-2 rounded-lg transition-colors ${
                            role.is_system_role
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={role.is_system_role ? 'Cannot toggle system role' : (role.is_active ? 'Deactivate' : 'Activate')}
                        >
                          {role.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(role)}
                          disabled={role.is_system_role || role.user_count > 0}
                          className={`p-2 rounded-lg transition-colors ${
                            role.is_system_role || role.user_count > 0
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={
                            role.is_system_role
                              ? 'Cannot delete system role'
                              : role.user_count > 0
                              ? `${role.user_count} user(s) assigned`
                              : 'Delete role'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Role Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowRoleModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editingRole ? 'Edit Role' : 'Add New Role'}
                  </h2>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-4">
                    {/* Role Name (only for create) */}
                    {!editingRole && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Role Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                          placeholder="e.g., hr_assistant"
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                            formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Lowercase letters, numbers, and underscores only. Cannot be changed later.
                        </p>
                      </div>
                    )}

                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Display Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="e.g., HR Assistant"
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                          formErrors.display_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {formErrors.display_name && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.display_name}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of this role's purpose..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Active Toggle (only for edit, non-system roles) */}
                    {editingRole && !editingRole.is_system_role && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Active Status</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Inactive roles cannot be assigned to users
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.is_active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Permissions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Permissions ({formData.permission_ids.length} selected)
                      </label>
                      <PermissionSelector
                        permissions={permissions}
                        categories={permissionCategories}
                        selectedIds={formData.permission_ids}
                        onChange={(ids) => setFormData({ ...formData, permission_ids: ids })}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitRole}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {editingRole ? 'Save Changes' : 'Create Role'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && selectedRole && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Role
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete the role{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedRole.display_name}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteRole}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Users Drawer */}
      <AnimatePresence>
        {showUsersDrawer && selectedRole && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleCloseUsersDrawer}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Users with Role
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedRole.display_name}
                  </p>
                </div>
                <button
                  onClick={handleCloseUsersDrawer}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto h-[calc(100%-73px)]">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : roleUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No users assigned to this role</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roleUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.full_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleManagementPage;
