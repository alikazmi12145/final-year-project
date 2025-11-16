import React, { useState, useEffect } from "react";
import {
  Send,
  Upload,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
  User,
  Mail,
  MessageSquare,
  Tag,
  Calendar,
  Star,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import api from "../../services/api";

const SupportTicket = ({ currentUser }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "general",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const priorityOptions = [
    { value: "low", label: "کم اہمیت", color: "text-green-600 bg-green-100" },
    {
      value: "medium",
      label: "درمیانی اہمیت",
      color: "text-yellow-600 bg-yellow-100",
    },
    {
      value: "high",
      label: "زیادہ اہمیت",
      color: "text-orange-600 bg-orange-100",
    },
    { value: "urgent", label: "فوری", color: "text-red-600 bg-red-100" },
  ];

  const categoryOptions = [
    { value: "general", label: "عمومی مسئلہ" },
    { value: "technical", label: "تکنیکی مسئلہ" },
    { value: "account", label: "اکاؤنٹ کا مسئلہ" },
    { value: "poetry", label: "شاعری سے متعلق" },
    { value: "contest", label: "مقابلے کا مسئلہ" },
    { value: "feature", label: "نئے فیچر کی درخواست" },
    { value: "bug", label: "بگ رپورٹ" },
    { value: "other", label: "دیگر" },
  ];

  const statusOptions = {
    open: { label: "کھلا ہوا", color: "text-blue-600 bg-blue-100" },
    in_progress: { label: "جاری", color: "text-yellow-600 bg-yellow-100" },
    waiting_response: {
      label: "جواب کا انتظار",
      color: "text-purple-600 bg-purple-100",
    },
    resolved: { label: "حل ہو گیا", color: "text-green-600 bg-green-100" },
    closed: { label: "بند", color: "text-gray-600 bg-gray-100" },
  };

  // Load user's tickets
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.support.getMyTickets();

      if (response.data.success) {
        setTickets(response.data.tickets || []);
      }
    } catch (error) {
      console.error("Failed to load tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = {};
    
    if (!formData.subject.trim()) {
      validationErrors.subject = "موضوع ضروری ہے";
    } else if (formData.subject.trim().length < 5) {
      validationErrors.subject = "موضوع کم از کم 5 حروف کا ہونا چاہیے";
    } else if (formData.subject.trim().length > 200) {
      validationErrors.subject = "موضوع زیادہ سے زیادہ 200 حروف کا ہو سکتا ہے";
    }
    
    if (!formData.description.trim()) {
      validationErrors.description = "تفصیل ضروری ہے";
    } else if (formData.description.trim().length < 10) {
      validationErrors.description = "تفصیل کم از کم 10 حروف کی ہونی چاہیے";
    } else if (formData.description.trim().length > 5000) {
      validationErrors.description = "تفصیل زیادہ سے زیادہ 5000 حروف کی ہو سکتی ہے";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Validate user info
    if (!currentUser?.email || !currentUser?.name) {
      setErrors({ general: "صارف کی معلومات نامکمل ہیں۔ براہ کرم دوبارہ لاگ ان کریں۔" });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const ticketData = {
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        email: currentUser.email,
        name: currentUser.name,
      };

      console.log("Creating ticket with data:", ticketData);

      const response = await api.support.createTicket(ticketData);

      if (response.data.success) {
        setTickets((prev) => [response.data.ticket, ...prev]);
        setFormData({
          subject: "",
          description: "",
          priority: "medium",
          category: "general",
        });
        setErrors({});
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
      console.error("Error response:", error.response?.data);

      // Handle validation errors
      if (error.response?.data?.errors) {
        const validationErrors = {};
        error.response.data.errors.forEach((err) => {
          console.error("Validation error:", err);
          const fieldName = err.path || err.param || 'general';
          validationErrors[fieldName] = err.msg || err.message;
        });
        console.error("All validation errors:", validationErrors);
        setErrors(validationErrors);
      } else {
        const errorMsg = error.response?.data?.message || "ٹکٹ بنانے میں خرابی ہوئی۔ دوبارہ کوشش کریں۔";
        setErrors({ general: errorMsg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTicketReply = async (ticketId, message) => {
    try {
      const response = await api.support.replyToTicket(ticketId, { message });

      if (response.data.success) {
        // Update the selected ticket with new reply
        setSelectedTicket((prev) => ({
          ...prev,
          messages: [...prev.messages, response.data.reply],
        }));

        // Update tickets list
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket._id === ticketId
              ? {
                  ...ticket,
                  lastActivity: new Date(),
                  status: "waiting_response",
                }
              : ticket
          )
        );
      }
    } catch (error) {
      console.error("Failed to reply to ticket:", error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityInfo = (priority) => {
    return (
      priorityOptions.find((p) => p.value === priority) || priorityOptions[1]
    );
  };

  const getCategoryLabel = (category) => {
    return categoryOptions.find((c) => c.value === category)?.label || "عمومی";
  };

  const renderTicketList = () => (
    <div className="h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-urdu-brown nastaleeq-primary">
            سپورٹ ٹکٹس
          </h3>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-urdu-maroon hover:bg-urdu-brown text-white"
          >
            <MessageSquare className="w-4 h-4 ml-2" />
            نیا ٹکٹ
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Create Ticket Form */}
      {showCreateForm && (
        <Card className="p-6 border-l-4 border-urdu-gold max-h-[calc(100vh-300px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-urdu-brown nastaleeq-primary">
              نیا سپورٹ ٹکٹ بنائیں
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateForm(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-urdu-brown nastaleeq-primary">
                  موضوع *
                </label>
                <span className={`text-xs ${formData.subject.length < 5 ? 'text-red-500' : 'text-gray-500'}`}>
                  {formData.subject.length}/200 (کم از کم 5)
                </span>
              </div>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, subject: e.target.value }));
                  if (errors.subject)
                    setErrors((prev) => ({ ...prev, subject: null }));
                }}
                placeholder="مسئلے کا مختصر عنوان لکھیں... (کم از کم 5 حروف)"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary ${
                  errors.subject ? "border-red-500" : "border-gray-300"
                }`}
                dir="rtl"
                required
                maxLength={200}
              />
              {errors.subject && (
                <p
                  className="mt-1 text-sm text-red-600 nastaleeq-primary"
                  dir="rtl"
                >
                  {errors.subject}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  قسم
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                  dir="rtl"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
                  اہمیت
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
                  dir="rtl"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-urdu-brown nastaleeq-primary">
                  تفصیل *
                </label>
                <span className={`text-xs ${formData.description.length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                  {formData.description.length}/5000 (کم از کم 10)
                </span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  if (errors.description)
                    setErrors((prev) => ({ ...prev, description: null }));
                }}
                placeholder="اپنے مسئلے کی تفصیل بیان کریں... (کم از کم 10 حروف)"
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary ${
                  errors.description ? "border-red-500" : "border-gray-300"
                }`}
                dir="rtl"
                required
                maxLength={5000}
              />
              {errors.description && (
                <p
                  className="mt-1 text-sm text-red-600 nastaleeq-primary"
                  dir="rtl"
                >
                  {errors.description}
                </p>
              )}
            </div>

            {errors.general && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 nastaleeq-primary" dir="rtl">
                  {errors.general}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                منسوخ
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-urdu-maroon hover:bg-urdu-brown text-white"
              >
                {submitting ? <LoadingSpinner size="sm" /> : "ٹکٹ بنائیں"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 nastaleeq-primary">
            آپ کا کوئی سپورٹ ٹکٹ موجود نہیں ہے
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket._id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-urdu-brown nastaleeq-primary">
                      {ticket.subject}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusOptions[ticket.status]?.color
                      }`}
                    >
                      {statusOptions[ticket.status]?.label}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getPriorityInfo(ticket.priority).color
                      }`}
                    >
                      {getPriorityInfo(ticket.priority).label}
                    </span>
                  </div>

                  <p
                    className="text-sm text-gray-600 mb-2 nastaleeq-primary"
                    dir="rtl"
                  >
                    {ticket.description?.substring(0, 100)}...
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Tag className="w-3 h-3" />
                      <span className="nastaleeq-primary">
                        {getCategoryLabel(ticket.category)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-urdu-brown">
                    #{ticket.ticketNumber}
                  </div>
                  {ticket.unreadCount > 0 && (
                    <span className="inline-block bg-urdu-maroon text-white text-xs px-2 py-1 rounded-full mt-1">
                      {ticket.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );

  const renderTicketDetail = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTicket(null)}
            >
              ← واپس
            </Button>
            <h3 className="text-lg font-semibold text-urdu-brown nastaleeq-primary">
              {selectedTicket.subject}
            </h3>
            <span className="text-sm text-gray-500">
              #{selectedTicket.ticketNumber}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                statusOptions[selectedTicket.status]?.color
              }`}
            >
              {statusOptions[selectedTicket.status]?.label}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                getPriorityInfo(selectedTicket.priority).color
              }`}
            >
              {getPriorityInfo(selectedTicket.priority).label}
            </span>
            <span className="text-xs text-gray-500 nastaleeq-primary">
              {getCategoryLabel(selectedTicket.category)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial Message */}
        <Card className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-urdu-maroon to-urdu-brown rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-urdu-brown">
                  {selectedTicket.user?.name || "آپ"}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedTicket.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 nastaleeq-primary" dir="rtl">
                {selectedTicket.description}
              </p>
            </div>
          </div>
        </Card>

        {/* Replies */}
        {selectedTicket.messages?.map((message) => (
          <Card key={message._id} className="p-4">
            <div className="flex items-start space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.isFromSupport
                    ? "bg-gradient-to-br from-green-500 to-green-600"
                    : "bg-gradient-to-br from-urdu-maroon to-urdu-brown"
                }`}
              >
                {message.isFromSupport ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-urdu-brown">
                    {message.isFromSupport ? "سپورٹ ٹیم" : "آپ"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(message.createdAt)}
                  </span>
                </div>
                <p className="text-gray-700 nastaleeq-primary" dir="rtl">
                  {message.content}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reply Input */}
      {selectedTicket.status !== "closed" && (
        <div className="bg-white border-t border-gray-200 p-4">
          <TicketReplyForm
            ticketId={selectedTicket._id}
            onReply={handleTicketReply}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full bg-gradient-to-br from-white to-urdu-cream/10">
      {selectedTicket ? renderTicketDetail() : renderTicketList()}
    </div>
  );
};

// Reply form component
const TicketReplyForm = ({ ticketId, onReply }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    setSending(true);
    await onReply(ticketId, message);
    setMessage("");
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-urdu-brown mb-2 nastaleeq-primary">
          جواب لکھیں
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اپنا پیغام یہاں لکھیں..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
          dir="rtl"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!message.trim() || sending}
          className="bg-urdu-maroon hover:bg-urdu-brown text-white"
        >
          {sending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Send className="w-4 h-4 ml-2" />
              بھیجیں
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default SupportTicket;
