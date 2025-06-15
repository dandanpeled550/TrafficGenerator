import React, { useState, useEffect } from "react";
import backendClient from "@/api/backendClient"; // Import backendClient
import UserProfileCard from "../components/profiles/UserProfileCard";
import UserProfileForm from "../components/profiles/UserProfileForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Loader2, Search, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getDefaultUserProfile } from "../components/profiles/ProfileConstants";

export default function UserProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await backendClient.profiles.list(); // Use backendClient to fetch profiles
      setProfiles(data);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfiles([]); // Clear profiles on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (profile = null) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleSubmitProfile = async (profileData) => {
    setIsSubmitting(true);
    try {
      if (editingProfile) {
        await backendClient.profiles.update(editingProfile.id, profileData); // Use backendClient to update profile
      } else {
        await backendClient.profiles.create(profileData); // Use backendClient to create profile
      }
      await loadProfiles(); // Reload profiles after save
      handleCloseForm();
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    setIsSubmitting(true);
    try {
      await backendClient.profiles.delete(profileToDelete.id); // Use backendClient to delete profile
      await loadProfiles(); // Reload profiles after delete
    } catch (error) {
      console.error("Failed to delete profile:", error);
      alert("Failed to delete profile. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setProfileToDelete(null);
    }
  };

  const confirmDelete = (profile) => {
    setProfileToDelete(profile);
    setShowDeleteConfirm(true);
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.description && profile.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-6 text-slate-200">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-10 h-10 text-blue-400" /> User Profiles
            </h1>
            <p className="text-slate-400 text-lg">Manage and create targeted user personas for your campaigns.</p>
          </div>
          <Button
            onClick={() => handleOpenForm()}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create New Profile
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 relative"
        >
          <Input 
            type="text"
            placeholder="Search profiles by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800"
          >
            <Users className="w-20 h-20 text-slate-600 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-white mb-2">No User Profiles Found</h2>
            <p className="text-slate-400 mb-6">
              Start by creating your first user profile to define unique personas for your traffic.
            </p>
            <Button
                onClick={() => handleOpenForm()}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Create Profile
              </Button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProfiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <UserProfileCard profile={profile} onEdit={handleOpenForm} onDelete={() => confirmDelete(profile)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="p-6 pb-4 border-b border-slate-800">
                <DialogTitle className="text-2xl font-bold text-white">
                  {editingProfile ? "Edit User Profile" : "Create New User Profile"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {editingProfile ? "Update the details of your user profile." : "Define a new user persona for your traffic campaigns."}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6">
                <UserProfileForm
                  initialProfile={editingProfile ? { ...getDefaultUserProfile(), ...editingProfile } : getDefaultUserProfile()}
                  onSubmit={handleSubmitProfile}
                  onCancel={handleCloseForm}
                  isSubmitting={isSubmitting}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white">Confirm Delete</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Are you sure you want to delete the profile "{profileToDelete?.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-slate-700 hover:bg-slate-800">Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteProfile} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
