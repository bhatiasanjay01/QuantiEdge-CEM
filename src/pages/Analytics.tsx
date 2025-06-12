import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Users, ChefHat, Mail, DollarSign } from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';

const Analytics: React.FC = () => {
  const { customers } = useCustomers();
  const [timeRange, setTimeRange] = useState('6months');

  // Mock data for analytics
  const monthlyClassData = [
    { month: 'Jul', teamBuilding: 12, dateNight: 8, teenCooking: 5, private: 3, group: 7 },
    { month: 'Aug', teamBuilding: 15, dateNight: 10, teenCooking: 7, private: 5, group: 9 },
    { month: 'Sep', teamBuilding: 18, dateNight: 12, teenCooking: 6, private: 4, group: 11 },
    { month: 'Oct', teamBuilding: 22, dateNight: 15, teenCooking: 8, private: 6, group: 13 },
    { month: 'Nov', teamBuilding: 20, dateNight: 18, teenCooking: 9, private: 7, group: 15 },
    { month: 'Dec', teamBuilding: 25, dateNight: 20, teenCooking: 12, private: 8, group: 18 }
  ];

  const revenueData = [
    { month: 'Jul', revenue: 8500, classes: 35 },
    { month: 'Aug', revenue: 9200, classes: 46 },
    { month: 'Sep', revenue: 10100, classes: 51 },
    { month: 'Oct', revenue: 11800, classes: 64 },
    { month: 'Nov', revenue: 12200, classes: 69 },
    { month: 'Dec', revenue: 14500, classes: 83 }
  ];

  const customerStageData = [
    { name: 'Prospects', value: customers.filter(c => c.customerStage === 'Prospect').length, color: '#fbbf24' },
    { name: 'Enrolled', value: customers.filter(c => c.customerStage === 'Enrolled').length, color: '#3b82f6' },
    { name: 'Completed', value: customers.filter(c => c.customerStage === 'Completed').length, color: '#10b981' },
    { name: 'Repeat', value: customers.filter(c => c.customerStage === 'Repeat').length, color: '#8b5cf6' }
  ];

  const emailMetrics = [
    { metric: 'Total Campaigns', value: '24', change: '+15%', icon: Mail },
    { metric: 'Avg Open Rate', value: '32.5%', change: '+5.2%', icon: TrendingUp },
    { metric: 'Click Rate', value: '8.7%', change: '+2.1%', icon: Users },
    { metric: 'Conversion Rate', value: '12.3%', change: '+3.4%', icon: DollarSign }
  ];

  const topPerformingClasses = [
    { name: 'Italian Date Night', bookings: 45, revenue: 6750, avgRating: 4.8 },
    { name: 'Corporate Team Building', bookings: 38, revenue: 9500, avgRating: 4.6 },
    { name: 'Teen Baking Basics', bookings: 32, revenue: 3200, avgRating: 4.9 },
    { name: 'Private Chef Experience', bookings: 28, revenue: 8400, avgRating: 4.7 },
    { name: 'Family Cooking Fun', bookings: 25, revenue: 3750, avgRating: 4.5 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Insights and performance metrics for your cooking class business
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Classes</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {monthlyClassData.reduce((sum, month) => 
                        sum + month.teamBuilding + month.dateNight + month.teenCooking + month.private + month.group, 0
                      )}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      +18%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{customers.length}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      +12%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ${revenueData.reduce((sum, month) => sum + month.revenue, 0).toLocaleString()}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      +23%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Class Size</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">8.5</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      +5%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Classes by Type */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Classes by Type (Monthly)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyClassData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="teamBuilding" stackId="a" fill="#ea580c" name="Team Building" />
              <Bar dataKey="dateNight" stackId="a" fill="#fb923c" name="Date Night" />
              <Bar dataKey="teenCooking" stackId="a" fill="#fed7aa" name="Teen Cooking" />
              <Bar dataKey="private" stackId="a" fill="#fdba74" name="Private" />
              <Bar dataKey="group" stackId="a" fill="#f97316" name="Group" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Stages */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Stages</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={customerStageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {customerStageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Email Marketing Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Marketing Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            {emailMetrics.map((metric) => (
              <div key={metric.metric} className="text-center p-4 bg-gray-50 rounded-lg">
                <metric.icon className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-sm text-gray-500">{metric.metric}</div>
                <div className="text-sm font-medium text-green-600">{metric.change}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Classes */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Performing Classes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Rating
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topPerformingClasses.map((classItem, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{classItem.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classItem.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${classItem.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{classItem.avgRating}</div>
                      <div className="ml-1 text-yellow-400">★</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;