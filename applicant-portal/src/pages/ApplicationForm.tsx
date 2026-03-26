import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Upload, CheckCircle } from 'lucide-react';
import { API_URL } from '@/config/api';

export default function ApplicationForm() {
  const { postingId } = useParams<{ postingId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [applicationId, setApplicationId] = useState('');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');

  // EEO (voluntary)
  const [eeoGender, setEeoGender] = useState('');
  const [eeoRace, setEeoRace] = useState('');
  const [eeoVeteran, setEeoVeteran] = useState('');
  const [eeoDisability, setEeoDisability] = useState('');
  const [eeoDeclined, setEeoDeclined] = useState(false);

  // Cross-role consideration
  const [openToOtherRoles, setOpenToOtherRoles] = useState(false);

  const totalSteps = 4; // Contact, Resume, EEO, Review

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('posting_id', postingId!);
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      if (phone) formData.append('phone', phone);
      if (coverLetter) formData.append('cover_letter', coverLetter);
      if (resume) formData.append('resume', resume);
      if (openToOtherRoles) formData.append('open_to_other_roles', 'true');

      const res = await fetch(`${API_URL}/applicant-portal/apply`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Application submission failed');
      }

      const data = await res.json();
      setApplicationId(data.application_id);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
        <p className="text-gray-600 mb-2">
          Your application ID is <strong>{applicationId}</strong>.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          We'll review your application and get back to you. Sign in to track your application status.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/jobs" className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Browse More Jobs
          </Link>
          <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Sign In to Track
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900">Apply</h1>

      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Contact Info */}
      {step === 1 && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!firstName || !lastName || !email}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Resume & Cover Letter */}
      {step === 2 && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Resume & Cover Letter</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resume (Optional)
            </label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {resume ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{resume.name}</span>
                  <button onClick={() => setResume(null)} className="text-sm text-red-500 hover:text-red-700 ml-2">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to upload resume</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={e => setResume(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Letter (Optional)
            </label>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              rows={5}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Tell us why you're interested in this role..."
            />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: EEO (Voluntary) */}
      {step === 3 && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Voluntary Self-Identification</h2>
          <p className="text-sm text-gray-500">
            This information is voluntary and will not affect your application.
            It is collected for federal reporting purposes and is kept separate from your application.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eeoDeclined}
              onChange={e => setEeoDeclined(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">I prefer not to self-identify</span>
          </label>
          {!eeoDeclined && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select value={eeoGender} onChange={e => setEeoGender(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-Binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Race/Ethnicity</label>
                <select value={eeoRace} onChange={e => setEeoRace(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option>Hispanic or Latino</option>
                  <option>White (Not Hispanic or Latino)</option>
                  <option>Black or African American (Not Hispanic or Latino)</option>
                  <option>Asian (Not Hispanic or Latino)</option>
                  <option>Native Hawaiian or Other Pacific Islander</option>
                  <option>American Indian or Alaska Native</option>
                  <option>Two or More Races</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Veteran Status</label>
                <select value={eeoVeteran} onChange={e => setEeoVeteran(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option>Protected Veteran</option>
                  <option>Not a Protected Veteran</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disability Status</label>
                <select value={eeoDisability} onChange={e => setEeoDisability(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  <option>Yes, I Have A Disability</option>
                  <option>No, I Don't Have A Disability</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Review Application
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h2 className="text-lg font-semibold">Review Your Application</h2>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
              <p className="text-sm"><strong>{firstName} {lastName}</strong></p>
              <p className="text-sm text-gray-600">{email}</p>
              {phone && <p className="text-sm text-gray-600">{phone}</p>}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Documents</h3>
              <p className="text-sm">Resume: {resume ? resume.name : 'Not uploaded'}</p>
              <p className="text-sm">Cover Letter: {coverLetter ? 'Provided' : 'Not provided'}</p>
            </div>
          </div>

          {/* Cross-Role Consideration */}
          <div className="bg-bifrost-violet/[0.04] border border-bifrost-violet/10 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={openToOtherRoles}
                onChange={e => setOpenToOtherRoles(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Consider me for other roles
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  If this position isn't the right fit, I'd like to be considered for other
                  opportunities that match my skills and experience.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-bifrost-violet text-white rounded-lg text-sm hover:bg-bifrost-violet-dark disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
