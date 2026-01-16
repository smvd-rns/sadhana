'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Plus, Trash2, Edit2 } from 'lucide-react';
import { getCentersFromLocal, getCentersByLocationFromLocal, addCenterToLocal, deleteCenterFromLocal, CenterData } from '@/lib/data/local-centers';
import { indianStates, stateCities } from '@/lib/data/india-states';

export default function CentersPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCenter, setNewCenter] = useState({
    name: '',
    state: '',
    city: '',
    address: '',
    contact: '',
  });
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Only Super Admin (Role 8) can access this page
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadCenters();
  }, [isSuperAdmin, router]);

  useEffect(() => {
    if (newCenter.state) {
      const cities = stateCities[newCenter.state] || [];
      setAvailableCities(cities);
      if (!cities.includes(newCenter.city)) {
        setNewCenter(prev => ({ ...prev, city: '' }));
      }
    } else {
      setAvailableCities([]);
    }
  }, [newCenter.state]);

  const loadCenters = async () => {
    setLoading(true);
    try {
      // Load from local JSON file (no Firestore reads!)
      const allCenters = await getCentersByLocationFromLocal();
      setCenters(allCenters);
    } catch (error) {
      console.error('Error loading centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.name.endsWith('.xlsx') ||
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const parseExcel = async (file: File): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(new Error('Failed to parse Excel file. Please ensure it is a valid Excel file.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(new Error('Failed to load Excel parser. Please refresh the page and try again.'));
      }
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: 0, errors: 0 });

    try {
      const data = await parseExcel(file);
      setProgress({ processed: 0, total: data.length, errors: 0 });

      let processed = 0;
      let errors = 0;

      for (const row of data) {
        try {
          const name = row.name || row.Name || '';
          const state = row.state || row.State || '';
          const city = row.city || row.City || '';
          const address = row.address || row.Address || '';
          const contact = row.contact || row.Contact || '';

          if (!name || !state || !city) {
            errors++;
            continue;
          }

          await addCenterToLocal({
            name,
            state,
            city,
            address: address || undefined,
            contact: contact || undefined,
          });

          processed++;
          setProgress({ processed, total: data.length, errors });
        } catch (err: any) {
          console.error('Error importing center:', err);
          errors++;
          setProgress({ processed, total: data.length, errors });
        }
      }

      setSuccess(`Successfully imported ${processed} centers. ${errors} errors.`);
      setFile(null);
      loadCenters();
      
      const fileInput = document.getElementById('excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const handleAddCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenter.name || !newCenter.state || !newCenter.city) {
      setError('Name, State, and City are required');
      return;
    }

    try {
      // Add to local JSON file (no Firestore writes!)
      const success = await addCenterToLocal({
        name: newCenter.name,
        state: newCenter.state,
        city: newCenter.city,
        address: newCenter.address || undefined,
        contact: newCenter.contact || undefined,
      });
      
      if (success) {
        setSuccess('Center added successfully to local file');
        setNewCenter({ name: '', state: '', city: '', address: '', contact: '' });
        setShowAddForm(false);
        loadCenters();
      } else {
        setError('Failed to add center');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add center');
    }
  };

  const handleDeleteCenter = async (centerId: string) => {
    if (!confirm('Are you sure you want to delete this center?')) return;

    try {
      // Find the center to get state and city
      const center = centers.find(c => c.id === centerId);
      if (!center) {
        setError('Center not found');
        return;
      }
      
      // Delete from local JSON file (no Firestore writes!)
      const success = await deleteCenterFromLocal(centerId);
      if (success) {
        setSuccess('Center deleted successfully from local file');
        loadCenters();
      } else {
        setError('Failed to delete center');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete center');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centers Management</h1>
          <p className="text-gray-600 mt-2">Manage ISKCON centers across India</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Center
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Add Center Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Center</h2>
          <form onSubmit={handleAddCenter} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Center Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCenter.name}
                  onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCenter.state}
                  onChange={(e) => setNewCenter({ ...newCenter, state: e.target.value, city: '' })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Select State</option>
                  {indianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCenter.city}
                  onChange={(e) => setNewCenter({ ...newCenter, city: e.target.value })}
                  required
                  disabled={!newCenter.state || availableCities.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100"
                >
                  <option value="">Select City</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="text"
                  value={newCenter.contact}
                  onChange={(e) => setNewCenter({ ...newCenter, contact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={newCenter.address}
                onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Center
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCenter({ name: '', state: '', city: '', address: '', contact: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Section - Only for Super Admin (Role 8) */}
      {isSuperAdmin && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Import Centers from Excel</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="excel-file" className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File (.xlsx or .xls)
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex-1 cursor-pointer">
                <input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400 mr-3" />
                  <span className="text-gray-600">
                    {file ? file.name : 'Click to select Excel file'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">Excel file should have the following columns:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>name</strong> (required) - Center name</li>
              <li><strong>state</strong> (required) - State name</li>
              <li><strong>city</strong> (required) - City name</li>
              <li><strong>address</strong> (optional) - Center address</li>
              <li><strong>contact</strong> (optional) - Contact information</li>
            </ul>
          </div>

          {importing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing: {progress.processed} / {progress.total}</span>
                <span>Errors: {progress.errors}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Import Centers
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Centers List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">All Centers ({centers.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {centers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No centers found. Add centers manually or import from Excel.
                  </td>
                </tr>
              ) : (
                centers.map((center) => (
                  <tr key={center.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {center.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {center.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {center.city}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {center.address || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {center.contact || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteCenter(center.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
