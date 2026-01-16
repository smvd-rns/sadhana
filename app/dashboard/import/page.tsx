'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { signUp } from '@/lib/supabase/auth';
import { UserRole } from '@/types';

export default function ImportPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });

  // Check if user is Super Admin (Role 8)
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);
  if (!isSuperAdmin) {
    router.push('/dashboard');
    return null;
  }

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
        // Dynamically import xlsx to avoid SSR issues
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

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: 0, errors: 0 });

    try {
      // Parse Excel file
      const data = await parseExcel(file);
      setProgress({ processed: 0, total: data.length, errors: 0 });

      let processed = 0;
      let errors = 0;

      // Process each row
      for (const row of data) {
        try {
          // Expected columns: name, email, password, state, city, center, role (optional, can be comma-separated)
          const name = row.name || row.Name || '';
          const email = row.email || row.Email || '';
          const password = row.password || row.Password || `TempPass${Date.now()}`;
          const state = row.state || row.State || '';
          const city = row.city || row.City || '';
          const center = row.center || row.Center || '';
          // Support multiple roles: comma-separated or single role
          const roleInput = (row.role || row.Role || 'student').toString().trim();
          const roles: UserRole[] = roleInput.includes(',')
            ? roleInput.split(',').map((r: string) => r.trim() as UserRole).filter((r: UserRole) => !!r)
            : [roleInput as UserRole];

          if (!name || !email) {
            errors++;
            continue;
          }

          // Create user with multiple roles
          await signUp(
            email,
            password,
            name,
            roles,
            {
              state: state || undefined,
              city: city || undefined,
              center: center || undefined,
            }
          );

          processed++;
          setProgress({ processed, total: data.length, errors });
        } catch (err: any) {
          console.error('Error importing user:', err);
          errors++;
          setProgress({ processed, total: data.length, errors });
        }
      }

      setSuccess(`Successfully imported ${processed} users. ${errors} errors.`);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Users from Excel</h1>
        <p className="text-gray-600 mt-2">Upload an Excel file to bulk import users</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">File Format</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">Your Excel file should have the following columns:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>name</strong> (required) - Full name of the user</li>
              <li><strong>email</strong> (required) - Email address</li>
              <li><strong>password</strong> (optional) - Password (if not provided, a temporary password will be generated)</li>
              <li><strong>state</strong> (optional) - State name</li>
              <li><strong>city</strong> (optional) - City name</li>
              <li><strong>center</strong> (optional) - Center name</li>
              <li><strong>role</strong> (optional) - User role(s), comma-separated for multiple roles (defaults to "student"). Example: "center_admin,state_admin"</li>
            </ul>
          </div>
        </div>

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

        {loading && progress.total > 0 && (
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
          disabled={!file || loading}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              Import Users
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> The Excel file will be parsed using the xlsx library. 
          Ensure your Excel file has the correct column headers as shown above. 
          All users will be created with "student" role by default unless specified in the role column.
        </p>
      </div>
    </div>
  );
}
