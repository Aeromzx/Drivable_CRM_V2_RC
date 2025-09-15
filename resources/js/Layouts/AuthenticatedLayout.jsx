import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import {Link, usePage} from '@inertiajs/react';
import {useState, useEffect} from 'react';

export default function AuthenticatedLayout({header, children}) {
    const user = usePage().props.auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [lastReload, setLastReload] = useState(new Date());
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showActivityLogModal, setShowActivityLogModal] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [logFilters, setLogFilters] = useState({
        search: '',
        action: '',
        resource_type: '',
        user_id: '',
        date_from: '',
        date_to: ''
    });
    const [filterOptions, setFilterOptions] = useState({
        actions: [],
        resource_types: [],
        users: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const { url } = usePage();

    // Last reload tracking
    useEffect(() => {
        const handlePageReload = () => {
            setLastReload(new Date());
        };

        // Update last reload when route changes
        setLastReload(new Date());
        
        return () => {
            // Cleanup if needed
        };
    }, [url]);

    // Format last reload time
    const getLastReloadText = () => {
        const diff = Math.floor((currentTime - lastReload) / 1000);
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        let timeString = '';
        
        if (hours > 0) {
            timeString += `${hours}h `;
        }
        if (minutes > 0 || hours > 0) {
            timeString += `${minutes}m `;
        }
        timeString += `${seconds}s`;
        
        return `vor ${timeString}`;
    };

    // Update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Hilfsfunktion für aktive Navigation
    const isActive = (path) => {
        return url.startsWith(path);
    };

    // Styles für aktive und inaktive Navigation
    const getNavLinkClasses = (path) => {
        const baseClasses = "group flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 relative overflow-hidden";
        const activeClasses = "text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg";
        const inactiveClasses = "text-gray-600 hover:text-orange-600 hover:bg-orange-50/80";
        
        return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`;
    };

    const getResponsiveNavLinkClasses = (path) => {
        const baseClasses = "flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200";
        const activeClasses = "text-white bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg";
        const inactiveClasses = "text-gray-700 hover:text-orange-600 hover:bg-orange-50/80";
        
        return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`;
    };

    const loadActivityLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(logFilters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            const response = await axios.get(`/api/activity-logs?${params}`);
            setActivityLogs(response.data.logs);
            setFilterOptions({
                actions: response.data.actions,
                resource_types: response.data.resource_types,
                users: response.data.users
            });
        } catch (error) {
            console.error('Error loading activity logs:', error);
        }
        setIsLoading(false);
    };

    const openActivityLogModal = () => {
        setShowActivityLogModal(true);
        loadActivityLogs();
    };

    const handleFilterChange = (key, value) => {
        setLogFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        loadActivityLogs();
    };

    const clearFilters = () => {
        setLogFilters({
            search: '',
            action: '',
            resource_type: '',
            user_id: '',
            date_from: '',
            date_to: ''
        });
        setTimeout(() => loadActivityLogs(), 100);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionColor = (action) => {
        const colors = {
            'created': 'text-green-600 bg-green-50',
            'updated': 'text-blue-600 bg-blue-50',
            'deleted': 'text-red-600 bg-red-50',
            'viewed': 'text-gray-600 bg-gray-50',
            'verified': 'text-green-600 bg-green-50',
            'unverified': 'text-yellow-600 bg-yellow-50'
        };
        return colors[action] || 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
            {/* Modern Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo Section */}
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center space-x-3 group">
                                <div
                                    className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 p-2">
                                    <img
                                        src="https://drivable.app/images/logo_drive_withoutText.png"
                                        alt="Drivable Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                                        Drivable
                                    </h1>
                                    <p className="text-xs text-gray-500 -mt-1">
                                        Zuletzt neu geladen {getLastReloadText()}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center space-x-1">
                            <Link
                                href="/dashboard"
                                className={getNavLinkClasses('/dashboard')}
                            >
                                <span className="relative z-10">Dashboard</span>
                                {!isActive('/dashboard') && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                )}
                            </Link>
                            <Link
                                href="/vermieter"
                                className={getNavLinkClasses('/vermieter')}
                            >
                                <span className="relative z-10">Vermieter</span>
                                {!isActive('/vermieter') && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                )}
                            </Link>
                            <Link
                                href="/mieten"
                                className={getNavLinkClasses('/mieten')}
                            >
                                <span className="relative z-10">Mieten</span>
                                {!isActive('/mieten') && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                )}
                            </Link>
                            <Link
                                href="/user"
                                className={getNavLinkClasses('/user')}
                            >
                                <span className="relative z-10">User</span>
                                {!isActive('/user') && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                )}
                            </Link>
                            <Link
                                href="/autos"
                                className={getNavLinkClasses('/autos')}
                            >
                                <span className="relative z-10">Autos</span>
                                {!isActive('/autos') && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                )}
                            </Link>
                            <a
                                href="/invoicing"
                                className={getNavLinkClasses('/invoicing')}
                            >
                                <span className="relative z-10">Rechnungen</span>
                                {!isActive('/invoicing') && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                )}
                            </a>
                        </div>

                        {/* User Section (Desktop) */}
                        <div className="hidden lg:flex items-center space-x-4">
                            {/* Activity Log Button */}
                            <button
                                onClick={openActivityLogModal}
                                className="relative p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all duration-200 group"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                                </svg>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                                <div className="absolute invisible group-hover:visible bg-black text-white text-xs px-2 py-1 rounded top-full left-1/2 transform -translate-x-1/2 mt-2 whitespace-nowrap">
                                    Activity Logs
                                </div>
                            </button>

                            {/* User Avatar Dropdown */}
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group">
                                        <div
                                            className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-md group-hover:shadow-lg transition-all duration-200">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-left hidden xl:block">
                                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">Administrator</p>
                                        </div>
                                        <svg
                                            className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors"
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M19 9l-7 7-7-7"/>
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <Dropdown.Link href="#"
                                                   className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                        </svg>
                                        Profil bearbeiten
                                    </Dropdown.Link>
                                    <Dropdown.Link href="#"
                                                   className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        </svg>
                                        Einstellungen
                                    </Dropdown.Link>
                                    <div className="border-t border-gray-100">
                                        <Dropdown.Link href="#" method="post" as="button"
                                                       className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                            </svg>
                                            Abmelden
                                        </Dropdown.Link>
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Mobile menu button */}
                        <div className="lg:hidden">
                            <button
                                onClick={() => setShowingNavigationDropdown(!showingNavigationDropdown)}
                                className="p-2 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50/80 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {showingNavigationDropdown ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"/>
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M4 6h16M4 12h16M4 18h16"/>
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                <div
                    className={`lg:hidden transition-all duration-300 ease-in-out ${showingNavigationDropdown ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="px-4 py-6 bg-white/95 backdrop-blur-md border-t border-gray-200/50">
                        {/* Mobile Navigation Links */}
                        <div className="space-y-2 mb-6">
                            <Link
                                href="/dashboard"
                                className={getResponsiveNavLinkClasses('/dashboard')}
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                                Dashboard
                            </Link>
                            <Link
                                href="/vermieter"
                                className={getResponsiveNavLinkClasses('/vermieter')}
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                                Vermieter
                            </Link>
                            <Link
                                href="/mieten"
                                className={getResponsiveNavLinkClasses('/mieten')}
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                </svg>
                                Mieten
                            </Link>
                            <Link
                                href="/user"
                                className={getResponsiveNavLinkClasses('/user')}
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                                </svg>
                                User
                            </Link>
                            <Link
                                href="/autos"
                                className={getResponsiveNavLinkClasses('/autos')}
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                                </svg>
                                Autos
                            </Link>
                            <a
                                href="/invoicing"
                                className={getResponsiveNavLinkClasses('/invoicing')}
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                Rechnungen
                            </a>
                        </div>

                        {/* Mobile User Section */}
                        <div className="pt-6 border-t border-gray-200/50">
                            <div className="flex items-center px-4 py-3 mb-4">
                                <div
                                    className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-md mr-4">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-gray-900">{user.name}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <ResponsiveNavLink
                                    href="#"
                                    className="flex items-center px-4 py-3 rounded-xl text-gray-600 hover:text-orange-600 hover:bg-orange-50/80 transition-all duration-200"
                                >
                                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    Profil bearbeiten
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    method="post"
                                    href="#"
                                    as="button"
                                    className="flex items-center w-full px-4 py-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50/80 transition-all duration-200"
                                >
                                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                    </svg>
                                    Abmelden
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>


            {/* Main Content */}
            <main className="py-8">{children}</main>

            {/* Activity Log Modal */}
            {showActivityLogModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="relative w-11/12 max-w-6xl h-[90vh] shadow-lg rounded-lg bg-white flex flex-col animate-slide-up">
                        {/* Header */}
                        <div className="p-6 border-b flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">Activity Logs</h2>
                                <button
                                    onClick={() => setShowActivityLogModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Filters */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Suchen..."
                                        value={logFilters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={logFilters.action}
                                        onChange={(e) => handleFilterChange('action', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="">Alle Aktionen</option>
                                        {filterOptions.actions.map(action => (
                                            <option key={action} value={action}>{action}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <select
                                        value={logFilters.resource_type}
                                        onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="">Alle Typen</option>
                                        {filterOptions.resource_types.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <select
                                        value={logFilters.user_id}
                                        onChange={(e) => handleFilterChange('user_id', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="">Alle Benutzer</option>
                                        {filterOptions.users.map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={applyFilters}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        {isLoading ? '...' : 'Filter'}
                                    </button>
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-6">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="text-gray-500">Lade Aktivitäten...</div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activityLogs.data?.map(log => (
                                        <div key={log.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                        <span className="text-sm text-gray-600">
                                                            {log.resource_type}
                                                        </span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {log.user?.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 mb-2">{log.description}</p>
                                                    {log.resource_name && (
                                                        <p className="text-sm text-gray-500">
                                                            <strong>Resource:</strong> {log.resource_name}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 text-right">
                                                    <div>{formatDate(log.created_at)}</div>
                                                    <div className="text-xs">{log.ip_address}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {activityLogs.data?.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>Keine Aktivitäten gefunden</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
