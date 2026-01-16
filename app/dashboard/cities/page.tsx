'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, AlertCircle, CheckCircle, Upload, FileSpreadsheet, Download, MapPin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getCitiesFromLocal, getCitiesByStateFromLocal, addCityToLocal, deleteCityFromLocal } from '@/lib/data/local-cities';
import { indianStates } from '@/lib/data/india-states';
import { importAllIndianCities, importMappedCitiesOnly, getIndianCitiesCount, getCitiesPreview } from '@/lib/data/import-indian-cities';
import { importAllCitiesFromTxt, getAllCitiesTxtCount } from '@/lib/data/import-all-cities-txt';

export default function CitiesPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [cities, setCities] = useState<Array<{ id: string; name: string; state: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [newCity, setNewCity] = useState({
    name: '',
    state: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });
  const [importingFromWorldCities, setImportingFromWorldCities] = useState(false);
  const [availableCitiesCount, setAvailableCitiesCount] = useState<number | null>(null);
  const [importMode, setImportMode] = useState<'all' | 'mapped-only'>('mapped-only');
  const [importStats, setImportStats] = useState<{ mapped: number; unmapped: number }>({ mapped: 0, unmapped: 0 });
  const [importingFromTxt, setImportingFromTxt] = useState(false);
  const [importingFromAllCityTxt, setImportingFromAllCityTxt] = useState(false);
  const [availableTxtCitiesCount, setAvailableTxtCitiesCount] = useState<number | null>(null);
  const [showWorldCitiesImport, setShowWorldCitiesImport] = useState(true);
  const [showTxtImport, setShowTxtImport] = useState(true);
  const [txtImportCompleted, setTxtImportCompleted] = useState(false);
  // Check localStorage for permanently removed import sections
  const [hideWorldCitiesImport, setHideWorldCitiesImport] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cities_import_world_cities_removed') === 'true';
    }
    return false;
  });
  const [hideTxtImport, setHideTxtImport] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cities_import_txt_removed') === 'true';
    }
    return false;
  });
  const [hideAllCityTxtImport, setHideAllCityTxtImport] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cities_import_all_city_txt_removed') === 'true';
    }
    return false;
  });

  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  // Only Super Admin (Role 8) can access this page
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

  const loadCities = useCallback(async () => {
    setLoading(true);
    try {
      // Load from local JSON file (no Firestore reads!)
      const citiesData = await getCitiesFromLocal();
      
      if (filterState) {
        // Filter by state
        const stateCities = citiesData[filterState] || [];
        setCities(stateCities.map((name, index) => ({
          id: `${filterState}-${name}-${index}`,
          name,
          state: filterState,
        })));
      } else {
        // Get all cities
        const allCities: any[] = [];
        Object.keys(citiesData).forEach(state => {
          citiesData[state].forEach((name, index) => {
            allCities.push({
              id: `${state}-${name}-${index}`,
              name,
              state,
            });
          });
        });
        setCities(allCities);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadCities();
    // Load available cities count from world_cities_full.js
    getIndianCitiesCount().then(count => setAvailableCitiesCount(count));
    // Load available cities count from all-cities.json
    getAllCitiesTxtCount().then(count => setAvailableTxtCitiesCount(count));
  }, [isSuperAdmin, router, loadCities]);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.name || !newCity.state) {
      setError('City name and state are required');
      return;
    }

    try {
      // Add to local JSON file (no Firestore writes!)
      const success = await addCityToLocal(newCity.state, newCity.name.trim());
      if (success) {
        setSuccess('City added successfully to local file');
        setNewCity({ name: '', state: '' });
        setShowAddForm(false);
        loadCities();
      } else {
        setError('Failed to add city');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add city');
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    try {
      // Find the city to get state and name
      const city = cities.find(c => c.id === cityId);
      if (!city) {
        setError('City not found');
        return;
      }
      
      // Delete from local JSON file (no Firestore writes!)
      const success = await deleteCityFromLocal(city.state, city.name);
      if (success) {
        setSuccess('City deleted successfully from local file');
        loadCities();
      } else {
        setError('Failed to delete city');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete city');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.name.endsWith('.xlsx') ||
          selectedFile.name.endsWith('.xls') ||
          selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a valid Excel or CSV file');
        setFile(null);
      }
    }
  };

  const parseExcel = async (file: File): Promise<any[]> => {
    if (file.name.endsWith('.csv')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = lines.slice(1)
              .filter(line => line.trim())
              .map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj: any = {};
                headers.forEach((header, index) => {
                  obj[header] = values[index] || '';
                });
                return obj;
              });
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } else {
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
              reject(new Error('Failed to parse Excel file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsArrayBuffer(file);
        } catch (error) {
          reject(new Error('Failed to load Excel parser'));
        }
      });
    }
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
          const name = (row.name || row.Name || row.city || row.City || '').toString().trim();
          const state = (row.state || row.State || '').toString().trim();

          if (!name || !state) {
            errors++;
            continue;
          }

          // Add to local JSON file (no Firestore!)
          const success = await addCityToLocal(state, name);
          if (success) {
            processed++;
          } else {
            errors++; // Might be duplicate or other issue
          }
          setProgress({ processed, total: data.length, errors });
        } catch (err: any) {
          // City might already exist or other error, continue
          errors++;
          setProgress({ processed, total: data.length, errors });
        }
      }

      setSuccess(`Successfully imported ${processed} cities. ${errors} errors (may include duplicates).`);
      setFile(null);
      loadCities();
      
      const fileInput = document.getElementById('excel-file-cities') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromWorldCities = async () => {
    const mode = importMode;
    const confirmMessage = mode === 'mapped-only'
      ? `This will import only cities that can be mapped to states (estimated: ~${Math.floor((availableCitiesCount || 0) * 0.3)} cities). Continue?`
      : `This will process all ${availableCitiesCount || 0} cities. Cities with state mapping will be imported, others will be listed. Continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setImportingFromWorldCities(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: availableCitiesCount || 0, errors: 0 });
    setImportStats({ mapped: 0, unmapped: 0 });

    try {
      let result;
      
      if (mode === 'mapped-only') {
        result = await importMappedCitiesOnly((current, total) => {
          setProgress({ processed: current, total, errors: 0 });
        });
      } else {
        result = await importAllIndianCities((current, total, stats) => {
          setProgress({ processed: current, total, errors: 0 });
          setImportStats(stats);
        });
      }

      const successMsg = mode === 'mapped-only'
        ? `✅ Import completed! Success: ${result.success}, Skipped: ${result.skipped}, Errors: ${result.errors}`
        : `✅ Import completed! Success: ${result.success}, Unmapped: ${result.unmapped}, Skipped: ${result.skipped}, Errors: ${result.errors}`;

      setSuccess(successMsg);
      loadCities();

      // Show unmapped cities info if any
      if (result.details.unmapped.length > 0 && mode === 'all') {
        console.log('Unmapped cities (first 50):', result.details.unmapped.slice(0, 50));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import cities from world_cities_full.js');
    } finally {
      setImportingFromWorldCities(false);
    }
  };

  const handleImportFromAllCityTxt = async () => {
    if (!confirm('This will import all cities from "all city.txt" file into the local cities JSON file. Continue?')) {
      return;
    }

    setImportingFromAllCityTxt(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cities/import-all', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import cities');
      }

      const result = await response.json();
      setSuccess(`✅ Successfully imported cities from all city.txt! Added ${result.stats.totalCitiesAdded} cities across ${result.stats.statesUpdated} states.`);
      loadCities();
    } catch (err: any) {
      setError(err.message || 'Failed to import cities from all city.txt');
    } finally {
      setImportingFromAllCityTxt(false);
    }
  };

  const handleImportFromTxt = async () => {
    if (!confirm(`This will import ${availableTxtCitiesCount || 0} cities from all-cities.json. Continue?`)) {
      return;
    }

    setImportingFromTxt(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: availableTxtCitiesCount || 0, errors: 0 });

    try {
      const result = await importAllCitiesFromTxt((current, total) => {
        setProgress({ processed: current, total, errors: 0 });
      });

      setSuccess(`✅ Import completed! Success: ${result.success}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
      setTxtImportCompleted(true);
      loadCities();
    } catch (err: any) {
      setError(err.message || 'Failed to import cities from all-cities.json');
    } finally {
      setImportingFromTxt(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const filteredCities = filterState 
    ? cities.filter(c => c.state === filterState)
    : cities;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cities Management</h1>
          <p className="text-gray-600 mt-2">Add cities that are missing from the dropdown lists</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add City
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

      {/* Import from world_cities_full.js - Only for Super Admin (Role 8) */}
      {isSuperAdmin && availableCitiesCount !== null && availableCitiesCount > 0 && !hideWorldCitiesImport && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <MapPin className="h-6 w-6 text-blue-600 mr-3" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-blue-900">Import from world_cities_full.js</h2>
                <p className="text-sm text-blue-700 mt-1">
                  Import {availableCitiesCount.toLocaleString()} Indian cities with automatic state mapping
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWorldCitiesImport(!showWorldCitiesImport)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title={showWorldCitiesImport ? 'Collapse' : 'Expand'}
              >
                {showWorldCitiesImport ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to remove this import section? It will be permanently removed and won\'t appear again.')) {
                    setHideWorldCitiesImport(true);
                    localStorage.setItem('cities_import_world_cities_removed', 'true');
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Remove this import section permanently"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showWorldCitiesImport && (
          <div className="space-y-4">
            {/* Import Mode Selection */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Mode
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="mapped-only"
                    checked={importMode === 'mapped-only'}
                    onChange={(e) => setImportMode(e.target.value as 'mapped-only' | 'all')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Mapped Only</strong> - Import only cities that can be matched to states (Recommended)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all"
                    checked={importMode === 'all'}
                    onChange={(e) => setImportMode(e.target.value as 'mapped-only' | 'all')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>All Cities</strong> - Process all cities (unmapped will be listed)
                  </span>
                </label>
              </div>
            </div>

            {/* Progress Display */}
            {importingFromWorldCities && progress.total > 0 && (
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between text-sm text-blue-600 mb-2">
                  <span>Processing: {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}</span>
                  {importMode === 'all' && (
                    <span>Mapped: {importStats.mapped} | Unmapped: {importStats.unmapped}</span>
                  )}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  This may take several minutes. Please don't close the browser.
                </p>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImportFromWorldCities}
              disabled={importingFromWorldCities}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
            >
              {importingFromWorldCities ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Importing Cities...
                </>
              ) : (
                <>
                  <Download className="h-6 w-6 mr-3" />
                  Import {availableCitiesCount.toLocaleString()} Cities from world_cities_full.js
                </>
              )}
            </button>

            <div className="bg-blue-100 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">ℹ️ How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Cities are automatically matched to states based on existing state-city mappings</li>
                <li>Only cities with state matches are imported (ensures data quality)</li>
                <li>Duplicate cities are automatically skipped</li>
                <li>Import happens in batches to avoid overwhelming the system</li>
              </ul>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Import from all-cities.json - Only for Super Admin (Role 8) */}
      {isSuperAdmin && availableTxtCitiesCount !== null && availableTxtCitiesCount > 0 && !hideTxtImport && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <MapPin className="h-6 w-6 text-green-600 mr-3" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-green-900">Import from all-cities.json</h2>
                  {txtImportCompleted && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">Completed</span>
                  )}
                </div>
                <p className="text-sm text-green-700 mt-1">
                  {txtImportCompleted 
                    ? 'Cities have been imported successfully. You can hide this section if no longer needed.'
                    : `Import ${availableTxtCitiesCount.toLocaleString()} cities with state mapping`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTxtImport(!showTxtImport)}
                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                title={showTxtImport ? 'Collapse' : 'Expand'}
              >
                {showTxtImport ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to remove this import section? It will be permanently removed and won\'t appear again.')) {
                    setHideTxtImport(true);
                    localStorage.setItem('cities_import_txt_removed', 'true');
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Remove this import section permanently"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Progress Display */}
            {importingFromTxt && progress.total > 0 && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex justify-between text-sm text-green-600 mb-2">
                  <span>Processing: {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-green-500 mt-2">
                  This may take several minutes. Please don't close the browser.
                </p>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImportFromTxt}
              disabled={importingFromTxt}
              className="w-full bg-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
            >
              {importingFromTxt ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Importing Cities...
                </>
              ) : (
                <>
                  <Download className="h-6 w-6 mr-3" />
                  Import {availableTxtCitiesCount.toLocaleString()} Cities from all-cities.json
                </>
              )}
            </button>

            <div className="bg-green-100 rounded-lg p-3 text-sm text-green-800">
              <p className="font-semibold mb-1">ℹ️ How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All cities are already mapped to their respective states</li>
                <li>Duplicate cities are automatically skipped</li>
                <li>Import happens in batches to avoid overwhelming the system</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Import from all city.txt - Only for Super Admin (Role 8) */}
      {isSuperAdmin && !hideAllCityTxtImport && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <MapPin className="h-6 w-6 text-purple-600 mr-3" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-purple-900">Import from all city.txt</h2>
                <p className="text-sm text-purple-700 mt-1">
                  Import all cities from the "all city.txt" file into the local cities JSON file
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to remove this import section? It will be permanently removed and won\'t appear again.')) {
                  setHideAllCityTxtImport(true);
                  localStorage.setItem('cities_import_all_city_txt_removed', 'true');
                }
              }}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Remove this import section permanently"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleImportFromAllCityTxt}
              disabled={importingFromAllCityTxt}
              className="w-full bg-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
            >
              {importingFromAllCityTxt ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Importing Cities...
                </>
              ) : (
                <>
                  <Download className="h-6 w-6 mr-3" />
                  Import Cities from all city.txt
                </>
              )}
            </button>

            <div className="bg-purple-100 rounded-lg p-3 text-sm text-purple-800">
              <p className="font-semibold mb-1">ℹ️ How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Reads cities from "all city.txt" file (JSON format)</li>
                <li>Merges with existing cities in local JSON file</li>
                <li>Automatically removes duplicates</li>
                <li>Organizes cities by state</li>
                <li>No Firestore operations - all data stored locally</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Add City Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add New City</h2>
          <form onSubmit={handleAddCity} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCity.state}
                  onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
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
                  City Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCity.name}
                  onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Enter city name"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add City
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCity({ name: '', state: '' });
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
        <h2 className="text-xl font-semibold mb-4">Import Cities from Excel/CSV</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="excel-file-cities" className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel or CSV File
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex-1 cursor-pointer">
                <input
                  id="excel-file-cities"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400 mr-3" />
                  <span className="text-gray-600">
                    {file ? file.name : 'Click to select Excel or CSV file'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">File should have the following columns:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>name</strong> or <strong>city</strong> (required) - City name</li>
              <li><strong>state</strong> (required) - State name (must match exactly with state names in the system)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              You can download comprehensive city datasets from: simplemaps.com/data/in-cities or use any CSV/Excel with city and state columns
            </p>
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
                Import Cities
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by State
        </label>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
        >
          <option value="">All States</option>
          {indianStates.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      {/* Cities List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">All Cities ({filteredCities.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    {filterState ? `No cities found for ${filterState}` : 'No cities found. Add cities manually.'}
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <tr key={city.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {city.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {city.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteCity(city.id)}
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
