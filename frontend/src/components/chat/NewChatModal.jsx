import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  User,
  Users,
  Plus,
  MessageCircle,
  UserPlus,
  Check,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import api from "../../services/api";

const NewChatModal = ({ isOpen, onClose, onChatCreated, currentUser }) => {
  const [chatType, setChatType] = useState("direct"); // direct, group
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName("");
    setGroupDescription("");
    setChatType("direct");
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.chat.searchUsers(searchQuery);

      if (response.data.success) {
        // Filter out current user from results
        const filteredUsers = response.data.users.filter(
          (user) => user._id !== currentUser.id
        );
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.find((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      } else {
        // For direct chat, only allow one user
        if (chatType === "direct") {
          return [user];
        }
        return [...prev, user];
      }
    });
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      alert("کم از کم ایک صارف منتخب کریں");
      return;
    }

    if (chatType === "group" && !groupName.trim()) {
      alert("گروپ کا نام درج کریں");
      return;
    }

    try {
      setCreating(true);

      let chatData;

      if (chatType === "direct") {
        // For direct chat, send only recipientId
        chatData = {
          recipientId: selectedUsers[0]._id,
        };
      } else {
        // For group chat, send participantIds and group info
        chatData = {
          name: groupName.trim(),
          description: groupDescription.trim(),
          participantIds: selectedUsers.map((user) => user._id),
          isPublic: false,
        };
      }

      const response = await api.chat.createConversation({
        type: chatType,
        ...chatData,
      });

      if (response.data.success) {
        onChatCreated(response.data.conversation);
        onClose();
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
      alert("گفتگو بنانے میں خرابی ہوئی");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold nastaleeq-heading">نئی گفتگو</h2>
            <p className="text-sm text-white/80 nastaleeq-primary">
              نئی بات چیت شروع کریں
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Chat Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-urdu-brown mb-3 nastaleeq-primary">
              گفتگو کی قسم
            </label>
            <div className="flex space-x-4">
              <Button
                variant={chatType === "direct" ? "default" : "outline"}
                onClick={() => {
                  setChatType("direct");
                  setSelectedUsers(selectedUsers.slice(0, 1)); // Keep only first user for direct
                }}
                className={
                  chatType === "direct"
                    ? "bg-urdu-maroon text-white"
                    : "border-urdu-gold text-urdu-brown hover:bg-urdu-cream/30"
                }
              >
                <User className="w-4 h-4 mr-2" />
                <span className="nastaleeq-primary">ذاتی گفتگو</span>
              </Button>
              <Button
                variant={chatType === "group" ? "default" : "outline"}
                onClick={() => setChatType("group")}
                className={
                  chatType === "group"
                    ? "bg-urdu-maroon text-white"
                    : "border-urdu-gold text-urdu-brown hover:bg-urdu-cream/30"
                }
              >
                <Users className="w-4 h-4 mr-2" />
                <span className="nastaleeq-primary">گروپ گفتگو</span>
              </Button>
            </div>
          </div>

          {/* Group Details (if group chat) */}
          {chatType === "group" && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  گروپ کا نام *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="گروپ کا نام درج کریں..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  تفصیل
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="گروپ کی تفصیل (اختیاری)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                  dir="rtl"
                />
              </div>
            </div>
          )}

          {/* User Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
              صارفین تلاش کریں
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="نام یا یوزر نیم سے تلاش کریں..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                dir="rtl"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                منتخب صارفین ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center space-x-2 bg-urdu-cream/50 px-3 py-1 rounded-full border border-urdu-gold/30"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-urdu-brown nastaleeq-primary">
                      {user.name || user.username}
                    </span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  تلاش کے نتائج
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.map((user) => {
                    const isSelected = selectedUsers.find(
                      (u) => u._id === user._id
                    );

                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleUserSelection(user)}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-urdu-cream/50 border-urdu-gold text-urdu-brown"
                            : "bg-white border-gray-200 hover:bg-urdu-cream/20 hover:border-urdu-gold/50"
                        }`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-urdu-brown nastaleeq-primary">
                            {user.name || user.username}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {user.role === "poet"
                              ? "شاعر"
                              : user.role === "admin"
                              ? "ایڈمن"
                              : "قاری"}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 bg-urdu-maroon rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : searchQuery.length > 2 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 nastaleeq-primary">
                  کوئی صارف نہیں ملا
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            منسوخ
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={
              selectedUsers.length === 0 ||
              creating ||
              (chatType === "group" && !groupName.trim())
            }
            className="bg-urdu-maroon hover:bg-urdu-brown text-white"
          >
            {creating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                <span className="nastaleeq-primary">
                  {chatType === "group" ? "گروپ بنائیں" : "گفتگو شروع کریں"}
                </span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NewChatModal;
