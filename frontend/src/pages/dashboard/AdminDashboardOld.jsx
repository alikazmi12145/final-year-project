import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Award,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Plus,
  Download,
  Brain,
  TrendingUp,
  UserCheck,
  BookOpen,
  Calendar,
  Clock,
  Trash2,
  Shield,
  Activity,
  UserPlus,
  Edit,
  Ban,
  Archive,
  Star,
  Flag,
  MessageSquare
} from 'lucide-react';
import {
  adminDashboardAPI,
  formatDate,
  formatNumber,
  getStatusColor,
  getRoleColor,
} from '../../services/dashboardAPI';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [poems, setPoems] = useState([]);
  const [contests, setContests] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination and filtering states
  const [userFilters, setUserFilters] = useState({
    page: 1,
    limit: 20,
    role: 'all',
    status: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [poemFilters, setPoemFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all',
    category: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load users when filters change
  useEffect(() => {
    if (activeTab === 'profile-management') {
      loadUsers();
    }
  }, [activeTab, userFilters]);

  // Load poems when filters change
  useEffect(() => {
    if (activeTab === 'poet-biographies') {
      loadPoems();
    }
  }, [activeTab, poemFilters]);

  // Load analytics when tab changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // For now, we'll use mock data since the backend APIs might not be fully connected
      // Later, uncomment this when APIs are ready:
      // const data = await adminDashboardAPI.getDashboard();
      // setDashboardData(data.data);
      
      // Mock data for demonstration
      setDashboardData({
        overview: {
          totalUsers: 1247,
          totalPoets: 156,
          totalPoems: 2341,
          pendingPoets: 12,
          pendingPoems: 23,
          newUsersThisMonth: 89,
          newPoemsThisMonth: 156
        },
        mostActivePoets: [
          { _id: '1', name: 'احمد فراز', email: 'ahmad@example.com', poemCount: 45 },
          { _id: '2', name: 'فیض احمد فیض', email: 'faiz@example.com', poemCount: 38 },
          { _id: '3', name: 'علامہ اقبال', email: 'iqbal@example.com', poemCount: 32 }
        ],
        mostLikedPoems: [
          { _id: '1', title: 'رنگ لے آئی غالب', poet: { name: 'غالب' }, stats: { favorites: 234, views: 1567 } },
          { _id: '2', title: 'تیرا وجود', poet: { name: 'احمد فراز' }, stats: { favorites: 189, views: 1234 } }
        ]
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Mock users data for demonstration
      setUsers([
        { _id: '1', name: 'احمد علی', email: 'ahmad@example.com', role: 'poet', status: 'pending', createdAt: new Date() },
        { _id: '2', name: 'فاطمہ خان', email: 'fatima@example.com', role: 'reader', status: 'active', createdAt: new Date() },
        { _id: '3', name: 'محمد حسن', email: 'hassan@example.com', role: 'poet', status: 'active', createdAt: new Date() }
      ]);
    } catch (err) {
      setError('Failed to load users');
      console.error('Users error:', err);
    }
  };

  const loadPoems = async () => {
    try {
      // Mock poems data for demonstration
      setPoems([
        { _id: '1', title: 'محبت کا گیت', content: 'دل میں بسا ہے عشق کا جادو...', category: 'غزل', status: 'pending', poet: { name: 'احمد فراز' }, createdAt: new Date() },
        { _id: '2', title: 'وطن کی محبت', content: 'سرزمین پاک کی خوشبو...', category: 'نظم', status: 'published', poet: { name: 'علامہ اقبال' }, createdAt: new Date() }
      ]);
    } catch (err) {
      setError('Failed to load poems');
      console.error('Poems error:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      // Mock analytics data
      setAnalytics({
        userGrowth: [
          { _id: '2025-10-01', count: 45 },
          { _id: '2025-10-02', count: 67 },
          { _id: '2025-10-03', count: 52 }
        ],
        poemGrowth: [
          { _id: '2025-10-01', count: 23 },
          { _id: '2025-10-02', count: 34 },
          { _id: '2025-10-03', count: 28 }
        ]
      });
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Analytics error:', err);
    }
  };

  const handleUserApproval = async (userId, approved) => {
    try {
      // await adminDashboardAPI.approveUser(userId, approved);
      console.log(`${approved ? 'Approved' : 'Rejected'} user:`, userId);
      loadUsers(); // Refresh users list
      loadDashboardData(); // Refresh dashboard stats
    } catch (err) {
      setError(`Failed to ${approved ? 'approve' : 'reject'} user`);
    }
  };

  const handlePoemApproval = async (poemId, approved, reason = '') => {
    try {
      // await adminDashboardAPI.approvePoem(poemId, approved, reason);
      console.log(`${approved ? 'Approved' : 'Rejected'} poem:`, poemId);
      loadPoems(); // Refresh poems list
      loadDashboardData(); // Refresh dashboard stats
    } catch (err) {
      setError(`Failed to ${approved ? 'approve' : 'reject'} poem`);
    }
  };

  const handleUserDelete = async (userId) => {
    if (window.confirm('کیا آپ واقعی اس صارف کو حذف کرنا چاہتے ہیں؟')) {
      try {
        // await adminDashboardAPI.deleteUser(userId);
        console.log('Deleted user:', userId);
        loadUsers();
        loadDashboardData();
      } catch (err) {
        setError('Failed to delete user');
      }
    }
  };

  const generateAIReport = async () => {
    try {
      // const report = await adminDashboardAPI.generateAIReport('weekly');
      console.log('AI Report generated!');
      alert('AI رپورٹ کامیابی سے تیار ہوگئی!');
    } catch (err) {
      setError('Failed to generate AI report');
    }
  };

  const tabs = [
    { id: 'overview', label: 'خلاصہ', icon: BarChart3 },
    { id: 'profile-management', label: 'پروفائل منیجمنٹ', icon: Users },
    { id: 'poet-biographies', label: 'شعراء کی سوانح', icon: FileText },
    { id: 'achievements-showcase', label: 'کامیابیوں کی نمائش', icon: Award },
    { id: 'content-moderation', label: 'مواد کی نگرانی', icon: Shield },
    { id: 'contest-management', label: 'مقابلوں کا انتظام', icon: Activity },
    { id: 'analytics', label: 'تجزیات', icon: TrendingUp },
    { id: 'settings', label: 'ترتیبات', icon: Settings },
  ];

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800">ڈیش بورڈ لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">ایڈمن ڈیش بورڈ</h1>
              <p className="text-amber-700">بزم سخن کے تمام انتظامی امور کا مرکز</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={generateAIReport}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI رپورٹ
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                ڈیٹا ایکسپورٹ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
            {activeTab === 'profile-management' && (
              <UsersTab 
                users={users}
                filters={userFilters}
                setFilters={setUserFilters}
                onApprove={handleUserApproval}
                onDelete={handleUserDelete}
              />
            )}
            {activeTab === 'poet-biographies' && (
              <ContentTab 
                poems={poems}
                filters={poemFilters}
                setFilters={setPoemFilters}
                onApprove={handlePoemApproval}
              />
            )}
            {activeTab === 'achievements-showcase' && <AchievementsTab />}
            {activeTab === 'content-moderation' && <ContentModerationTab />}
            {activeTab === 'contest-management' && <ContestManagementTab />}
            {activeTab === 'analytics' && <AnalyticsTab data={analytics} />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data }) => {
  if (!data) {
    return <div className="text-center py-8">خلاصہ لوڈ ہو رہا ہے...</div>;
  }

  const { overview, mostActivePoets, mostLikedPoems } = data;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل صارفین"
          value={formatNumber(overview.totalUsers)}
          change={`+${overview.newUsersThisMonth} اس ماہ`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="کل شعراء"
          value={formatNumber(overview.totalPoets)}
          change={`${overview.pendingPoets} منتظر منظوری`}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="کل شاعری"
          value={formatNumber(overview.totalPoems)}
          change={`+${overview.newPoemsThisMonth} اس ماہ`}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="منتظر جائزہ"
          value={overview.pendingPoems}
          change={`${overview.pendingPoets} شاعر منظوری`}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active Poets */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">سب سے فعال شعراء</h3>
          <div className="space-y-3">
            {mostActivePoets.map((poet, index) => (
              <div key={poet._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{poet.name}</p>
                    <p className="text-sm text-gray-500">{poet.email}</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {poet.poemCount} شاعری
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Liked Poems */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">مقبول شاعری</h3>
          <div className="space-y-3">
            {mostLikedPoems.map((poem) => (
              <div key={poem._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium truncate">{poem.title}</p>
                  <p className="text-sm text-gray-500">از {poem.poet?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{formatNumber(poem.stats.favorites)} ❤️</p>
                  <p className="text-xs text-gray-500">{formatNumber(poem.stats.views)} مطالعہ</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = ({ users, filters, setFilters, onApprove, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">صارفین کا انتظام</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
          <UserPlus className="w-4 h-4 mr-2" />
          نیا صارف
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="صارفین تلاش کریں..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="all">تمام کردار</option>
          <option value="poet">شعراء</option>
          <option value="reader">قاری</option>
          <option value="admin">ایڈمن</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="all">تمام حالت</option>
          <option value="active">فعال</option>
          <option value="pending">منتظر</option>
          <option value="suspended">معطل</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                صارف
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                کردار
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                حالت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رجسٹریشن
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                عمل
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id}>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                    {user.role === 'poet' ? 'شاعر' : user.role === 'reader' ? 'قاری' : user.role === 'admin' ? 'ایڈمن' : user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                    {user.status === 'active' ? 'فعال' : user.status === 'pending' ? 'منتظر' : user.status === 'suspended' ? 'معطل' : user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 text-right">
                  {user.role === 'poet' && user.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApprove(user._id, true)}
                        className="text-green-600 hover:text-green-900 ml-2"
                        title="منظور کریں"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onApprove(user._id, false)}
                        className="text-red-600 hover:text-red-900 ml-2"
                        title="مسترد کریں"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button className="text-blue-600 hover:text-blue-900 ml-2" title="تفصیلات">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-900 ml-2" title="ترمیم">
                    <Edit className="w-4 h-4" />
                  </button>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => onDelete(user._id)}
                      className="text-red-600 hover:text-red-900 ml-2"
                      title="حذف کریں"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Content Tab Component
const ContentTab = ({ poems, filters, setFilters, onApprove }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">شاعری کا انتظام</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          نئی شاعری
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="شاعری تلاش کریں..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="all">تمام حالت</option>
          <option value="pending">منتظر</option>
          <option value="published">شائع شدہ</option>
          <option value="rejected">مسترد</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="all">تمام اقسام</option>
          <option value="غزل">غزل</option>
          <option value="نظم">نظم</option>
          <option value="قطعہ">قطعہ</option>
          <option value="رباعی">رباعی</option>
        </select>
      </div>

      {/* Poems Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                شاعری
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                شاعر
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                قسم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                حالت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                عمل
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {poems.map((poem) => (
              <tr key={poem._id}>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {poem.title}
                  </div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {poem.content.substring(0, 50)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {poem.poet?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {poem.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(poem.status)}`}>
                    {poem.status === 'pending' ? 'منتظر' : poem.status === 'published' ? 'شائع شدہ' : poem.status === 'rejected' ? 'مسترد' : poem.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 text-right">
                  {poem.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApprove(poem._id, true)}
                        className="text-green-600 hover:text-green-900 ml-2"
                        title="منظور کریں"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onApprove(poem._id, false)}
                        className="text-red-600 hover:text-red-900 ml-2"
                        title="مسترد کریں"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button className="text-blue-600 hover:text-blue-900 ml-2" title="مطالعہ">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-amber-600 hover:text-amber-900 ml-2" title="نمایاں کریں">
                    <Star className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Achievements Tab Component
const AchievementsTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">کامیابیوں کا انتظام</h2>
        <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          نئی کامیابی
        </button>
      </div>
      
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">کامیابیوں کا نظام</h3>
        <p className="text-gray-500 mb-6">شعراء کی کامیابیاں، بیجز اور تسلیم کا نظام</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="bg-white p-4 rounded-lg shadow border">
            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h4 className="font-medium">ستارہ شاعر</h4>
            <p className="text-sm text-gray-600">100+ شاعری شائع</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 className="font-medium">محبوب شاعر</h4>
            <p className="text-sm text-gray-600">1000+ پسندیدگی</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <Trophy className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h4 className="font-medium">چیمپین</h4>
            <p className="text-sm text-gray-600">مقابلہ جیتا</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Content Moderation Tab Component
const ContentModerationTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">مواد کی نگرانی</h2>
        <div className="flex space-x-2">
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center">
            <Flag className="w-4 h-4 mr-2" />
            رپورٹ شدہ مواد
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">منتظر جائزہ</h3>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">23</span>
          </div>
          <p className="text-gray-600 text-sm">نئی شاعری منظوری کے لیے منتظر</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">رپورٹ شدہ</h3>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">7</span>
          </div>
          <p className="text-gray-600 text-sm">صارفین نے رپورٹ کیا ہے</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">خودکار فلٹر</h3>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">12</span>
          </div>
          <p className="text-gray-600 text-sm">AI فلٹر سے روکا گیا</p>
        </div>
      </div>
    </div>
  );
};

// Contest Management Tab Component
const ContestManagementTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">مقابلوں کا انتظام</h2>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          نیا مقابلہ
        </button>
      </div>
      
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">شاعری کے مقابلے</h3>
        <p className="text-gray-500 mb-6">مقابلوں کا انتظام اور نتائج کا اعلان</p>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">پلیٹ فارم کے تجزیات</h2>
        <div className="flex space-x-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg">
            <option>پچھلا ہفتہ</option>
            <option>پچھلا مہینہ</option>
            <option>پچھلا سال</option>
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            رپورٹ ڈاؤن لوڈ
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-4">صارفین کی بڑھوتری</h4>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2" />
            چارٹ یہاں دکھایا جائے گا
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-4">شاعری کی بڑھوتری</h4>
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-2" />
            چارٹ یہاں دکھایا جائے گا
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">سسٹم کی ترتیبات</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">عمومی ترتیبات</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>نئے صارفین کی خودکار منظوری</span>
            <button className="bg-gray-300 rounded-full w-12 h-6 relative">
              <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>شاعری کی خودکار منظوری</span>
            <button className="bg-blue-500 rounded-full w-12 h-6 relative">
              <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 right-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>AI مواد کی فلٹرنگ</span>
            <button className="bg-blue-500 rounded-full w-12 h-6 relative">
              <div className="bg-white w-5 h-5 rounded-full absolute top-0.5 right-0.5"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div className={`${colors[color]} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="mr-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change && <p className="text-sm text-gray-500">{change}</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;