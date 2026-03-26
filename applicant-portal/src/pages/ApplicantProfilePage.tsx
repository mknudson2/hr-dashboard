import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '@/utils/api';
import { apiFetch } from '@/utils/api';

interface ProfileData {
  id: number;
  applicant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  current_employer: string | null;
  current_title: string | null;
  years_of_experience: number | null;
  has_account: boolean;
  open_to_other_roles: boolean;
  pool_opted_in_at: string | null;
  created_at: string | null;
}

export default function ApplicantProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [currentEmployer, setCurrentEmployer] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiGet<ProfileData>('/applicant-portal/profile');
      setProfile(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPhone(data.phone || '');
      setLinkedinUrl(data.linkedin_url || '');
      setPortfolioUrl(data.portfolio_url || '');
      setCurrentEmployer(data.current_employer || '');
      setCurrentTitle(data.current_title || '');
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch('/applicant-portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          linkedin_url: linkedinUrl || null,
          portfolio_url: portfolioUrl || null,
          current_employer: currentEmployer || null,
          current_title: currentTitle || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSuccess('Profile updated successfully');
      setEditing(false);
      await loadProfile();
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    setChangingPassword(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/applicant-portal/profile/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess('Password changed successfully');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      setError(e.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-600">{error || 'Failed to load profile'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/my-applications" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; My Applications
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      {/* Profile Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={profile.email} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
              <input type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Employer</label>
                <input type="text" value={currentEmployer} onChange={e => setCurrentEmployer(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                <input type="text" value={currentTitle} onChange={e => setCurrentTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <ProfileField label="Name" value={`${profile.first_name} ${profile.last_name}`} />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="Phone" value={profile.phone} />
            <ProfileField label="LinkedIn" value={profile.linkedin_url} />
            <ProfileField label="Portfolio" value={profile.portfolio_url} />
            <ProfileField label="Current Employer" value={profile.current_employer} />
            <ProfileField label="Current Title" value={profile.current_title} />
            <ProfileField label="Applicant ID" value={profile.applicant_id} />
          </dl>
        )}
      </div>

      {/* Password Change */}
      {profile.has_account && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            {!showPasswordChange && (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                Change Password
              </button>
            )}
          </div>
          {showPasswordChange && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={handlePasswordChange} disabled={changingPassword || !currentPassword || !newPassword} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button onClick={() => { setShowPasswordChange(false); setCurrentPassword(''); setNewPassword(''); }} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cross-Role Consideration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Cross-Role Consideration</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.open_to_other_roles}
            onChange={async (e) => {
              const newVal = e.target.checked;
              try {
                await apiPut('/applicant-portal/profile/pool-preference', {
                  open_to_other_roles: newVal,
                });
                setProfile(prev => prev ? { ...prev, open_to_other_roles: newVal } : prev);
                setSuccess(newVal ? 'You are now in the candidate pool for other roles' : 'Removed from candidate pool');
              } catch {
                setError('Failed to update preference');
              }
            }}
            className="mt-0.5 rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">
              I'm open to being considered for other roles
            </span>
            <p className="text-xs text-gray-500 mt-1">
              Our HR team may reach out about positions that match your profile.
            </p>
            {profile.pool_opted_in_at && profile.open_to_other_roles && (
              <p className="text-xs text-gray-400 mt-1">
                Opted in on {new Date(profile.pool_opted_in_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </label>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Account</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Account type: {profile.has_account ? 'Full account' : 'Magic link only'}</p>
          {profile.created_at && <p>Member since: {new Date(profile.created_at).toLocaleDateString()}</p>}
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '—'}</dd>
    </div>
  );
}
