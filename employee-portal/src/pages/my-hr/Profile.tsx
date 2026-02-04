import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPut } from '@/utils/api';
import { User, Mail, Phone, Building2, Calendar, MapPin, AlertCircle, Save, Edit2, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmployeeProfile {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email: string | null;
  personal_phone: string | null;
  department: string;
  team: string | null;
  position: string | null;
  supervisor: string | null;
  hire_date: string;
  employment_type: string | null;
  location: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    email: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedContact, setEditedContact] = useState<EmergencyContact>(emergencyContact);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await apiGet<{ profile: EmployeeProfile; emergency_contact: EmergencyContact | null }>('/portal/my-hr/profile');
        setProfile(data.profile);
        if (data.emergency_contact) {
          setEmergencyContact(data.emergency_contact);
          setEditedContact(data.emergency_contact);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveEmergencyContact = async () => {
    try {
      setSaving(true);
      await apiPut('/portal/my-hr/profile', { emergency_contact: editedContact });
      setEmergencyContact(editedContact);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      {Icon && <Icon className="text-gray-400 mt-0.5" size={18} />}
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-gray-900 dark:text-white font-medium">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View your personal information and update emergency contacts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{profile?.position || 'Employee'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{profile?.department}</p>
            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Employee ID</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">{profile?.employee_id}</p>
            </div>
          </div>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow label="Email" value={user?.email || null} icon={Mail} />
            <InfoRow label="Personal Email" value={profile?.personal_email} icon={Mail} />
            <InfoRow label="Phone" value={profile?.personal_phone} icon={Phone} />
            <InfoRow label="Location" value={profile?.location} icon={MapPin} />
            <InfoRow
              label="Address"
              value={
                profile?.address_street
                  ? `${profile.address_street}, ${profile.address_city}, ${profile.address_state} ${profile.address_zip}`
                  : null
              }
              icon={MapPin}
            />
          </div>
        </motion.div>

        {/* Employment Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow label="Department" value={profile?.department} icon={Building2} />
            <InfoRow label="Team" value={profile?.team} icon={User} />
            <InfoRow label="Position" value={profile?.position} icon={User} />
            <InfoRow label="Supervisor" value={profile?.supervisor} icon={User} />
            <InfoRow
              label="Hire Date"
              value={profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString() : null}
              icon={Calendar}
            />
            <InfoRow label="Employment Type" value={profile?.employment_type} icon={Building2} />
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Emergency Contact</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editedContact.name}
                  onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
                <input
                  type="text"
                  value={editedContact.relationship}
                  onChange={(e) => setEditedContact({ ...editedContact, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editedContact.phone}
                  onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editedContact.email || ''}
                  onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEmergencyContact}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContact(emergencyContact);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {emergencyContact.name ? (
                <>
                  <InfoRow label="Name" value={emergencyContact.name} icon={User} />
                  <InfoRow label="Relationship" value={emergencyContact.relationship} />
                  <InfoRow label="Phone" value={emergencyContact.phone} icon={Phone} />
                  <InfoRow label="Email" value={emergencyContact.email} icon={Mail} />
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No emergency contact on file. Click the edit button to add one.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
