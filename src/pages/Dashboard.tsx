import React from 'react';
import { Users, Mail, TrendingUp, Calendar, ChefHat, Clock } from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { customers } = useCustomers();

  const stats = [
    {
      name: 'Total Customers',
      value: customers.length,
      icon: Users,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Active Classes',
      value: customers.filter(c => c.customerStage === 'Enrolled').length,
      icon: ChefHat,
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Email Campaigns',
      value: 24,
      icon: Mail,
      change: '+15%',
      changeType: 'positive'
    },
    {
      name: 'This Month Revenue',
      value: '$12,450',
      icon: TrendingUp,
      change: '+23%',
      changeType: 'positive'
    }
  ];

  const classTypeData = [
    { name: 'Team Building', value: customers.filter(c => c.cookingClassType === 'Team Building').length },
    { name: 'Date Night', value: customers.filter(c => c.cookingClassType === 'Date Night').length },
    { name: 'Teen Cooking', value: customers.filter(c => c.cookingClassType === 'Teen Cooking').length },
    { name: 'Private', value: customers.filter(c => c.cookingClassType === 'Private').length },
    { name: 'Group', value: customers.filter(c => c.cookingClassType === 'Group').length }
  ];

  const monthlyData = [
    { month: 'Jan', classes: 45, revenue: 8500 },
    { month: 'Feb', classes: 52, revenue: 9200 },
    { month: 'Mar', classes: 48, revenue: 8800 },
    { month: 'Apr', classes: 61, revenue: 11200 },
    { month: 'May', classes: 55, revenue: 10100 },
    { month: 'Jun', classes: 67, revenue: 12450 }
  ];

  const COLORS = ['#ea580c', '#fb923c', '#fed7aa', '#fdba74', '#f97316'];

  const recentActivities = [
    { id: 1, type: 'class', message: 'New enrollment: Sarah Johnson - Date Night Cooking', time: '2 hours ago' },
    { id: 2, type: 'email', message: 'Email campaign "Summer Specials" sent to 156 customers', time: '4 hours ago' },
    { id: 3, type: 'class', message: 'Team Building class completed - TechCorp Inc.', time: '1 day ago' },
    { id: 4, type: 'customer', message: 'New customer added: Mike Chen', time: '2 days ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your cooking classes.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="classes" fill="#ea580c" name="Classes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Types Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Class Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={classTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {classTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="px-6 py-4 flex items-center space-x-3">
              <div className="flex-shrink-0">
                {activity.type === 'class' && <ChefHat className="h-5 w-5 text-orange-600" />}
                {activity.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                {activity.type === 'customer' && <Users className="h-5 w-5 text-green-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
              </div>
              <div className="flex-shrink-0 flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;