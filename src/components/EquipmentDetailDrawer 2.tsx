import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Package, User, Calendar, DollarSign, MapPin,
  CheckCircle, AlertTriangle, Truck, Tag, FileText, History,
  UserX, Send, Box, Loader2, Trash2, Edit3, Save, UserPlus,
  RotateCcw, Search, ChevronDown
} from 'lucide-react';

const BASE_URL = '';

interface Equipment {
  id: number;
  equipment_id: string;
  equipment_type: string;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  status: string;
  condition: string;
  location: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_expiration: string | null;
  notes: string | null;
}

interface Assignment {
  id: number;
  assignment_id: string;
  equipment_id: number;
  employee_id: string;
  assigned_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  status: string;
  condition_at_assignment: string;
  condition_at_return: string | null;
  assigned_by: string | null;
  return_notes: string | null;
  notes: string | null;
  return_requested: boolean;
  return_requested_date: string | null;
  return_requested_by: string | null;
  shipping_label_requested: boolean;
  shipping_label_sent: boolean;
  shipping_label_sent_date: string | null;
  shipping_label_tracking: string | null;
  equipment_received: boolean;
  equipment_received_date: string | null;
  received_by: string | null;
  equipment_condition_checklist: string | null;
}

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  status: string;
  termination_date?: string;
}

interface EquipmentDetailDrawerProps {
  equipmentId: number | null;
  onClose: () => void;
  onUpdate?: () => void;
}

