import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
} from "lucide-react";
import subscriptionAPI from "../services/subscriptionAPI";
import "../components/membership/membership.css";

const COLORS = ["#d4af37", "#b8860b", "#f6d27a", "#722f37", "#9caf88"];

export default function AdminRevenueDashboard() {
  const [data, setData] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, s] = await Promise.all([
          subscriptionAPI.adminRevenue(),
          subscriptionAPI.adminListSubscriptions({ limit: 10 }),
        ]);
        setData(r?.data || null);
        setSubs(s?.data?.subscriptions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="bes-bg-night min-h-screen text-amber-50 flex items-center justify-center">
        Loading…
      </div>
    );
  if (!data)
    return (
      <div className="bes-bg-night min-h-screen text-amber-50 flex items-center justify-center">
        Failed to load
      </div>
    );

  const totals = data.totals;
  const trend = (data.trend30Days || []).map((d) => ({
    date: d._id,
    revenue: d.total,
  }));
  const byPlan = (data.breakdown?.byPlan || []).map((b) => ({
    name: b._id,
    value: b.count,
  }));
  const byProvider = (data.breakdown?.byProvider || []).map((b) => ({
    name: b._id,
    revenue: b.total,
  }));

  return (
    <div className="bes-bg-night bes-geo-pattern min-h-screen text-amber-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 bes-fade-up">
          <h1 dir="rtl" className="font-nastaliq text-4xl bes-gold-text">
            آمدنی ڈیش بورڈ
          </h1>
          <p className="text-amber-100/70">
            Revenue & subscription analytics
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPI
            icon={<DollarSign />}
            label="All-time Revenue"
            value={`$${(totals.allTime.total || 0).toFixed(2)}`}
            sub={`${totals.allTime.count} payments`}
          />
          <KPI
            icon={<TrendingUp />}
            label="This Month"
            value={`$${(totals.thisMonth.total || 0).toFixed(2)}`}
            sub={`${totals.thisMonth.count} payments`}
          />
          <KPI
            icon={<Calendar />}
            label="This Year"
            value={`$${(totals.thisYear.total || 0).toFixed(2)}`}
            sub={`${totals.thisYear.count} payments`}
          />
          <KPI
            icon={<Users />}
            label="Active Subscribers"
            value={totals.activeSubscribers || 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bes-glass rounded-2xl p-5 lg:col-span-2 bes-fade-up">
            <h3 className="text-amber-50 font-semibold mb-3">Revenue (last 30 days)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f6d27a" />
                    <stop offset="100%" stopColor="#b8860b" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff14" />
                <XAxis dataKey="date" stroke="#d4af3766" fontSize={11} />
                <YAxis stroke="#d4af3766" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#1a120a",
                    border: "1px solid #d4af3744",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#gold)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#d4af37" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bes-glass rounded-2xl p-5 bes-fade-up" style={{ animationDelay: "120ms" }}>
            <h3 className="text-amber-50 font-semibold mb-3">Active by Plan</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byPlan}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {byPlan.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ color: "#f5f5dc", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a120a",
                    border: "1px solid #d4af3744",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bes-glass rounded-2xl p-5 bes-fade-up">
            <h3 className="text-amber-50 font-semibold mb-3">Revenue by Provider</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byProvider}>
                <CartesianGrid stroke="#ffffff14" />
                <XAxis dataKey="name" stroke="#d4af3766" fontSize={11} />
                <YAxis stroke="#d4af3766" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#1a120a",
                    border: "1px solid #d4af3744",
                  }}
                />
                <Bar dataKey="revenue" fill="#d4af37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bes-glass rounded-2xl p-5 bes-fade-up" style={{ animationDelay: "120ms" }}>
            <h3 className="text-amber-50 font-semibold mb-3">Recent Subscriptions</h3>
            <div className="overflow-x-auto">
              <table className="bes-table">
                <thead>
                  <tr>
                    <th className="text-left">User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s._id}>
                      <td className="text-left">
                        <div className="text-amber-50">{s.user?.name || "—"}</div>
                        <div className="text-xs text-amber-100/60">
                          {s.user?.email}
                        </div>
                      </td>
                      <td>{s.plan}</td>
                      <td className="capitalize">{s.status}</td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, sub }) {
  return (
    <div className="bes-glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-amber-300/80 text-xs uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold bes-gold-text mt-2">{value}</div>
      {sub && <div className="text-amber-100/60 text-xs mt-1">{sub}</div>}
    </div>
  );
}
