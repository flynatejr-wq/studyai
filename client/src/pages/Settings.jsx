import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Lock, Trash2, Save, LogOut } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast({ message: "Name cannot be empty.", type: "error" });
    if (newPassword && newPassword !== confirmPassword)
      return toast({ message: "New passwords do not match.", type: "error" });
    if (newPassword && newPassword.length < 8)
      return toast({ message: "New password must be at least 8 characters.", type: "error" });

    setProfileLoading(true);
    try {
      await api.auth.updateProfile({
        name: name.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      await refreshUser();
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast({ message: "Profile updated successfully!", type: "success" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.auth.deleteAccount({ password: deletePassword });
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast({ message: err.message, type: "error" });
      setShowDeleteModal(false);
      setDeletePassword("");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a12]">
      <Sidebar onLogout={logout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 max-w-2xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <User className="text-indigo-400" size={28} /> Account Settings
          </h1>
          <p className="text-gray-400 mt-1">Manage your profile and account preferences.</p>
        </div>

        {/* Profile Section */}
        <motion.form onSubmit={handleSaveProfile} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold mb-5 flex items-center gap-2">
            <User size={16} className="text-indigo-400" /> Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                placeholder="Your name" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">Email</label>
              <input value={user?.email || ""} disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-gray-500 text-sm cursor-not-allowed" />
              <p className="text-gray-600 text-xs mt-1">Email cannot be changed.</p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
              <Lock size={14} className="text-indigo-400" /> Change Password
              <span className="text-gray-500 font-normal">(optional)</span>
            </h3>
            <div className="space-y-3">
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm" />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm" />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm" />
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <button type="submit" disabled={profileLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-semibold text-sm transition-colors">
              <Save size={15} />
              {profileLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </motion.form>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-red-400 font-bold mb-1 flex items-center gap-2">
            <Trash2 size={16} /> Danger Zone
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Permanently delete your account and all your data. This cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
              className="flex-1 bg-white/5 border border-red-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors text-sm" />
            <button
              onClick={() => {
                if (!deletePassword) return toast({ message: "Enter your password first.", type: "error" });
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-semibold text-sm transition-colors shrink-0">
              <Trash2 size={15} /> Delete Account
            </button>
          </div>
        </motion.div>

        {/* Logout */}
        <button onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </main>

      <ConfirmModal
        open={showDeleteModal}
        title="Delete your account?"
        message="This will permanently delete your account, all guides, quizzes, and progress. There is no way to recover this data."
        confirmText={deleteLoading ? "Deleting..." : "Yes, Delete Everything"}
        onConfirm={handleDeleteAccount}
        onCancel={() => { setShowDeleteModal(false); setDeletePassword(""); }}
      />
    </div>
  );
}