const EQUIPMENT_TYPES = [
  'Laptop', 'Monitor', 'Phone', 'Keyboard', 'Mouse', 'Dock',
  'Headset', 'Webcam', 'Tablet', 'Desktop', 'Printer', 'Other'
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

const CONDITION_CHECKLIST = [
  { id: 'power_on', label: 'Powers on correctly' },
  { id: 'screen_intact', label: 'Screen intact (no cracks)' },
  { id: 'keyboard_working', label: 'Keyboard functional' },
  { id: 'ports_working', label: 'All ports working' },
  { id: 'no_physical_damage', label: 'No physical damage' },
  { id: 'charger_included', label: 'Charger/cables included' },
  { id: 'data_wiped', label: 'Data wiped/reset' },
  { id: 'accessories_returned', label: 'All accessories returned' }
];

export default function EquipmentDetailDrawer({ equipmentId, onClose, onUpdate }: EquipmentDetailDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'return' | 'history'>('details');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Equipment>>({});

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Return completion state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnNotes, setReturnNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  // Return tracking state
  const [returnTracking, setReturnTracking] = useState({
    return_requested: false,
    return_requested_date: '',
    return_requested_by: '',
    shipping_label_requested: false,
    shipping_label_sent: false,
    shipping_label_sent_date: '',
    shipping_label_tracking: '',
    equipment_received: false,
    equipment_received_date: '',
    received_by: '',
    checklist: {} as Record<string, boolean>
  });

  useEffect(() => {
    if (equipmentId) {
      loadEquipmentDetails();
    }
  }, [equipmentId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        else if (showAssignModal) setShowAssignModal(false);
        else if (showReturnModal) setShowReturnModal(false);
        else if (isEditing) setIsEditing(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showDeleteConfirm, showAssignModal, showReturnModal, isEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadEquipmentDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/equipment/${equipmentId}`);
      if (response.ok) {
        const data = await response.json();
        setEquipment(data.equipment);
        setCurrentAssignment(data.current_assignment);
        setCurrentUser(data.current_user);
        setAssignmentHistory(data.assignment_history || []);

        // Initialize edit form
        setEditForm(data.equipment);

        // Initialize return tracking from current assignment
        if (data.current_assignment) {
          const a = data.current_assignment;
          let checklist = {};
          try {
            checklist = a.equipment_condition_checklist ? JSON.parse(a.equipment_condition_checklist) : {};
          } catch (e) {
            checklist = {};
          }

          setReturnTracking({
            return_requested: a.return_requested || false,
            return_requested_date: a.return_requested_date || '',
            return_requested_by: a.return_requested_by || '',
            shipping_label_requested: a.shipping_label_requested || false,
            shipping_label_sent: a.shipping_label_sent || false,
            shipping_label_sent_date: a.shipping_label_sent_date || '',
            shipping_label_tracking: a.shipping_label_tracking || '',
            equipment_received: a.equipment_received || false,
            equipment_received_date: a.equipment_received_date || '',
            received_by: a.received_by || '',
            checklist
          });
        }
      }
    } catch (error) {
      console.error('Error loading equipment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch(`${BASE_URL}/employees/`);
      if (response.ok) {
        const data = await response.json();
        const activeEmployees = data.filter((emp: Employee) => emp.status === 'Active');
        setEmployees(activeEmployees);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDelete = async () => {
    if (!equipment) return;
    setDeleting(true);
    try {
      const response = await fetch(`${BASE_URL}/equipment/${equipment.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onUpdate?.();
        onClose();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete equipment');
      }
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Failed to delete equipment');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!equipment) return;
    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/equipment/${equipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        await loadEquipmentDetails();
        setIsEditing(false);
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update equipment');
      }
    } catch (error) {
      console.error('Error updating equipment:', error);
      alert('Failed to update equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!equipment || !selectedEmployee) return;
    setAssigning(true);
    try {
      // If currently assigned, unassign first
      if (currentAssignment) {
        await fetch(`${BASE_URL}/equipment/assignments/${currentAssignment.id}/unassign`, {
          method: 'POST'
        });
      }

      // Create new assignment
      const response = await fetch(`${BASE_URL}/equipment/assignments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: equipment.id,
          employee_id: selectedEmployee.employee_id,
          assigned_date: new Date().toISOString().split('T')[0],
          condition_at_assignment: equipment.condition
        })
      });

      if (response.ok) {
        await loadEquipmentDetails();
        setShowAssignModal(false);
        setSelectedEmployee(null);
        setEmployeeSearch('');
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to assign equipment');
      }
    } catch (error) {
      console.error('Error assigning equipment:', error);
      alert('Failed to assign equipment');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!currentAssignment) return;
    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/equipment/assignments/${currentAssignment.id}/unassign`, {
        method: 'POST'
      });
      if (response.ok) {
        await loadEquipmentDetails();
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to unassign equipment');
      }
    } catch (error) {
      console.error('Error unassigning equipment:', error);
      alert('Failed to unassign equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteReturn = async () => {
    if (!currentAssignment) return;
    setCompleting(true);
    try {
      const response = await fetch(`${BASE_URL}/equipment/assignments/${currentAssignment.id}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returned_date: new Date().toISOString().split('T')[0],
          condition_at_return: returnCondition,
          return_notes: returnNotes || null
        })
      });
      if (response.ok) {
        await loadEquipmentDetails();
        setShowReturnModal(false);
        setReturnCondition('Good');
        setReturnNotes('');
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to complete return');
      }
    } catch (error) {
      console.error('Error completing return:', error);
      alert('Failed to complete return');
    } finally {
      setCompleting(false);
    }
  };

  const updateReturnTracking = async () => {
    if (!currentAssignment) return;
    setSaving(true);
    try {
      const payload = {
        return_requested: returnTracking.return_requested,
        return_requested_date: returnTracking.return_requested_date || null,
        return_requested_by: returnTracking.return_requested_by || null,
        shipping_label_requested: returnTracking.shipping_label_requested,
        shipping_label_sent: returnTracking.shipping_label_sent,
        shipping_label_sent_date: returnTracking.shipping_label_sent_date || null,
        shipping_label_tracking: returnTracking.shipping_label_tracking || null,
        equipment_received: returnTracking.equipment_received,
        equipment_received_date: returnTracking.equipment_received_date || null,
        received_by: returnTracking.received_by || null,
        equipment_condition_checklist: JSON.stringify(returnTracking.checklist)
      };

      const response = await fetch(`${BASE_URL}/equipment/assignments/${currentAssignment.id}/return-tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating return tracking:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = employeeSearch.toLowerCase();
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchLower) ||
           emp.department?.toLowerCase().includes(searchLower) ||
           emp.employee_id.toLowerCase().includes(searchLower);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'Assigned': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'In Repair': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'Retired': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'text-green-600 dark:text-green-400';
      case 'Good': return 'text-blue-600 dark:text-blue-400';
      case 'Fair': return 'text-yellow-600 dark:text-yellow-400';
      case 'Poor': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const isTerminated = currentUser?.status === 'Terminated';

  if (!equipmentId) return null;

  return (
    <AnimatePresence>
      {equipmentId && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : equipment ? (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {equipment.equipment_id}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {equipment.manufacturer} {equipment.model}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
                      >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(equipment.status)}`}>
                      {equipment.status}
                    </span>
                    <span className={`text-sm font-medium ${getConditionColor(equipment.condition)}`}>
                      {equipment.condition} Condition
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    {equipment.status === 'Available' && (
                      <button
                        onClick={() => {
                          loadEmployees();
                          setShowAssignModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign
                      </button>
                    )}
                    {currentAssignment && (
                      <>
                        <button
                          onClick={() => {
                            loadEmployees();
                            setShowAssignModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reassign
                        </button>
                        <button
                          onClick={() => setShowReturnModal(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete Return
                        </button>
                      </>
                    )}
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'details'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Details
                    </button>
                    {currentAssignment && isTerminated && (
                      <button
                        onClick={() => setActiveTab('return')}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                          activeTab === 'return'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <UserX className="w-4 h-4" />
                        Return Tracking
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                        activeTab === 'history'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      History
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Current Assignment */}
                      {currentAssignment && currentUser && (
                        <div className={`p-4 rounded-lg border ${isTerminated ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <User className={`w-5 h-5 ${isTerminated ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                              <h3 className={`font-semibold ${isTerminated ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'}`}>
                                Currently Assigned To
                              </h3>
                              {isTerminated && (
                                <span className="text-xs px-2 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full">
                                  TERMINATED
                                </span>
                              )}
                            </div>
                            <button
                              onClick={handleUnassign}
                              disabled={saving}
                              className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                            >
                              Unassign
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Employee:</span>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {currentUser.first_name} {currentUser.last_name}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{currentUser.employee_id}</p>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Department:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{currentUser.department}</p>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Assigned:</span>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {new Date(currentAssignment.assigned_date).toLocaleDateString()}
                              </p>
                            </div>
                            {isTerminated && currentUser.termination_date && (
                              <div className="col-span-2">
                                <span className="text-red-600 dark:text-red-400">Termination Date:</span>
                                <p className="font-medium text-red-900 dark:text-red-200">
                                  {new Date(currentUser.termination_date).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Equipment Details - Edit Mode */}
                      {isEditing ? (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Edit Equipment
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                              <select
                                value={editForm.equipment_type || ''}
                                onChange={(e) => setEditForm({ ...editForm, equipment_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              >
                                {EQUIPMENT_TYPES.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                              <input
                                type="text"
                                value={editForm.category || ''}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer</label>
                              <input
                                type="text"
                                value={editForm.manufacturer || ''}
                                onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                              <input
                                type="text"
                                value={editForm.model || ''}
                                onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                              <input
                                type="text"
                                value={editForm.serial_number || ''}
                                onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Tag</label>
                              <input
                                type="text"
                                value={editForm.asset_tag || ''}
                                onChange={(e) => setEditForm({ ...editForm, asset_tag: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                              <select
                                value={editForm.condition || ''}
                                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              >
                                {CONDITIONS.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                              <input
                                type="text"
                                value={editForm.location || ''}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
                              <input
                                type="date"
                                value={editForm.purchase_date || ''}
                                onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.purchase_price || ''}
                                onChange={(e) => setEditForm({ ...editForm, purchase_price: parseFloat(e.target.value) || null })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warranty Expires</label>
                              <input
                                type="date"
                                value={editForm.warranty_expiration || ''}
                                onChange={(e) => setEditForm({ ...editForm, warranty_expiration: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                              <textarea
                                value={editForm.notes || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditForm(equipment);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Equipment Details - View Mode */}
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              Equipment Details
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <InfoRow label="Type" value={equipment.equipment_type} />
                              <InfoRow label="Category" value={equipment.category || '-'} />
                              <InfoRow label="Manufacturer" value={equipment.manufacturer || '-'} />
                              <InfoRow label="Model" value={equipment.model || '-'} />
                              <InfoRow label="Serial Number" value={equipment.serial_number || '-'} />
                              <InfoRow label="Asset Tag" value={equipment.asset_tag || '-'} />
                              <InfoRow label="Location" value={equipment.location || '-'} icon={<MapPin className="w-4 h-4" />} />
                            </div>
                          </div>

                          {/* Financial Info */}
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              Financial Information
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <InfoRow
                                label="Purchase Price"
                                value={equipment.purchase_price ? `$${equipment.purchase_price.toLocaleString()}` : '-'}
                              />
                              <InfoRow
                                label="Purchase Date"
                                value={equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString() : '-'}
                              />
                              <InfoRow
                                label="Warranty Expires"
                                value={equipment.warranty_expiration ? new Date(equipment.warranty_expiration).toLocaleDateString() : '-'}
                              />
                            </div>
                          </div>

                          {/* Notes */}
                          {equipment.notes && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{equipment.notes}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'return' && currentAssignment && isTerminated && (
                    <div className="space-y-6">
                      {/* Return Tracking Header */}
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <h3 className="font-semibold text-red-900 dark:text-red-200">
                            Equipment Return Required
                          </h3>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          This equipment is assigned to a terminated employee and needs to be returned.
                        </p>
                      </div>

                      {/* Return Request */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="return_requested"
                            checked={returnTracking.return_requested}
                            onChange={(e) => setReturnTracking(prev => ({ ...prev, return_requested: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <label htmlFor="return_requested" className="font-medium text-gray-900 dark:text-white">
                            Return Requested
                          </label>
                        </div>

                        {returnTracking.return_requested && (
                          <div className="ml-7 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Date Requested
                              </label>
                              <input
                                type="date"
                                value={returnTracking.return_requested_date}
                                onChange={(e) => setReturnTracking(prev => ({ ...prev, return_requested_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Requested By
                              </label>
                              <input
                                type="text"
                                value={returnTracking.return_requested_by}
                                onChange={(e) => setReturnTracking(prev => ({ ...prev, return_requested_by: e.target.value }))}
                                placeholder="Name"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Shipping Label */}
                      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="shipping_label_requested"
                            checked={returnTracking.shipping_label_requested}
                            onChange={(e) => setReturnTracking(prev => ({ ...prev, shipping_label_requested: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <label htmlFor="shipping_label_requested" className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Shipping Label Requested
                          </label>
                        </div>

                        <div className="flex items-center gap-3 ml-7">
                          <input
                            type="checkbox"
                            id="shipping_label_sent"
                            checked={returnTracking.shipping_label_sent}
                            onChange={(e) => setReturnTracking(prev => ({ ...prev, shipping_label_sent: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <label htmlFor="shipping_label_sent" className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Shipping Label Sent
                          </label>
                        </div>

                        {returnTracking.shipping_label_sent && (
                          <div className="ml-7 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Date Sent
                              </label>
                              <input
                                type="date"
                                value={returnTracking.shipping_label_sent_date}
                                onChange={(e) => setReturnTracking(prev => ({ ...prev, shipping_label_sent_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tracking Number
                              </label>
                              <input
                                type="text"
                                value={returnTracking.shipping_label_tracking}
                                onChange={(e) => setReturnTracking(prev => ({ ...prev, shipping_label_tracking: e.target.value }))}
                                placeholder="Tracking #"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Equipment Received */}
                      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="equipment_received"
                            checked={returnTracking.equipment_received}
                            onChange={(e) => setReturnTracking(prev => ({ ...prev, equipment_received: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <label htmlFor="equipment_received" className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Box className="w-4 h-4" />
                            Equipment Received
                          </label>
                        </div>

                        {returnTracking.equipment_received && (
                          <>
                            <div className="ml-7 grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Date Received
                                </label>
                                <input
                                  type="date"
                                  value={returnTracking.equipment_received_date}
                                  onChange={(e) => setReturnTracking(prev => ({ ...prev, equipment_received_date: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Received By
                                </label>
                                <input
                                  type="text"
                                  value={returnTracking.received_by}
                                  onChange={(e) => setReturnTracking(prev => ({ ...prev, received_by: e.target.value }))}
                                  placeholder="Name"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                            </div>

                            {/* Condition Checklist */}
                            <div className="ml-7 mt-4">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Equipment Condition Checklist
                              </h4>
                              <div className="space-y-2">
                                {CONDITION_CHECKLIST.map(item => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={item.id}
                                      checked={returnTracking.checklist[item.id] || false}
                                      onChange={(e) => setReturnTracking(prev => ({
                                        ...prev,
                                        checklist: { ...prev.checklist, [item.id]: e.target.checked }
                                      }))}
                                      className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor={item.id} className="text-sm text-gray-700 dark:text-gray-300">
                                      {item.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Save Button */}
                      <div className="pt-4">
                        <button
                          onClick={updateReturnTracking}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Return Tracking'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Assignment History
                      </h3>

                      {assignmentHistory.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          No assignment history available.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {assignmentHistory.map((assignment) => (
                            <div
                              key={assignment.id}
                              className={`p-4 rounded-lg border ${
                                assignment.status === 'Active'
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {assignment.employee_id}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  assignment.status === 'Active'
                                    ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {assignment.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}
                                </div>
                                {assignment.returned_date && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    Returned: {new Date(assignment.returned_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">Equipment not found</p>
              </div>
            )}
          </motion.div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Equipment</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete this equipment? This action cannot be undone and will also remove all assignment history.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assign/Reassign Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentAssignment ? 'Reassign Equipment' : 'Assign Equipment'}
                  </h3>
                </div>

                {currentAssignment && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    This will unassign the equipment from the current user and assign it to the selected employee.
                  </p>
                )}

                <div ref={dropdownRef} className="relative mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Employee
                  </label>

                  {selectedEmployee ? (
                    <div className="flex items-center justify-between px-3 py-2 border border-green-300 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-gray-900 dark:text-white font-medium">
                          {selectedEmployee.first_name} {selectedEmployee.last_name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          ({selectedEmployee.department})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployee(null)}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                      >
                        <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => {
                          setEmployeeSearch(e.target.value);
                          setShowEmployeeDropdown(true);
                        }}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        placeholder="Search employees..."
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  )}

                  {showEmployeeDropdown && !selectedEmployee && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {loadingEmployees ? (
                        <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                          Loading...
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 10).map(emp => (
                          <button
                            key={emp.employee_id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setEmployeeSearch('');
                              setShowEmployeeDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="text-gray-900 dark:text-white font-medium">
                                {emp.first_name} {emp.last_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {emp.department}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedEmployee(null);
                      setEmployeeSearch('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedEmployee || assigning}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {currentAssignment ? 'Reassign' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Complete Return Modal */}
          {showReturnModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Return</h3>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This will mark the equipment as returned and make it available for reassignment.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Condition at Return
                    </label>
                    <select
                      value={returnCondition}
                      onChange={(e) => setReturnCondition(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {CONDITIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Return Notes (Optional)
                    </label>
                    <textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      rows={3}
                      placeholder="Any notes about the return..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReturnModal(false);
                      setReturnCondition('Good');
                      setReturnNotes('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteReturn}
                    disabled={completing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Complete Return
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
        {icon} {label}:
      </span>
      <p className="font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
