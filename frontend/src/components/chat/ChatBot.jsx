import React, { useState, useEffect } from "react";
import {
  Bot,
  Send,
  RotateCcw,
  MessageCircle,
  Book,
  HelpCircle,
  Search,
  Star,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import api from "../../services/api";

const ChatBot = ({ onCreateChat }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Chatbot welcome message and quick actions
  const welcomeMessage = {
    id: "welcome",
    text: 'السلام علیکم! میں "بزم سخن" کا AI اسسٹنٹ ہوں۔ میں آپ کی مدد کر سکتا ہوں۔',
    isBot: true,
    timestamp: new Date(),
    quickReplies: [
      { id: "poetry_help", text: "شاعری کی مدد", icon: Book },
      { id: "platform_guide", text: "پلیٹ فارم گائیڈ", icon: HelpCircle },
      { id: "search_help", text: "تلاش کی مدد", icon: Search },
      { id: "contact_support", text: "سپورٹ ٹیم", icon: MessageCircle },
    ],
  };

  // FAQ Categories
  const faqCategories = {
    poetry_help: {
      title: "شاعری سے متعلق مدد",
      icon: Book,
      faqs: [
        {
          question: "نئی غزل کیسے لکھی جائے؟",
          answer:
            "غزل لکھنے کے لیے پہلے بحر کا انتخاب کریں، پھر مطلع لکھیں۔ ہر شعر میں قافیہ اور ردیف کا خیال رکھیں۔",
        },
        {
          question: "شاعری کا انداز کیسے بہتر بنایا جائے؟",
          answer:
            "مشہور شعراء کا کلام پڑھیں، بحور سیکھیں، اور روزانہ لکھنے کی مشق کریں۔",
        },
        {
          question: "اپنی شاعری کیسے publish کریں؟",
          answer:
            'اپنے پروفائل پر جائیں، "نئی نظم بنائیں" پر کلک کریں، اور اپنا کلام شیئر کریں۔',
        },
      ],
    },
    platform_guide: {
      title: "پلیٹ فارم استعمال کی رہنمائی",
      icon: HelpCircle,
      faqs: [
        {
          question: "اکاؤنٹ کیسے بنایا جائے؟",
          answer:
            'صفحہ اول پر "رجسٹر" بٹن پر کلک کریں اور اپنی معلومات داخل کریں۔',
        },
        {
          question: "دوسرے شاعروں سے کیسے رابطہ کریں؟",
          answer:
            'شاعر کے پروفائل پر جائیں اور "میسج بھیجیں" بٹن استعمال کریں۔',
        },
        {
          question: "مقابلے میں حصہ کیسے لیں؟",
          answer:
            '"مقابلے" سیکشن میں جائیں، اپنا پسندیدہ مقابلہ منتخب کریں اور شرائط پڑھ کر حصہ لیں۔',
        },
      ],
    },
    search_help: {
      title: "تلاش کی مدد",
      icon: Search,
      faqs: [
        {
          question: "شاعری کیسے تلاش کریں؟",
          answer:
            "سرچ بار میں شاعر کا نام، نظم کا عنوان، یا کوئی مصرعہ لکھ کر تلاش کریں۔",
        },
        {
          question: "Voice Search کیسے استعمال کریں؟",
          answer:
            "سرچ بار میں مائیکروفون آئیکن پر کلک کریں اور اپنا سوال بولیں۔",
        },
        {
          question: "Image Search کا کیا فائدہ؟",
          answer: "آپ شاعری کی تصویر اپ لوڈ کر کے متن تلاش کر سکتے ہیں۔",
        },
      ],
    },
  };

  // Initialize with welcome message
  useEffect(() => {
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (input) => {
    const lowerInput = input.toLowerCase();
    let response = "";
    let quickReplies = [];

    // Simple rule-based responses
    if (lowerInput.includes("غزل") || lowerInput.includes("شاعری")) {
      response =
        "غزل لکھنے کے لیے پہلے بحر اور موضوع کا انتخاب کریں۔ کیا آپ کو کسی خاص بحر کے بارے میں جاننا ہے؟";
      quickReplies = [
        { id: "meter_help", text: "بحر کی مدد" },
        { id: "topic_help", text: "موضوع کی تجاویز" },
      ];
    } else if (lowerInput.includes("تلاش") || lowerInput.includes("search")) {
      response =
        "آپ شاعری تلاش کرنے کے لیے تین طریقے استعمال کر سکتے ہیں: ٹیکسٹ سرچ، وائس سرچ، اور امیج سرچ۔";
      quickReplies = [
        { id: "text_search", text: "ٹیکسٹ سرچ" },
        { id: "voice_search", text: "وائس سرچ" },
      ];
    } else if (
      lowerInput.includes("مقابلہ") ||
      lowerInput.includes("contest")
    ) {
      response =
        'موجودہ مقابلوں میں حصہ لینے کے لیے "مقابلے" سیکشن میں جائیں۔ کیا آپ کو کسی خاص قسم کے مقابلے میں دلچسپی ہے؟';
      quickReplies = [
        { id: "current_contests", text: "موجودہ مقابلے" },
        { id: "contest_rules", text: "مقابلے کے اصول" },
      ];
    } else if (lowerInput.includes("سپورٹ") || lowerInput.includes("مدد")) {
      response =
        "میں یہاں آپ کی مدد کے لیے موجود ہوں۔ اگر آپ کو مزید تفصیلی مدد چاہیے تو سپورٹ ٹکٹ بنایا جا سکتا ہے۔";
      quickReplies = [
        { id: "create_ticket", text: "سپورٹ ٹکٹ بنائیں" },
        { id: "faq_help", text: "عام سوالات" },
      ];
    } else {
      response =
        "معذرت، میں آپ کے سوال کو بالکل نہیں سمجھ سکا۔ برائے کرم زیادہ واضح سوال پوچھیں یا نیچے دیے گئے آپشن استعمال کریں۔";
      quickReplies = welcomeMessage.quickReplies;
    }

    return {
      id: Date.now(),
      text: response,
      isBot: true,
      timestamp: new Date(),
      quickReplies,
    };
  };

  const handleQuickReply = (replyId) => {
    let responseText = "";

    switch (replyId) {
      case "poetry_help":
        setSelectedCategory(faqCategories.poetry_help);
        return;
      case "platform_guide":
        setSelectedCategory(faqCategories.platform_guide);
        return;
      case "search_help":
        setSelectedCategory(faqCategories.search_help);
        return;
      case "contact_support":
        if (onCreateChat) {
          onCreateChat("support");
        }
        responseText = "آپ کو سپورٹ ٹیم کے ساتھ چیٹ میں منتقل کر رہا ہوں...";
        break;
      case "create_ticket":
        responseText =
          'سپورٹ ٹکٹ بنانے کے لیے "Contact Support" ٹیب استعمال کریں۔';
        break;
      default:
        responseText = "شکریہ! کیا میں آپ کی مزید مدد کر سکتا ہوں؟";
    }

    const botResponse = {
      id: Date.now(),
      text: responseText,
      isBot: true,
      timestamp: new Date(),
      quickReplies: welcomeMessage.quickReplies,
    };

    setMessages((prev) => [...prev, botResponse]);
  };

  const handleFaqClick = (faq) => {
    const userMessage = {
      id: Date.now(),
      text: faq.question,
      isBot: false,
      timestamp: new Date(),
    };

    const botResponse = {
      id: Date.now() + 1,
      text: faq.answer,
      isBot: true,
      timestamp: new Date(),
      quickReplies: [
        { id: "more_help", text: "مزید مدد" },
        { id: "back_to_menu", text: "واپس مینو" },
      ],
    };

    setMessages((prev) => [...prev, userMessage, botResponse]);
    setSelectedCategory(null);
  };

  const resetChat = () => {
    setMessages([welcomeMessage]);
    setSelectedCategory(null);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString("ur-PK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white to-urdu-cream/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold nastaleeq-primary">AI اسسٹنٹ</h3>
            <p className="text-sm text-white/80 nastaleeq-primary">
              فوری مدد کے لیے
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetChat}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <RotateCcw className="w-4 h-4 ml-2" />
          نئی شروعات
        </Button>
      </div>

      {/* FAQ Categories Modal */}
      {selectedCategory && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <selectedCategory.icon className="w-5 h-5 text-urdu-maroon" />
              <h4 className="font-semibold text-urdu-brown nastaleeq-primary">
                {selectedCategory.title}
              </h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              واپس
            </Button>
          </div>

          <div className="grid gap-2">
            {selectedCategory.faqs.map((faq, index) => (
              <Card
                key={index}
                className="p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-urdu-gold"
                onClick={() => handleFaqClick(faq)}
              >
                <div className="flex items-center justify-between">
                  <p
                    className="text-sm font-medium text-urdu-brown nastaleeq-primary"
                    dir="rtl"
                  >
                    {faq.question}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isBot ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md ${
                message.isBot ? "" : "order-2"
              }`}
            >
              {/* Message Bubble */}
              <div
                className={`px-4 py-2 rounded-2xl shadow-sm ${
                  message.isBot
                    ? "bg-white border border-gray-200 text-gray-800"
                    : "bg-gradient-to-r from-urdu-maroon to-urdu-brown text-white"
                }`}
              >
                <p
                  className="nastaleeq-primary text-sm leading-relaxed"
                  dir="rtl"
                >
                  {message.text}
                </p>

                <div
                  className={`text-xs mt-1 ${
                    message.isBot ? "text-gray-500" : "text-white/70"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {/* Quick Replies */}
              {message.quickReplies && (
                <div className="mt-3 space-y-2">
                  {message.quickReplies.map((reply) => (
                    <Button
                      key={reply.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickReply(reply.id)}
                      className="w-full text-right justify-end border-urdu-gold text-urdu-brown hover:bg-urdu-cream/20"
                    >
                      <span className="nastaleeq-primary">{reply.text}</span>
                      {reply.icon && <reply.icon className="w-4 h-4 mr-2" />}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Bot Avatar */}
            {message.isBot && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-urdu-maroon to-urdu-brown flex items-center justify-center ml-2">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-urdu-maroon to-urdu-brown flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center space-x-3"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="اپنا سوال پوچھیں..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-urdu-gold focus:border-transparent nastaleeq-primary"
              dir="rtl"
              disabled={isTyping}
            />
          </div>

          <Button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="bg-urdu-maroon hover:bg-urdu-brown text-white"
          >
            {isTyping ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 nastaleeq-primary">
            یہ AI اسسٹنٹ آپ کی بنیادی مدد کے لیے ہے۔ مزید پیچیدہ مسائل کے لیے
            سپورٹ ٹیم سے رابطہ کریں۔
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
