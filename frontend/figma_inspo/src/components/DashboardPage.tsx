import { Search, Plus, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { dashboardData, DashboardData } from '../data/dashboardData';

interface DashboardPageProps {
  data?: DashboardData;
}

export function DashboardPage({ data = dashboardData }: DashboardPageProps) {
  return (
    <div className="h-full bg-purple-50/30 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1>Dashboard</h1>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Schnellsuche"
                  className="pl-10 w-64"
                />
              </div>

              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Beleg hochladen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Overview */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Übersicht</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="12.05.2024">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12.05.2024">12.05.2024</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select defaultValue="12.05.2025">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12.05.2025">12.05.2025</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select defaultValue="alle">
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle Bommel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-3 gap-8 mb-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ausgaben</p>
                    <p className="text-2xl text-gray-900">
                      {data.ausgaben.toLocaleString('de-DE')}€
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Einnahmen</p>
                    <p className="text-2xl text-gray-900">
                      {data.einnahmen.toLocaleString('de-DE')}€
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Unterschied</p>
                    <p className={`text-2xl ${data.unterschied >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.unterschied >= 0 ? '+' : ''}{data.unterschied.toLocaleString('de-DE')}€
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Area
                        type="monotone"
                        dataKey="ausgaben"
                        stroke="#ef4444"
                        fill="#fecaca"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="einnahmen"
                        stroke="#10b981"
                        fill="#a7f3d0"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Tasks & Notes */}
          <div className="space-y-6 flex flex-col min-h-0">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Offene Aufgaben</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.offeneAufgaben.map((task, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700">{task.label}</span>
                    <span className="text-gray-900">{task.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Notizen</CardTitle>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.notizen.map((note, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700">{note.label}</span>
                    <span className="text-gray-600">{note.date}</span>
                  </div>
                ))}
                <div className="text-gray-400 text-sm">Füge etwas hinzu...</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
