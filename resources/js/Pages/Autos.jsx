import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// Custom CSS animations
const modalStyles = `
    @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes modalFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes modalSlideOut {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
        }
    }

    .modal-backdrop-enter {
        animation: modalFadeIn 0.2s ease-out forwards;
    }

    .modal-backdrop-exit {
        animation: modalFadeOut 0.2s ease-in forwards;
    }

    .modal-content-enter {
        animation: modalSlideIn 0.3s ease-out forwards;
    }

    .modal-content-exit {
        animation: modalSlideOut 0.2s ease-in forwards;
    }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = modalStyles;
    if (!document.head.querySelector('style[data-modal-animations]')) {
        styleElement.setAttribute('data-modal-animations', 'true');
        document.head.appendChild(styleElement);
    }
}

export default function Autos({ cars, search, sortBy, status, selectedBrand, statistics, brands, engineTypes, chartData, error }) {
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [activeSort, setActiveSort] = useState(sortBy || 'newest');
    const [activeTab, setActiveTab] = useState(status || 'active');
    const [activeBrand, setActiveBrand] = useState(selectedBrand || 'all');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' oder 'table'
    const [loading, setLoading] = useState(false);
    const [selectedCar, setSelectedCar] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({});
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationData, setNotificationData] = useState({ type: 'success', title: '', message: '' });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Animation states
    const [isEditModalClosing, setIsEditModalClosing] = useState(false);
    const [isNotificationModalClosing, setIsNotificationModalClosing] = useState(false);
    const [isConfirmModalClosing, setIsConfirmModalClosing] = useState(false);

    // Toast notification function
    const showNotification = (type, title, message) => {
        setNotificationData({ type, title, message });
        setShowNotificationModal(true);
        setIsNotificationModalClosing(false);
    };

    // Animated modal close functions
    const closeEditModal = () => {
        setIsEditModalClosing(true);
        setTimeout(() => {
            setShowEditModal(false);
            setIsEditModalClosing(false);
        }, 200);
    };

    const closeNotificationModal = () => {
        setIsNotificationModalClosing(true);
        setTimeout(() => {
            setShowNotificationModal(false);
            setIsNotificationModalClosing(false);
        }, 200);
    };

    const closeConfirmModal = () => {
        setIsConfirmModalClosing(true);
        setTimeout(() => {
            setShowConfirmModal(false);
            setIsConfirmModalClosing(false);
        }, 200);
    };

    const handleSearch = () => {
        setLoading(true);
        router.get('/autos', {
            search: searchTerm,
            sort: activeSort,
            status: activeTab,
            brand: activeBrand,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false)
        });
    };

    // Auto-search when search field becomes empty
    useEffect(() => {
        if (searchTerm === '' && search !== '') {
            // Only trigger if search was previously not empty
            handleSearch();
        }
    }, [searchTerm]);


    const handleSortChange = (newSort) => {
        setActiveSort(newSort);
        setLoading(true);
        router.get('/autos', {
            search: searchTerm,
            sort: newSort,
            status: activeTab,
            brand: activeBrand,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false)
        });
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setLoading(true);
        router.get('/autos', {
            search: searchTerm,
            sort: activeSort,
            status: newTab,
            brand: activeBrand,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false)
        });
    };

    const handleBrandChange = (newBrand) => {
        setActiveBrand(newBrand);
        setLoading(true);
        router.get('/autos', {
            search: searchTerm,
            sort: activeSort,
            status: activeTab,
            brand: newBrand,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false)
        });
    };

    const formatMoney = (amount) => {
        if (!amount) return '0,00 €';
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getFuelTypeText = (fuelType) => {
        const types = {
            '1': 'Benzin',
            '2': 'Hybrid',
            '3': 'Diesel',
            '4': 'Elektro'
        };
        return types[fuelType] || 'Unbekannt';
    };

    const getBrandIcon = (brand) => {
        if (!brand || !brand.iconName) return null;
        return `https://drivable.app/images/brands/${brand.iconName}.webp`;
    };

    const getStatusBadge = (car) => {
        if (car.deleted === 1) {
            return <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">Gelöscht</span>;
        }
        // TODO: Add verified field support when available in database
        return <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Aktiv</span>;
    };

    const openEditModal = (car) => {
        setSelectedCar(car);
        setEditData({
            title: car.title || '',
            brand: car.brand || '',
            model: car.model || '',
            year: car.year || '',
            fuelType: car.fuelType || '',
            gearType: car.gearType || '',
            engineType: car.engineType || '',
            description: car.description || '',
            dailyRentMoThu: car.dailyRentMoThu || '',
            dailyRentFriSun: car.dailyRentFriSun || '',
            weekendRent: car.weekendRent || '',
            weeklyRent: car.weeklyRent || '',
            hourRent: car.hourRent || '',
            depositAmount: car.depositAmount || '',
            // verified: car.verified === 1, // TODO: Add when field exists in database
        });
        setShowEditModal(true);
    };

    const saveCar = async () => {
        if (!selectedCar) return;

        setIsSaving(true);
        try {
            const response = await axios.put(`/api/cars/${selectedCar.id}`, editData);

            if (response.data.success) {
                showNotification('success', 'Erfolgreich gespeichert', 'Auto wurde erfolgreich aktualisiert!');
                closeEditModal();
                // Reload the page to get updated data
                router.reload();
            }
        } catch (error) {
            console.error('Error updating car:', error);
            showNotification('error', 'Fehler beim Speichern', 'Auto konnte nicht aktualisiert werden.');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = (car) => {
        setSelectedCar(car);
        setConfirmAction(() => () => deleteCar(car.id));
        setShowConfirmModal(true);
    };

    const confirmRestore = (car) => {
        setSelectedCar(car);
        setConfirmAction(() => () => restoreCar(car.id));
        setShowConfirmModal(true);
    };

    const deleteCar = async (carId) => {
        try {
            const response = await axios.delete(`/api/cars/${carId}`);

            if (response.data.success) {
                showNotification('success', 'Auto gelöscht', 'Auto wurde erfolgreich gelöscht!');
                router.reload();
            }
        } catch (error) {
            console.error('Error deleting car:', error);
            showNotification('error', 'Fehler beim Löschen', 'Auto konnte nicht gelöscht werden.');
        }
    };

    const restoreCar = async (carId) => {
        try {
            const response = await axios.patch(`/api/cars/${carId}/restore`);

            if (response.data.success) {
                showNotification('success', 'Auto wiederhergestellt', 'Auto wurde erfolgreich wiederhergestellt!');
                router.reload();
            }
        } catch (error) {
            console.error('Error restoring car:', error);
            showNotification('error', 'Fehler beim Wiederherstellen', 'Auto konnte nicht wiederhergestellt werden.');
        }
    };

    const deleteImage = async (imageId) => {
        if (!selectedCar) return;

        try {
            const response = await axios.delete(`/api/cars/${selectedCar.id}/images/${imageId}`);

            if (response.data.success) {
                setSelectedCar(response.data.car);
                showNotification('success', 'Bild gelöscht', 'Bild wurde erfolgreich gelöscht!');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            showNotification('error', 'Fehler beim Löschen', 'Bild konnte nicht gelöscht werden.');
        }
    };

    if (loading) {
        return (
            <AuthenticatedLayout
                header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Autos</h2>}
            >
                <Head title="Autos" />
                <div className="py-12">
                    <div className="flex items-center justify-center h-64">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            <span>Lade Autos...</span>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Autos</h2>}
        >
            <Head title="Autos" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="text-red-700">{error}</div>
                        </div>
                    )}

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Gesamt Autos</p>
                                    <p className="text-2xl font-semibold text-gray-900">{statistics.total_cars}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-100 text-green-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Aktive Autos</p>
                                    <p className="text-2xl font-semibold text-gray-900">{statistics.active_cars}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-red-100 text-red-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Gelöschte Autos</p>
                                    <p className="text-2xl font-semibold text-gray-900">{statistics.deleted_cars}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Ø Tagespreis</p>
                                    <p className="text-2xl font-semibold text-gray-900">{formatMoney(statistics.avg_price)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    {chartData && chartData.lifetimeGrowth && chartData.last30Days && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                <h3 className="text-md font-semibold text-gray-900 mb-3">Lifetime Auto Wachstum</h3>
                                <div className="h-48">
                                    <Line
                                        data={{
                                            labels: chartData.lifetimeGrowth.map(item => item.month_name),
                                            datasets: [{
                                                label: 'Kumulierte Autos',
                                                data: chartData.lifetimeGrowth.map(item => item.cumulative),
                                                borderColor: 'rgb(249, 115, 22)',
                                                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                                tension: 0.1,
                                                fill: true,
                                                pointRadius: 2,
                                                pointHoverRadius: 4
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            scales: {
                                                x: {
                                                    display: true,
                                                    ticks: {
                                                        font: { size: 10 }
                                                    }
                                                },
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: {
                                                        stepSize: 1,
                                                        font: { size: 10 }
                                                    }
                                                }
                                            },
                                            plugins: {
                                                legend: {
                                                    display: false
                                                },
                                                tooltip: {
                                                    mode: 'index',
                                                    intersect: false
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                <h3 className="text-md font-semibold text-gray-900 mb-3">30-Tage Auto Wachstum</h3>
                                <div className="h-48">
                                    <Line
                                        data={{
                                            labels: chartData.last30Days.map(item => item.date_formatted),
                                            datasets: [{
                                                label: 'Neue Autos pro Tag',
                                                data: chartData.last30Days.map(item => item.count),
                                                borderColor: 'rgb(34, 197, 94)',
                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                tension: 0.1,
                                                fill: true,
                                                pointRadius: 2,
                                                pointHoverRadius: 4
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            scales: {
                                                x: {
                                                    display: true,
                                                    ticks: {
                                                        maxTicksLimit: 8,
                                                        font: { size: 10 }
                                                    }
                                                },
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: {
                                                        stepSize: 1,
                                                        font: { size: 10 }
                                                    }
                                                }
                                            },
                                            plugins: {
                                                legend: {
                                                    display: false
                                                },
                                                tooltip: {
                                                    mode: 'index',
                                                    intersect: false
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white shadow-sm sm:rounded-lg">
                        <div className="p-5">
                            {/* Header mit Suche und View Toggle */}
                            <div className="flex flex-col space-y-4 mb-5">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Autos Übersicht
                                    </h3>

                                    {/* View Toggle - nur auf Desktop rechts */}
                                    <div className="hidden sm:flex rounded-lg border border-gray-300 bg-gray-100 p-1">
                                        <button
                                            onClick={() => setViewMode('cards')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                viewMode === 'cards'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                <span className="hidden md:inline">Karten</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                viewMode === 'table'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                <span className="hidden md:inline">Tabelle</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Search und Mobile View Toggle */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Search */}
                                    <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex-1">
                                        <div className="flex">
                                            <input
                                                type="text"
                                                placeholder="Nach Titel, Modell, Beschreibung, Vermieter, Firma..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="flex-1 min-w-0 border-gray-300 rounded-l-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                                            />
                                            <button
                                                type="submit"
                                                className="px-3 sm:px-4 py-2 bg-orange-600 text-white border border-orange-600 rounded-r-md hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 text-sm whitespace-nowrap"
                                            >
                                                <span className="hidden xs:inline">Suchen</span>
                                                <svg className="w-4 h-4 xs:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </form>

                                    {/* Mobile View Toggle */}
                                    <div className="sm:hidden flex rounded-lg border border-gray-300 bg-gray-100 p-1 self-start">
                                        <button
                                            onClick={() => setViewMode('cards')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                viewMode === 'cards'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                Karten
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                viewMode === 'table'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Tabelle
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 mb-6">
                                <nav className="-mb-px flex space-x-6 grid grid-cols-3 md:grid-cols-5">
                                    <button
                                        onClick={() => handleTabChange('active')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'active'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Aktive Autos ({statistics.active_cars})
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('verified')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'verified'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Verifizierte Autos ({statistics.verified_cars})
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('unverified')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'unverified'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Unverifizierte Autos ({statistics.unverified_cars})
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('deleted')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'deleted'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Gelöschte Autos ({statistics.deleted_cars})
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('all')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'all'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Alle Autos ({statistics.total_cars})
                                    </button>
                                </nav>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marke</label>
                                    <select
                                        value={activeBrand}
                                        onChange={(e) => handleBrandChange(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                                    >
                                        <option value="all">Alle Marken</option>
                                        {brands?.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.brandName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sortierung</label>
                                    <select
                                        value={activeSort}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                                    >
                                        <option value="newest">Neueste zuerst</option>
                                        <option value="oldest">Älteste zuerst</option>
                                        <option value="title">Nach Titel</option>
                                        <option value="price_high">Preis (hoch-niedrig)</option>
                                        <option value="price_low">Preis (niedrig-hoch)</option>
                                        <option value="year_new">Baujahr (neu-alt)</option>
                                        <option value="year_old">Baujahr (alt-neu)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Cars Content - Cards oder Table */}
                            {viewMode === 'cards' ? (
                                /* Karten-Ansicht */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {cars?.data?.length === 0 ? (
                                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                            </svg>
                                            <h3 className="text-lg font-medium mb-2">Keine Autos gefunden</h3>
                                            <p>Versuche deine Suchkriterien anzupassen.</p>
                                        </div>
                                    ) : (
                                        cars?.data?.map((car) => (
                                            <div key={car.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                                {/* Car Image */}
                                                <div className="h-48 bg-gray-100 relative">
                                                    {car.images?.[0] ? (
                                                        <img
                                                            src={`https://drivable.app/storage/${car.images[0].image_path}`}
                                                            alt={car.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {/* Status Badge */}
                                                    <div className="absolute top-3 right-3">
                                                        {getStatusBadge(car)}
                                                    </div>
                                                </div>

                                                {/* Card Content */}
                                                <div className="p-4">
                                                    <div className="mb-2">
                                                        <h3 className="font-semibold text-gray-900 truncate">{car.title || 'Kein Titel'}</h3>
                                                        <p className="text-sm text-gray-600">{car.model} • {car.year}</p>
                                                    </div>

                                                    <div className="mb-3">
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Vermieter:</strong> {car.renter?.user?.name || 'Unbekannt'}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Kraftstoff:</strong> {getFuelTypeText(car.fuelType)}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Tagespreis:</strong> {formatMoney(car.dailyRentMoThu)}
                                                        </p>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openEditModal(car)}
                                                            className="flex-1 bg-orange-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-orange-700 transition-colors"
                                                        >
                                                            Bearbeiten
                                                        </button>
                                                        {car.deleted === 1 ? (
                                                            <button
                                                                onClick={() => confirmRestore(car)}
                                                                className="flex-1 bg-green-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-green-700 transition-colors"
                                                            >
                                                                Wiederherstellen
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => confirmDelete(car)}
                                                                className="flex-1 bg-red-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-red-700 transition-colors"
                                                            >
                                                                Löschen
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                /* Tabellen-Ansicht */
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vermieter</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {cars?.data?.map((car) => (
                                                <tr key={car.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-12 w-12 flex-shrink-0">
                                                                {car.images?.[0] ? (
                                                                    <img
                                                                        src={`https://drivable.app/storage/${car.images[0].image_path}`}
                                                                        alt={car.title}
                                                                        className="h-12 w-12 rounded-lg object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="ml-3">
                                                                <p className="text-sm font-medium text-gray-900">{car.title || 'Kein Titel'}</p>
                                                                <p className="text-sm text-gray-500">{car.model} • {car.year}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {car.renter?.user?.name || 'Unbekannt'}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div>
                                                            <p>{getFuelTypeText(car.fuelType)}</p>
                                                            <p className="text-gray-500">{car.gearType || 'N/A'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatMoney(car.dailyRentMoThu)}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {getStatusBadge(car)}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openEditModal(car)}
                                                                className="text-orange-600 hover:text-orange-900"
                                                            >
                                                                Bearbeiten
                                                            </button>
                                                            {car.deleted === 1 ? (
                                                                <button
                                                                    onClick={() => confirmRestore(car)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Wiederherstellen
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => confirmDelete(car)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                >
                                                                    Löschen
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}

                                            {cars?.data?.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                                                        <svg className="mx-auto w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                                        </svg>
                                                        <h3 className="text-lg font-medium mb-2">Keine Autos gefunden</h3>
                                                        <p>Versuche deine Suchkriterien anzupassen.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {cars?.links && (
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="text-sm text-gray-700">
                                        Zeige {cars.from} bis {cars.to} von {cars.total} Einträgen
                                    </div>
                                    <div className="flex space-x-1">
                                        {cars.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (link.url && !link.active) {
                                                        const url = new URL(link.url);
                                                        const page = url.searchParams.get('page');
                                                        router.get('/autos', {
                                                            search: searchTerm,
                                                            sort: activeSort,
                                                            status: activeTab,
                                                            brand: activeBrand,
                                                            page: page
                                                        });
                                                    }
                                                }}
                                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                    link.active
                                                        ? 'bg-orange-600 text-white'
                                                        : link.url
                                                        ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                        : 'text-gray-400 bg-white border border-gray-300 cursor-not-allowed'
                                                }`}
                                                disabled={!link.url || link.active}
                                            >
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && selectedCar && (
                <div
                    className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 ${
                        isEditModalClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
                    }`}
                    onClick={closeEditModal}
                >
                    <div
                        className={`relative w-11/12 max-w-4xl max-h-[90vh] shadow-lg rounded-lg bg-white flex flex-col ${
                            isEditModalClosing ? 'modal-content-exit' : 'modal-content-enter'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex-shrink-0">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedCar.title || 'Kein Titel'}</h2>
                                    <p className="text-gray-600">{selectedCar.model} • {selectedCar.year}</p>
                                    <p className="text-sm text-gray-500">Vermieter: {selectedCar.renter?.user?.name || 'Unbekannt'}</p>
                                </div>
                                <button
                                    onClick={closeEditModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto px-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                                {/* Bilder Section */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Bilder ({selectedCar.images?.length || 0}/9)</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {Array.from({ length: 9 }, (_, index) => {
                                            const image = selectedCar.images?.[index];
                                            return (
                                                <div key={index} className="relative group">
                                                    <div className="w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200" style={{ aspectRatio: '1/1.25' }}>
                                                        {image ? (
                                                            <>
                                                                <img
                                                                    src={`https://drivable.app/storage/${image.image_path}`}
                                                                    alt={`Bild ${index + 1}`}
                                                                    className="w-full h-full object-contain bg-gray-50"
                                                                />
                                                                <button
                                                                    onClick={() => deleteImage(image.id)}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(!selectedCar.images || selectedCar.images.length === 0) && (
                                        <div className="text-center mt-6 text-gray-500">
                                            <p className="text-sm">Keine Bilder vorhanden</p>
                                            <p className="text-xs text-gray-400 mt-1">Maximum 9 Bilder (1:1.25 Format)</p>
                                        </div>
                                    )}
                                </div>

                                {/* Form Section */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Fahrzeugdaten</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Titel</label>
                                            <input
                                                type="text"
                                                value={editData.title}
                                                onChange={(e) => setEditData({...editData, title: e.target.value})}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Marke</label>
                                                <select
                                                    value={editData.brand}
                                                    onChange={(e) => setEditData({...editData, brand: e.target.value})}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                >
                                                    <option value="">Wählen...</option>
                                                    {brands?.map(brand => (
                                                        <option key={brand.id} value={brand.id}>{brand.brandName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Modell</label>
                                                <input
                                                    type="text"
                                                    value={editData.model}
                                                    onChange={(e) => setEditData({...editData, model: e.target.value})}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Baujahr</label>
                                                <input
                                                    type="number"
                                                    value={editData.year}
                                                    onChange={(e) => setEditData({...editData, year: e.target.value})}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Kraftstoff</label>
                                                <select
                                                    value={editData.fuelType}
                                                    onChange={(e) => setEditData({...editData, fuelType: e.target.value})}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                >
                                                    <option value="">Wählen...</option>
                                                    <option value="1">Benzin</option>
                                                    <option value="2">Hybrid</option>
                                                    <option value="3">Diesel</option>
                                                    <option value="4">Elektro</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Getriebe</label>
                                                <select
                                                    value={editData.gearType}
                                                    onChange={(e) => setEditData({...editData, gearType: e.target.value})}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                >
                                                    <option value="">Wählen...</option>
                                                    <option value="Manuell">Manuell</option>
                                                    <option value="Automatik">Automatik</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Motortyp</label>
                                            <select
                                                value={editData.engineType}
                                                onChange={(e) => setEditData({...editData, engineType: e.target.value})}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                <option value="">Wählen...</option>
                                                {engineTypes?.map(engineType => (
                                                    <option key={engineType.id} value={engineType.id}>{engineType.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                                            <textarea
                                                rows="3"
                                                value={editData.description}
                                                onChange={(e) => setEditData({...editData, description: e.target.value})}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>

                                        {/* Preise */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Preise</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Mo-Do (€/Tag)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editData.dailyRentMoThu}
                                                        onChange={(e) => setEditData({...editData, dailyRentMoThu: e.target.value})}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Fr-So (€/Tag)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editData.dailyRentFriSun}
                                                        onChange={(e) => setEditData({...editData, dailyRentFriSun: e.target.value})}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Kaution (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editData.depositAmount}
                                                        onChange={(e) => setEditData({...editData, depositAmount: e.target.value})}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                {/* TODO: Add verified checkbox when field exists in database */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={saveCar}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                            >
                                {isSaving ? 'Speichern...' : 'Speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showNotificationModal && (
                <div
                    className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 ${
                        isNotificationModalClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
                    }`}
                    onClick={closeNotificationModal}
                >
                    <div
                        className={`relative max-w-md mx-auto bg-white rounded-lg shadow-lg ${
                            isNotificationModalClosing ? 'modal-content-exit' : 'modal-content-enter'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center">
                                {notificationData.type === 'success' ? (
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="ml-3">
                                    <h3 className="text-lg font-medium text-gray-900">{notificationData.title}</h3>
                                    <p className="mt-1 text-sm text-gray-500">{notificationData.message}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={closeNotificationModal}
                                    className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div
                    className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 ${
                        isConfirmModalClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
                    }`}
                    onClick={closeConfirmModal}
                >
                    <div
                        className={`relative max-w-md mx-auto bg-white rounded-lg shadow-lg ${
                            isConfirmModalClosing ? 'modal-content-exit' : 'modal-content-enter'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Aktion bestätigen</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Bist du sicher, dass du diese Aktion ausführen möchtest?
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={closeConfirmModal}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={() => {
                                        confirmAction();
                                        closeConfirmModal();
                                    }}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
                                >
                                    Bestätigen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
