'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { X, MapPin, Building2, Globe } from 'lucide-react';
import { getCitiesByStateFromLocal } from '@/lib/data/local-cities';
import { indianStates } from '@/lib/data/india-states';

interface AssignManagerRoleModalProps {
    isOpen: boolean;
    user: User;
    onClose: () => void;
    onAssign: (userId: string, role: 5 | 6 | 7, assignedArea: { city?: string; state?: string; zone?: string }) => Promise<void>;
    onRevoke?: (userId: string) => Promise<void>;
}

// Define zones (customize based on your organization)
const ZONES = [
    'North Zone',
    'South Zone',
    'East Zone',
    'West Zone',
    'Central Zone',
    'Northeast Zone',
];

export default function AssignManagerRoleModal({
    isOpen,
    user,
    onClose,
    onAssign,
    onRevoke,
}: AssignManagerRoleModalProps) {
    const [selectedRole, setSelectedRole] = useState<5 | 6 | 7 | null>(null);
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [citiesInState, setCitiesInState] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

    // Load cities when state changes
    useEffect(() => {
        if (selectedState && selectedRole === 5) {
            loadCities(selectedState);
        }
    }, [selectedState, selectedRole]);

    const handleRevokeConfirm = async () => {
        if (!onRevoke) return;
        setLoading(true);
        await onRevoke(user.id);
        setLoading(false);
        onClose();
        setShowRevokeConfirm(false);
    };

    const loadCities = async (state: string) => {
        try {
            const cities = await getCitiesByStateFromLocal(state);
            setCitiesInState(cities.sort());
        } catch (error) {
            console.error('Error loading cities:', error);
            setCitiesInState([]);
        }
    };

    const handleRoleChange = (role: 5 | 6 | 7) => {
        setSelectedRole(role);
        // Reset selections when role changes
        setSelectedZone('');
        setSelectedState('');
        setSelectedCity('');
        setCitiesInState([]);
    };

    const handleAssign = async () => {
        if (!selectedRole) return;

        // Validate based on role
        if (selectedRole === 5 && (!selectedState || !selectedCity)) {
            alert('Please select both state and city for City Manager');
            return;
        }
        if (selectedRole === 6 && !selectedState) {
            alert('Please select a state for State Manager');
            return;
        }
        if (selectedRole === 7 && !selectedZone) {
            alert('Please select a zone for Zone Manager');
            return;
        }

        setLoading(true);
        try {
            const assignedArea: { city?: string; state?: string; zone?: string } = {};

            if (selectedRole === 5) {
                assignedArea.city = selectedCity;
                assignedArea.state = selectedState;
            } else if (selectedRole === 6) {
                assignedArea.state = selectedState;
            } else if (selectedRole === 7) {
                assignedArea.zone = selectedZone;
            }

            await onAssign(user.id, selectedRole, assignedArea);
            onClose();
        } catch (error) {
            console.error('Error assigning role:', error);
            alert('Failed to assign role. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 transform transition-all">
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                                {showRevokeConfirm ? 'Confirm Revocation' : 'Assign Manager Role'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {showRevokeConfirm ? 'This action is irreversible' : 'Select logic access level for this user'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {showRevokeConfirm ? (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-8 text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="h-8 w-8 text-red-600" />
                                </div>
                                <h3 className="text-lg font-bold text-red-900 mb-2">Revoke Manager Role?</h3>
                                <p className="text-red-700/80 mb-6 max-w-sm mx-auto">
                                    Are you sure you want to remove all manager access for <strong>{user.name}</strong>? They will lose access to the manager dashboard immediately.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowRevokeConfirm(false)}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRevokeConfirm}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-700 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Revoking...' : 'Yes, Revoke Role'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* User Info */}
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-8 border border-orange-100/50 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border-2 border-orange-100 shadow-sm text-orange-600 font-bold text-lg">
                                    {user.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Selected User</p>
                                    <p className="text-gray-900 font-bold text-lg leading-tight">{user.name}</p>
                                    <p className="text-orange-600 text-sm font-medium">{user.email}</p>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 mb-4 px-1">
                                    Select Manager Role
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* City Manager */}
                                    <button
                                        onClick={() => handleRoleChange(5)}
                                        className={`relative flex flex-col items-center p-4 rounded-xl transition-all duration-300 border ${selectedRole === 5
                                            ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500 ring-offset-2'
                                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg hover:scale-[1.02]'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${selectedRole === 5 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <span className={`font-bold ${selectedRole === 5 ? 'text-orange-900' : 'text-gray-700'}`}>City Manager</span>
                                        <span className={`text-xs mt-1 ${selectedRole === 5 ? 'text-orange-600' : 'text-gray-500'}`}>Role 5</span>
                                    </button>

                                    {/* State Manager */}
                                    <button
                                        onClick={() => handleRoleChange(6)}
                                        className={`relative flex flex-col items-center p-4 rounded-xl transition-all duration-300 border ${selectedRole === 6
                                            ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500 ring-offset-2'
                                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg hover:scale-[1.02]'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${selectedRole === 6 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            <MapPin className="h-6 w-6" />
                                        </div>
                                        <span className={`font-bold ${selectedRole === 6 ? 'text-orange-900' : 'text-gray-700'}`}>State Manager</span>
                                        <span className={`text-xs mt-1 ${selectedRole === 6 ? 'text-orange-600' : 'text-gray-500'}`}>Role 6</span>
                                    </button>

                                    {/* Zone Manager */}
                                    <button
                                        onClick={() => handleRoleChange(7)}
                                        className={`relative flex flex-col items-center p-4 rounded-xl transition-all duration-300 border ${selectedRole === 7
                                            ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500 ring-offset-2'
                                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg hover:scale-[1.02]'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${selectedRole === 7 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            <Globe className="h-6 w-6" />
                                        </div>
                                        <span className={`font-bold ${selectedRole === 7 ? 'text-orange-900' : 'text-gray-700'}`}>Zone Manager</span>
                                        <span className={`text-xs mt-1 ${selectedRole === 7 ? 'text-orange-600' : 'text-gray-500'}`}>Role 7</span>
                                    </button>
                                </div>
                            </div>

                            {/* Geographic Area Selection */}
                            {selectedRole && (
                                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <label className="block text-sm font-bold text-gray-700 mb-4 px-1">
                                        Assign Geographic Area
                                    </label>

                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        {/* City Manager - Select State and City */}
                                        {selectedRole === 5 && (
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        State <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedState}
                                                            onChange={(e) => {
                                                                setSelectedState(e.target.value);
                                                                setSelectedCity('');
                                                            }}
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                                                        >
                                                            <option value="">Select State</option>
                                                            {indianStates.map((state) => (
                                                                <option key={state} value={state}>
                                                                    {state}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            <MapPin className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`transition-all duration-300 ${selectedState ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        City <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedCity}
                                                            onChange={(e) => setSelectedCity(e.target.value)}
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                                                            disabled={!selectedState}
                                                        >
                                                            <option value="">Select City</option>
                                                            {citiesInState.map((city) => (
                                                                <option key={city} value={city}>
                                                                    {city}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            <Building2 className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-3 flex gap-3 items-start">
                                                    <div className="text-amber-500 mt-0.5">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed">
                                                        This user will be able to view and manage all users from <strong>{selectedCity || 'the selected city'}</strong>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* State Manager - Select State */}
                                        {selectedRole === 6 && (
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        State <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedState}
                                                            onChange={(e) => setSelectedState(e.target.value)}
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                                                        >
                                                            <option value="">Select State</option>
                                                            {indianStates.map((state) => (
                                                                <option key={state} value={state}>
                                                                    {state}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            <MapPin className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-3 flex gap-3 items-start">
                                                    <div className="text-amber-500 mt-0.5">
                                                        <MapPin className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed">
                                                        This user will be able to view and manage all users from all cities in <strong>{selectedState || 'the selected state'}</strong>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Zone Manager - Select Zone */}
                                        {selectedRole === 7 && (
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Zone <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedZone}
                                                            onChange={(e) => setSelectedZone(e.target.value)}
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                                                        >
                                                            <option value="">Select Zone</option>
                                                            {ZONES.map((zone) => (
                                                                <option key={zone} value={zone}>
                                                                    {zone}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                            <Globe className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-3 flex gap-3 items-start">
                                                    <div className="text-amber-500 mt-0.5">
                                                        <Globe className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed">
                                                        This user will be able to view and manage all users from all states in <strong>{selectedZone || 'the selected zone'}</strong>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-2">
                                {/* Revoke Button - only show if user has a manager role */}
                                {onRevoke && (
                                    <button
                                        onClick={() => setShowRevokeConfirm(true)}
                                        disabled={loading}
                                        className="px-4 py-3 border border-red-200 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all disabled:opacity-50"
                                    >
                                        Revoke Role
                                    </button>
                                )}

                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={loading || !selectedRole}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                                >
                                    {loading ? 'Assigning Role...' : 'Assign Role'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
