import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiOutlinePhotograph, HiX } from 'react-icons/hi';

const CreateTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', tag: '', bio: '', logo: '', recruitmentMode: 'invite' });
  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setLogoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setLogoFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('tag', formData.tag);
      data.append('bio', formData.bio);
      data.append('recruitmentMode', formData.recruitmentMode);
      
      if (logoFile) {
        data.append('logoImage', logoFile);
      } else if (formData.logo) {
        data.append('logo', formData.logo);
      }

      const res = await api.post('/teams', data);
      toast.success('Team created successfully!');
      navigate(`/teams/${res.team._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white">Create a Team</h1>
          <p className="text-dark-400">Set up your roster to start playing in scrims</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-300 mb-1.5 block">Team Name <span className="text-red-500">*</span></label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., GodLike Esports" className="input-field" />
            </div>

            <div>
              <label className="text-sm font-medium text-dark-300 mb-1.5 block">Team Tag <span className="text-red-500">*</span></label>
              <input required type="text" maxLength="4" value={formData.tag} onChange={e => setFormData({ ...formData, tag: e.target.value.toUpperCase() })} placeholder="e.g., GODL" className="input-field font-mono uppercase" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-dark-300 mb-1.5 block">Bio</label>
            <textarea rows="3" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about your team..." className="input-field" />
          </div>

          <div>
            <label className="text-sm font-medium text-dark-300 mb-1.5 block">Team Logo</label>
            {!preview ? (
              <div className="border-2 border-dashed border-surface-border rounded-xl p-8 text-center hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <HiOutlinePhotograph className="mx-auto text-3xl text-dark-500 mb-2" />
                <p className="text-sm font-medium text-white mb-1">Click or drag to upload logo</p>
                <p className="text-xs text-dark-400">PNG, JPG up to 5MB (1:1 Ratio Recommended)</p>
              </div>
            ) : (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Logo preview"
                  className="w-32 h-32 object-cover rounded-xl border border-surface-border bg-dark-900"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                >
                  <HiX className="text-sm" />
                </button>
              </div>
            )}
            
            <div className="mt-4">
              <label className="text-xs font-medium text-dark-400 mb-1 block">Or provide an external URL</label>
              <input type="url" value={formData.logo} onChange={e => setFormData({ ...formData, logo: e.target.value })} placeholder="https://..." className="input-field text-sm" />
            </div>
          </div>

          <div className="border-t border-surface-border pt-5">
            <label className="text-sm font-bold text-white mb-3 block">Recruitment / Roster Building</label>
            <p className="text-xs text-dark-400 mb-4">Your team has 4 rigid slots (1 Captain, 3 Players). Choose how you want to fill your roster.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.recruitmentMode === 'invite' ? 'border-neon-cyan bg-neon-cyan/5' : 'border-surface-border bg-dark-900'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="recruitment" checked={formData.recruitmentMode === 'invite'} onChange={() => setFormData({ ...formData, recruitmentMode: 'invite' })} className="text-neon-cyan bg-dark-800 border-surface-border" />
                  <span className="font-bold text-white text-sm">Invite Based</span>
                </div>
                <p className="text-xs text-dark-400 ml-5">You will manually enter Player UIDs to add members to your roster.</p>
              </label>

              <label className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.recruitmentMode === 'public' ? 'border-primary-500 bg-primary-500/5' : 'border-surface-border bg-dark-900'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="recruitment" checked={formData.recruitmentMode === 'public'} onChange={() => setFormData({ ...formData, recruitmentMode: 'public' })} className="text-primary-500 bg-dark-800 border-surface-border" />
                  <span className="font-bold text-white text-sm">Open to Public</span>
                </div>
                <p className="text-xs text-dark-400 ml-5">List this team on the "Find Team" board. Players can apply to join.</p>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border">
            <button type="submit" disabled={loading} className="btn-neon w-full">
              {loading ? 'Creating...' : 'Create Team & Manage Roster'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateTeam;
