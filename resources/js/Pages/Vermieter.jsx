import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, router} from '@inertiajs/react';
import {useState, useEffect, useRef} from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {Line, Bar} from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function Vermieter({
                                      vermieter,
                                      search,
                                      currentTab,
                                      currentSort,
                                      verifiedCount,
                                      stripeVerifiedCount,
                                      unverifiedCount,
                                      statistics,
                                      crossTabResults
                                  }) {
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [activeTab, setActiveTab] = useState(
        currentTab === 'stripe_verified' ? 'unverified' :
        currentTab || 'verified'
    );
    const [sortBy, setSortBy] = useState(currentSort || 'newest');
    const [selectedVermieter, setSelectedVermieter] = useState(null);
    const [showPowerUpModal, setShowPowerUpModal] = useState(false);
    const [powerUpData, setPowerUpData] = useState(null);
    const [powerUpActiveTab, setPowerUpActiveTab] = useState('statistiken');
    const [editData, setEditData] = useState({});
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' oder 'table'
    const [showAllBrands, setShowAllBrands] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [carSearchTerm, setCarSearchTerm] = useState('');
    const [carActiveTab, setCarActiveTab] = useState('active');
    const [carViewMode, setCarViewMode] = useState('cards'); // 'cards' oder 'table' für Fahrzeuge im Power-Up
    const [rentalViewMode, setRentalViewMode] = useState('cards'); // 'cards' oder 'table' für Mieten im Power-Up
    const [showCarEditModal, setShowCarEditModal] = useState(false);
    const [editingCar, setEditingCar] = useState(null);
    const [carEditData, setCarEditData] = useState({});
    const [showFullscreenSlider, setShowFullscreenSlider] = useState(false);
    const [fullscreenImages, setFullscreenImages] = useState([]);
    const [fullscreenCurrentIndex, setFullscreenCurrentIndex] = useState(0);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const showSuccess = (message, duration = 3000) => {
        setSuccessMessage(message);
        setShowSuccessPopup(true);
        setTimeout(() => {
            setShowSuccessPopup(false);
            setSuccessMessage('');
        }, duration);
    };
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [renterEditData, setRenterEditData] = useState({});
    const [isSavingRenter, setIsSavingRenter] = useState(false);
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone_number: ''
    });
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [companyDataExpanded, setCompanyDataExpanded] = useState(true);
    const [userDataExpanded, setUserDataExpanded] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationData, setNotificationData] = useState({type: 'success', title: '', message: ''});
    const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
    const [emailConfirmData, setEmailConfirmData] = useState(null);
    const [rentalSearchTerm, setRentalSearchTerm] = useState('');
    const [rentalStatusFilter, setRentalStatusFilter] = useState('all');
    const [rentalPaymentFilter, setRentalPaymentFilter] = useState('all');
    const [rentalShowAdvancedFilters, setRentalShowAdvancedFilters] = useState(false);
    const [chartData, setChartData] = useState(null);
    const [chartType, setChartType] = useState('line'); // 'line' oder 'bar'
    const [chats, setChats] = useState([]);
    const [showChatDetailsModal, setShowChatDetailsModal] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [showCensorModal, setShowCensorModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [censorReason, setCensorReason] = useState('');
    const [censorType, setCensorType] = useState('manual_review');
    const [showConfirmUncensor, setShowConfirmUncensor] = useState(false);
    const [messageToUncensor, setMessageToUncensor] = useState(null);

    // Chat Summary States
    const [chatSummary, setChatSummary] = useState(null);
    const [showChatSummaryModal, setShowChatSummaryModal] = useState(false);

    // Ref for messages container to auto-scroll to bottom
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when chat opens or messages change
    useEffect(() => {
        if (showChatDetailsModal && selectedChat && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
        }
    }, [showChatDetailsModal, selectedChat?.messages]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        router.get(route('vermieter'), {
            tab: tab,
            search: searchTerm,
            sort: sortBy,
            per_page: 30,
            limit: 30
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
        router.get(route('vermieter'), {
            tab: activeTab,
            search: searchTerm,
            sort: newSortBy,
            per_page: 30,
            limit: 30
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        router.get(route('vermieter'), {
            tab: activeTab,
            search: searchTerm,
            sort: sortBy,
            per_page: 30,
            limit: 30
        }, {
            preserveState: true
        });
    };

    const handleSearchBlur = () => {
        // Auto-search wenn sich der Suchbegriff geändert hat
        if (searchTerm !== search) {
            handleSearch();
        }
    };

    const openPowerUpModal = async (vermieter) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/vermieter/${vermieter.id}`);
            // Sichere Datenverarbeitung mit Fallback-Werten
            const safeStats = {
                total_rentals: response.data.stats?.total_rentals || 0,
                completed_rentals: response.data.stats?.completed_rentals || 0,
                active_rentals: response.data.stats?.active_rentals || 0,
                pending_requests: response.data.stats?.pending_requests || 0,
                total_revenue: response.data.stats?.total_revenue || 0
            };

            setPowerUpData({
                ...response.data,
                stats: safeStats,
                chatStats: response.data.chatStats || null,
                originalRentals: response.data.rentals || [] // Store original for client-side filtering
            });

            // Set chart data
            setChartData(response.data.chartData || null);

            // Set chat data
            setChats(response.data.chats || []);
            setPowerUpActiveTab('statistiken');
            setShowPowerUpModal(true);
            setSelectedVermieter(vermieter);

            // Initialize renter edit data
            setRenterEditData({
                company_name: response.data.renter.company_name || '',
                company_address_street: response.data.renter.company_address_street || '',
                company_address_city: response.data.renter.company_address_city || '',
                company_address_postcode: response.data.renter.company_address_postcode || '',
                longitude: response.data.renter.longitude || '',
                latitude: response.data.renter.latitude || '',
                companyDescription: response.data.renter.companyDescription || '',
                stripe_account_id: response.data.renter.stripe_account_id || '',
                allowCash: response.data.renter.allowCash || false,
                allowDigitalPayment: response.data.renter.allowDigitalPayment || false,
                isSmallBusinessOwner: response.data.renter.isSmallBusinessOwner || false,
                strikes: response.data.renter.strikes || 0,
                blockPayouts: response.data.renter.blockPayouts || false,
                note: response.data.renter.note || '',
                message: response.data.renter.message || ''
            });

            // Initialize user edit data
            setUserData({
                name: response.data.renter.user?.name || '',
                email: response.data.renter.user?.email || '',
                phone_number: response.data.renter.user?.phone_number || ''
            });
        } catch (error) {
            showNotification('error', 'Fehler beim Laden', 'Vermieter-Details konnten nicht geladen werden');
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = async (vermieter) => {
        setSelectedVermieter(vermieter);
        setEditData({
            company_name: vermieter.company_name || '',
            company_address_street: vermieter.company_address_street || '',
            company_address_city: vermieter.company_address_city || '',
            company_address_postcode: vermieter.company_address_postcode || '',
            longitude: vermieter.longitude || '',
            latitude: vermieter.latitude || '',
            companyDescription: vermieter.companyDescription || '',
            renterType: vermieter.renterType || 0,
            stripe_account_id: vermieter.stripe_account_id || '',
            allowCash: vermieter.allowCash || false,
            allowDigitalPayment: vermieter.allowDigitalPayment || false,
            isSmallBusinessOwner: vermieter.isSmallBusinessOwner || false,
            strikes: vermieter.strikes || 0,
            blockPayouts: vermieter.blockPayouts || false,
            note: vermieter.note || '',
            message: vermieter.message || ''
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.put(`/api/vermieter/${selectedVermieter.id}`, editData);

            setShowEditModal(false);

            // Update selectedVermieter with new data
            if (response.data.success && response.data.renter) {
                setSelectedVermieter(response.data.renter);
                showNotification('success', 'Erfolgreich gespeichert', 'Firmendaten wurden erfolgreich aktualisiert');
            }

            // Refresh vermieter list without full page reload
            const vermieterResponse = await axios.get('/api/vermieter');
            if (vermieterResponse.data) {
                // Update the main vermieter list but keep popup open
                window.location.reload = false; // Prevent reload
            }

        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showNotification('error', 'Fehler beim Speichern', 'Änderungen konnten nicht gespeichert werden');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = (vermieter) => {
        showConfirm({
            title: 'Vermieter verifizieren',
            message: `Möchten Sie "${vermieter.company_name || vermieter.user?.name || 'diesen Vermieter'}" wirklich verifizieren?`,
            type: 'verify',
            action: async () => {
                try {
                    const response = await axios.post(`/api/vermieter/${vermieter.id}/verify`);

                    if (response.data.success) {
                        router.reload();
                    }
                } catch (error) {
                    if (error.response?.data?.message) {
                        showNotification('error', 'Fehler bei Verifizierung', error.response.data.message);
                    } else {
                        showNotification('error', 'Fehler bei Verifizierung', 'Vermieter konnte nicht verifiziert werden');
                    }
                }
            }
        });
    };

    const handleUnverify = (vermieter) => {
        showConfirm({
            title: 'Vermieter entverifizieren',
            message: `Möchten Sie "${vermieter.company_name || vermieter.user?.name || 'diesen Vermieter'}" wirklich entverifizieren?`,
            type: 'unverify',
            action: async () => {
                try {
                    const response = await axios.post(`/api/vermieter/${vermieter.id}/unverify`);

                    if (response.data.success) {
                        router.reload();
                    }
                } catch (error) {
                    showNotification('error', 'Fehler bei Entverifizierung', 'Vermieter konnte nicht entverifiziert werden');
                }
            }
        });
    };


    const canVerify = (vermieter) => {
        return vermieter.stripe_account_id && vermieter.stripe_enabled && !vermieter.verified;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    const getProfileImageUrl = (vermieter) => {
        if (vermieter.profile_picture) {
            return `https://drivable.app/storage/${vermieter.profile_picture}`;
        }
        return null;
    };

    const getCarCount = (vermieter) => {
        return vermieter.cars?.length || 0;
    };

    const getActiveCarCount = (vermieter) => {
        return vermieter.cars?.filter(car => car.deleted !== 1)?.length || 0;
    };

    const getDeletedCarCount = (vermieter) => {
        return vermieter.cars?.filter(car => car.deleted === 1)?.length || 0;
    };

    const openFullscreenSlider = (images, currentIndex = 0) => {
        setFullscreenImages(images);
        setFullscreenCurrentIndex(currentIndex);
        setShowFullscreenSlider(true);
    };

    const closeFullscreenSlider = () => {
        setShowFullscreenSlider(false);
        setFullscreenImages([]);
        setFullscreenCurrentIndex(0);
    };

    const nextFullscreenImage = () => {
        setFullscreenCurrentIndex((prev) =>
            prev < fullscreenImages.length - 1 ? prev + 1 : prev
        );
    };

    const prevFullscreenImage = () => {
        setFullscreenCurrentIndex((prev) => prev > 0 ? prev - 1 : prev);
    };

    // Keyboard navigation for fullscreen slider
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (showFullscreenSlider) {
                if (e.key === 'ArrowLeft') {
                    prevFullscreenImage();
                } else if (e.key === 'ArrowRight') {
                    nextFullscreenImage();
                } else if (e.key === 'Escape') {
                    closeFullscreenSlider();
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [showFullscreenSlider, fullscreenCurrentIndex, fullscreenImages.length]);

    const saveCar = async () => {
        setIsSaving(true);

        try {
            const response = await axios.put(`/api/cars/${editingCar.id}`, carEditData);

            if (response.data.success) {
                // Show success popup
                showSuccess('Auto erfolgreich gespeichert');

                // Update the car data in powerUpData
                if (powerUpData && powerUpData.renter && powerUpData.renter.cars) {
                    const updatedCar = {...editingCar, ...carEditData};
                    const updatedCars = powerUpData.renter.cars.map(car =>
                        car.id === editingCar.id ? updatedCar : car
                    );
                    setPowerUpData({
                        ...powerUpData,
                        renter: {
                            ...powerUpData.renter,
                            cars: updatedCars
                        }
                    });

                    // Update editingCar with the new data
                    setEditingCar(updatedCar);
                }

                // Success message is handled by showSuccess function
            }
        } catch (error) {
            console.error('Error saving car:', error);
            // TODO: Add error handling/popup if needed
        }

        setIsSaving(false);
    };

    const deleteCarImage = async (imageId) => {
        try {
            const response = await axios.delete(`/api/cars/${editingCar.id}/images/${imageId}`);

            if (response.data.success) {
                // Update local car data with the reordered images
                const updatedCar = response.data.car;

                // Update editingCar
                setEditingCar(updatedCar);

                // Update powerUpData
                if (powerUpData && powerUpData.renter && powerUpData.renter.cars) {
                    const updatedCars = powerUpData.renter.cars.map(car =>
                        car.id === editingCar.id ? updatedCar : car
                    );
                    setPowerUpData({
                        ...powerUpData,
                        renter: {
                            ...powerUpData.renter,
                            cars: updatedCars
                        }
                    });
                }

                // Show success popup briefly
                setShowSuccessPopup(true);
                setTimeout(() => setShowSuccessPopup(false), 2000);
            }
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const softDeleteCar = async (car) => {
        try {
            const response = await axios.patch(`/api/cars/${car.id}/soft-delete`);

            if (response.data.success) {
                // Update powerUpData with the updated car
                setPowerUpData(prev => ({
                    ...prev,
                    renter: {
                        ...prev.renter,
                        cars: prev.renter.cars.map(c =>
                            c.id === car.id ? response.data.car : c
                        )
                    }
                }));

                // Show success popup briefly
                showSuccess('Auto erfolgreich gelöscht', 2000);
            }
        } catch (error) {
            console.error('Fehler beim Löschen des Autos:', error);
            showNotification('error', 'Fehler beim Löschen', 'Auto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.');
        }
    };

    const restoreCar = async (car) => {
        try {
            const response = await axios.patch(`/api/cars/${car.id}/restore`);

            if (response.data.success) {
                // Update powerUpData with the updated car
                setPowerUpData(prev => ({
                    ...prev,
                    renter: {
                        ...prev.renter,
                        cars: prev.renter.cars.map(c =>
                            c.id === car.id ? response.data.car : c
                        )
                    }
                }));

                // Show success popup briefly
                showSuccess('Auto erfolgreich wiederhergestellt', 2000);
            }
        } catch (error) {
            console.error('Fehler beim Wiederherstellen des Autos:', error);
            showNotification('error', 'Fehler beim Wiederherstellen', 'Auto konnte nicht wiederhergestellt werden. Bitte versuchen Sie es erneut.');
        }
    };

    const refreshRentals = async () => {
        if (!powerUpData?.renter?.id) return;

        try {
            const response = await axios.get(`/api/vermieter/${powerUpData.renter.id}`);

            if (response.data.rentals) {
                // Update rentals data - store original unfiltered data
                setPowerUpData(prev => ({
                    ...prev,
                    rentals: response.data.rentals,
                    originalRentals: response.data.rentals, // Keep original for filtering
                    rentalStats: response.data.rentalStats
                }));

                // Show success popup briefly
                showSuccess('Mieten erfolgreich aktualisiert', 2000);
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Mieten:', error);
            showNotification('error', 'Fehler beim Aktualisieren', 'Mieten konnten nicht aktualisiert werden. Bitte versuchen Sie es erneut.');
        }
    };

    // Client-side filtering function
    const getFilteredRentals = () => {
        if (!powerUpData?.originalRentals && !powerUpData?.rentals) return [];

        const rentalsToFilter = powerUpData.originalRentals || powerUpData.rentals;

        return rentalsToFilter.filter(rental => {
            // Status filter
            if (rentalStatusFilter !== 'all') {
                const statusMatch = {
                    'requested': rental.status === 0,
                    'active': rental.status === 5,
                    'completed': rental.status === 6,
                    'cancelled': [1, 3, 7, 8].includes(rental.status)
                };

                if (!statusMatch[rentalStatusFilter]) return false;
            }

            // Payment filter
            if (rentalPaymentFilter !== 'all') {
                const paymentMatch = {
                    'paid': rental.payment_status === 'Bezahlt',
                    'pending': rental.payment_status === 'Ausstehend',
                    'partial': rental.payment_status === 'Teilweise bezahlt',
                    'failed': rental.payment_status === 'Fehlgeschlagen',
                    'processing': rental.payment_status === 'In Bearbeitung'
                };

                if (!paymentMatch[rentalPaymentFilter]) return false;
            }

            // Search filter
            if (rentalSearchTerm) {
                const searchTerm = rentalSearchTerm.toLowerCase();
                const matchesCarTitle = rental.car?.title?.toLowerCase().includes(searchTerm);
                const matchesCarModel = rental.car?.model?.toLowerCase().includes(searchTerm);
                const matchesUserName = rental.user?.name?.toLowerCase().includes(searchTerm);
                const matchesUserEmail = rental.user?.email?.toLowerCase().includes(searchTerm);

                if (!matchesCarTitle && !matchesCarModel && !matchesUserName && !matchesUserEmail) {
                    return false;
                }
            }

            return true;
        });
    };

    const applyRentalFilters = () => {
        // Filters are now applied in real-time via getFilteredRentals()
        // This function is kept for search input enter key
    };

    const clearRentalFilters = () => {
        setRentalSearchTerm('');
        setRentalStatusFilter('all');
        setRentalPaymentFilter('all');
        setRentalShowAdvancedFilters(false);
    };

    const saveRenter = async () => {
        setIsSavingRenter(true);

        try {
            const response = await axios.put(`/api/vermieter/${powerUpData.renter.id}`, renterEditData);

            if (response.data.success || response.data.renter) {
                // Show success popup
                showSuccess('Vermieter erfolgreich gespeichert');

                // Update powerUpData with new renter data
                setPowerUpData({
                    ...powerUpData,
                    renter: response.data.renter || {...powerUpData.renter, ...renterEditData}
                });
            }
        } catch (error) {
            console.error('Error saving renter:', error);
            // TODO: Add error handling/popup if needed
        }

        setIsSavingRenter(false);
    };

    const showNotification = (type, title, message) => {
        setNotificationData({type, title, message});
        setShowNotificationModal(true);
    };

    const showEmailConfirm = (paymentLinkId) => {
        setEmailConfirmData(paymentLinkId);
        setShowEmailConfirmModal(true);
    };

    const sendPaymentLinkEmail = async (paymentLinkId) => {
        try {
            const response = await axios.post(`/api/vermieter/${selectedVermieter?.id}/stripe/payment-link/${paymentLinkId}/send-email`);

            if (response.data.success) {
                showNotification('success', 'E-Mail gesendet', 'E-Mail wurde erfolgreich an den Vermieter gesendet!');
                // No reload needed - just show success
            } else {
                showNotification('error', 'Fehler beim E-Mail senden', response.data.message);
            }
        } catch (error) {
            showNotification('error', 'Fehler beim E-Mail senden', error.response?.data?.message || error.message);
        }
    };

    const saveUserData = async () => {
        setIsSavingUser(true);

        try {
            const response = await axios.put(`/api/vermieter/${selectedVermieter.id}/user`, userData);

            if (response.data.success) {
                showNotification('success', 'Erfolgreich gespeichert', 'Benutzerdaten wurden erfolgreich aktualisiert');

                // Update selectedVermieter data locally
                if (selectedVermieter.user) {
                    selectedVermieter.user.name = userData.name;
                    selectedVermieter.user.email = userData.email;
                    selectedVermieter.user.phone_number = userData.phone_number;
                }
            } else {
                showNotification('error', 'Fehler beim Speichern', response.data.message);
            }
        } catch (error) {
            showNotification('error', 'Fehler beim Speichern', error.response?.data?.message || error.message);
        } finally {
            setIsSavingUser(false);
        }
    };

    const selectAddressSuggestion = (suggestion) => {
        setRenterEditData({
            ...renterEditData,
            latitude: parseFloat(suggestion.lat),
            longitude: parseFloat(suggestion.lon),
            company_address_street: suggestion.address?.road || suggestion.address?.house_number ?
                `${suggestion.address?.road || ''} ${suggestion.address?.house_number || ''}`.trim() :
                renterEditData.company_address_street,
            company_address_postcode: suggestion.address?.postcode || renterEditData.company_address_postcode,
            company_address_city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.municipality || renterEditData.company_address_city
        });

        setShowAddressSuggestions(false);
        setAddressSuggestions([]);

        // Show success feedback
        showSuccess('Koordinaten erfolgreich gesetzt', 2000);
    };

    const geocodeAddress = async (address) => {
        if (!address || address.trim() === '') return;

        try {
            // First try exact search
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            let data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                setRenterEditData({
                    ...renterEditData,
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon)
                });

                // Show success feedback
                setShowSuccessPopup(true);
                setTimeout(() => setShowSuccessPopup(false), 2000);
            } else {
                // If no exact match, search for suggestions
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&addressdetails=1`);
                data = await response.json();

                if (data && data.length > 0) {
                    setAddressSuggestions(data);
                    setShowAddressSuggestions(true);
                } else {
                    // Try broader search with partial terms
                    const addressParts = address.split(' ').filter(part => part.length > 2);
                    if (addressParts.length > 0) {
                        const broadSearch = addressParts.join(' ');
                        response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(broadSearch)}&limit=5&addressdetails=1`);
                        data = await response.json();

                        if (data && data.length > 0) {
                            setAddressSuggestions(data);
                            setShowAddressSuggestions(true);
                        } else {
                            showNotification('error', 'Keine Adresse gefunden', 'Keine Adressvorschläge gefunden. Bitte überprüfen Sie die Eingabe.');
                        }
                    } else {
                        showNotification('error', 'Keine Koordinaten', 'Keine Koordinaten für diese Adresse gefunden');
                    }
                }
            }
        } catch (error) {
            console.error('Fehler beim Geocoding:', error);
            showNotification('error', 'Fehler bei Adresssuche', 'Adresse konnte nicht gefunden werden. Bitte versuchen Sie es erneut.');
        }
    };

    const getBrandIcon = (brand) => {
        // Now we get the iconName directly from the backend
        return `https://drivable.app/images/brands/${brand.iconName}.webp`;
    };

    const getStatusLabel = (status) => {
        const statusLabels = {
            0: 'Angefragt',
            1: 'Storniert',
            2: 'Akzeptiert',
            3: 'Abgelehnt',
            4: 'Bezahlt',
            5: 'Aktiv',
            6: 'Abgeschlossen',
            7: 'Von Vermieter storniert',
            8: 'Von Mieter storniert',
            9: 'Rückerstattet',
            10: 'Bewertet'
        };
        return statusLabels[status] || 'Unbekannt';
    };

    const getStatusColor = (status) => {
        const statusColors = {
            0: 'bg-yellow-100 text-yellow-800',
            1: 'bg-red-100 text-red-800',
            2: 'bg-blue-100 text-blue-800',
            3: 'bg-red-100 text-red-800',
            4: 'bg-green-100 text-green-800',
            5: 'bg-green-100 text-green-800',
            6: 'bg-gray-100 text-gray-800',
            7: 'bg-red-100 text-red-800',
            8: 'bg-red-100 text-red-800',
            9: 'bg-purple-100 text-purple-800',
            10: 'bg-blue-100 text-blue-800'
        };
        return statusColors[status] || 'bg-gray-100 text-gray-800';
    };

    // Sichere toFixed Funktion
    const safeToFixed = (value, decimals = 2) => {
        if (value === null || value === undefined || isNaN(value)) {
            return (0).toFixed(decimals);
        }
        const num = parseFloat(value);
        if (isNaN(num)) {
            return (0).toFixed(decimals);
        }
        return num.toFixed(decimals);
    };

    const formatPrice = (price) => {
        return `€${safeToFixed(price, 2)}`;
    };

    const renderChart = () => {
        if (!chartData || !chartData.months || chartData.months.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>📊 Keine Chart-Daten verfügbar</p>
                </div>
            );
        }

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Mietanfragen Verlauf (Letzten 12 Monate)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.datasetIndex === 2) {
                                return `${context.dataset.label}: €${context.parsed.y.toFixed(2)}`;
                            }
                            return `${context.dataset.label}: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Monat'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Anzahl Anfragen'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Umsatz (€)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        };

        const chartDataConfig = {
            labels: chartData.months,
            datasets: [
                {
                    label: 'Anfragen gesamt',
                    data: chartData.requests,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: chartType === 'line' ? true : false
                },
                {
                    label: 'Abgeschlossen',
                    data: chartData.completed,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: chartType === 'line' ? true : false
                },
                {
                    label: 'Umsatz (€)',
                    data: chartData.revenue,
                    borderColor: 'rgb(245, 101, 101)',
                    backgroundColor: 'rgba(245, 101, 101, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    fill: chartType === 'line' ? true : false
                }
            ]
        };

        return (
            <div className="bg-white p-6 rounded-lg border w-full">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Verlauf der letzten 12 Monate</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setChartType('line')}
                            className={`px-3 py-1 rounded-md text-sm ${chartType === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            Linie
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`px-3 py-1 rounded-md text-sm ${chartType === 'bar' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            Balken
                        </button>
                    </div>
                </div>
                <div className="w-full" style={{height: '400px'}}>
                    {chartType === 'line' ? (
                        <Line data={chartDataConfig} options={chartOptions}/>
                    ) : (
                        <Bar data={chartDataConfig} options={chartOptions}/>
                    )}
                </div>

            </div>
        );
    };

    const CarImageGallery = ({images, carName, onImageClick}) => {
        const [currentImage, setCurrentImage] = useState(0);

        if (!images || images.length === 0) {
            return (
                <div className="w-full h-48 bg-gray-300 rounded-lg flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5m14 14H5"/>
                    </svg>
                </div>
            );
        }

        return (
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                <img
                    src={`https://drivable.app/storage/${images[currentImage].image_path}`}
                    alt={carName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onImageClick && onImageClick(images, currentImage)}
                />

                {images.length > 1 && (
                    <>
                        {/* Previous Button */}
                        {currentImage > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImage(currentImage - 1);
                                }}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70"
                            >
                                ‹
                            </button>
                        )}

                        {/* Next Button */}
                        {currentImage < images.length - 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImage(currentImage + 1);
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70"
                            >
                                ›
                            </button>
                        )}

                        {/* Dots */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentImage(index);
                                    }}
                                    className={`w-2 h-2 rounded-full ${
                                        index === currentImage ? 'bg-white' : 'bg-white bg-opacity-50'
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const openChatDetailsModal = (chat) => {
        setSelectedChat(chat);
        setShowChatDetailsModal(true);
    };

    const closeChatDetailsModal = () => {
        setShowChatDetailsModal(false);
        setSelectedChat(null);
    };

    const confirmUncensorMessage = (message) => {
        setMessageToUncensor(message);
        setShowConfirmUncensor(true);
    };

    const uncensorMessage = async () => {
        if (!messageToUncensor) return;

        try {
            const response = await axios.post(`/api/vermieter/messages/${messageToUncensor.id}/uncensor`);

            if (response.data.success) {
                showSuccess('✓ Nachricht entzensiert und freigegeben', 1000);

                // Update the message in chats and decrease censored count
                setChats(prevChats =>
                    prevChats.map(chat =>
                        chat.id === messageToUncensor.chat_id
                            ? {
                                ...chat,
                                messages: chat.messages.map(msg =>
                                    msg.id === messageToUncensor.id ? response.data.updated_message : msg
                                ),
                                censored_messages_count: Math.max(0, chat.censored_messages_count - 1)
                            }
                            : chat
                    )
                );

                // Update selected chat if it's open
                if (selectedChat && selectedChat.id === messageToUncensor.chat_id) {
                    setSelectedChat(prevChat => ({
                        ...prevChat,
                        messages: prevChat.messages.map(msg =>
                            msg.id === messageToUncensor.id ? response.data.updated_message : msg
                        ),
                        censored_messages_count: Math.max(0, prevChat.censored_messages_count - 1)
                    }));
                }
            }
        } catch (error) {
            showNotification('error', 'Fehler beim Entzensieren', error.response?.data?.message || error.message);
        } finally {
            setShowConfirmUncensor(false);
            setMessageToUncensor(null);
        }
    };

    const openCensorModal = (message) => {
        setSelectedMessage(message);
        setCensorReason('');
        setCensorType('manual_review');
        setShowCensorModal(true);
    };

    const censorMessage = async () => {
        try {
            const response = await axios.post(`/api/vermieter/messages/${selectedMessage.id}/censor`, {
                violation_type: censorType,
                reason: censorReason
            });

            if (response.data.success) {
                showSuccess('Nachricht wurde erfolgreich zensiert');

                // Update the message in chats
                setChats(prevChats =>
                    prevChats.map(chat =>
                        chat.id === selectedMessage.chat_id
                            ? {
                                ...chat,
                                messages: chat.messages.map(msg =>
                                    msg.id === selectedMessage.id ? response.data.updated_message : msg
                                )
                            }
                            : chat
                    )
                );

                // Update selected chat if it's open
                if (selectedChat && selectedChat.id === selectedMessage.chat_id) {
                    setSelectedChat(prevChat => ({
                        ...prevChat,
                        messages: prevChat.messages.map(msg =>
                            msg.id === selectedMessage.id ? response.data.updated_message : msg
                        )
                    }));
                }

                setShowCensorModal(false);
                setSelectedMessage(null);
            }
        } catch (error) {
            showNotification('error', 'Fehler beim Zensieren', error.response?.data?.message || error.message);
        }
    };

    const getViolationType = (violationType) => {
        const types = {
            'ai_detected': 'KI Erkannt',
            'manual_review': 'Manuelle Prüfung',
            'contact_info': 'Kontaktdaten',
            'inappropriate': 'Unangemessen'
        };
        return types[violationType] || violationType;
    };

    const generateChatSummary = async (renter) => {
        try {
            setLoading(true);
            const response = await axios.post(`/api/vermieter/${renter.id}/chats/summarize`);

            if (response.data.success) {
                setChatSummary(response.data.summary);
                setShowChatSummaryModal(true);
                showSuccess('🤖 Vermieter-Analyse erfolgreich erstellt!');
            }
        } catch (error) {
            showNotification('error', 'Fehler bei KI-Analyse', error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const filterCars = (cars) => {
        if (!cars) return [];

        let filtered = cars.filter(car => {
            if (carActiveTab === 'active') return car.deleted !== 1;
            if (carActiveTab === 'deleted') return car.deleted === 1;
            return true;
        });

        if (carSearchTerm) {
            filtered = filtered.filter(car =>
                car.brand?.toLowerCase().includes(carSearchTerm.toLowerCase()) ||
                car.model?.toLowerCase().includes(carSearchTerm.toLowerCase()) ||
                `${car.brand} ${car.model}`.toLowerCase().includes(carSearchTerm.toLowerCase())
            );
        }

        return filtered;
    };

    const openCarEditModal = (car) => {
        setEditingCar(car);
        setCarEditData({
            title: car.title || '',
            brand: car.brand || '',
            model: car.model || '',
            year: car.year || '',
            fuelType: car.fuelType || '',
            engineType: car.engineType || '',
            gearType: car.gearType || '',
            description: car.description || '',
            dailyRentMoThu: car.dailyRentMoThu || '',
            dailyRentFriSun: car.dailyRentFriSun || '',
            weekendRent: car.weekendRent || '',
            weeklyRent: car.weeklyRent || '',
            hourRent: car.hourRent || '',
            depositAmount: car.depositAmount || ''
        });
        setShowCarEditModal(true);
    };


    const showConfirm = (action) => {
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const handleConfirm = async () => {
        if (confirmAction) {
            await confirmAction.action();
        }
        setShowConfirmModal(false);
        setConfirmAction(null);
    };

    const handleCancel = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Vermieter Verwaltung
                </h2>
            }
        >
            <Head title="Vermieter"/>

            <div className="py-6">
                <div className="mx-auto w-full sm:w-[95%] lg:w-[85%] xl:w-[80%] 2xl:w-[75%] max-w-none px-4 sm:px-6 lg:px-8">
                    {/* Statistics Dashboard */}
                    {statistics && (
                        <div className="mb-6 space-y-4">
                            {/* Vermieter & Fahrzeuge Statistiken */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-blue-600 mb-1">{statistics.renters?.verified || 0}</p>
                                        <p className="text-sm font-medium text-gray-500">Verifizierte Vermieter</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-red-600 mb-1">{statistics.renters?.unverified || 0}</p>
                                        <p className="text-sm font-medium text-gray-500">Nicht Verifizierte</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-green-600 mb-1">{statistics.cars?.verified || 0}</p>
                                        <p className="text-sm font-medium text-gray-500">Verifizierte Fahrzeuge</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-orange-500 mb-1">{statistics.cars?.total || 0}</p>
                                        <p className="text-sm font-medium text-gray-500">Gesamt Fahrzeuge</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-gray-900 mb-1">{statistics.cars?.deleted || 0}</p>
                                        <p className="text-sm font-medium text-gray-500">Gelöschte Autos</p>
                                    </div>
                                </div>
                            </div>

                            {/* Durchschnittspreise */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Mo-Do</p>
                                        <p className="text-xl font-bold ">{formatPrice(statistics.averagePrices?.monday_thursday)}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Fr-So</p>
                                        <p className="text-xl font-bold ">{formatPrice(statistics.averagePrices?.friday_sunday)}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Wochenende</p>
                                        <p className="text-xl font-bold">{formatPrice(statistics.averagePrices?.weekend)}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Wöchentlich</p>
                                        <p className="text-xl font-bold ">{formatPrice(statistics.averagePrices?.weekly)}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Gesamt Ø</p>
                                        <p className="text-xl font-bold ">{formatPrice(statistics.averagePrices?.total_average)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Top Marken */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Top Marken</h4>
                                    {statistics.topBrands?.length > 10 && (
                                        <button
                                            onClick={() => setShowAllBrands(!showAllBrands)}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            {showAllBrands ? 'Weniger anzeigen' : `Alle ${statistics.topBrands.length} anzeigen`}
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                                    {(showAllBrands ? statistics.topBrands : statistics.topBrands?.slice(0, 10))?.map((brand, index) => (
                                        <div key={index}
                                             className="text-center bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                                            <div
                                                className="h-8 w-8 mx-auto mb-2 flex items-center justify-center relative">
                                                <img
                                                    src={getBrandIcon(brand)}
                                                    alt={brand.brand}
                                                    className="h-8 w-8 object-contain absolute inset-0"
                                                    onError={(e) => {
                                                        console.log(`Failed to load brand icon: ${e.target.src} for brand: ${brand.brand}`);
                                                        // Hide the broken image and show fallback
                                                        e.target.style.display = 'none';
                                                        const fallback = e.target.parentElement.querySelector('.fallback-icon');
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                    onLoad={(e) => {
                                                        console.log(`Successfully loaded brand icon: ${e.target.src} for brand: ${brand.brand}`);
                                                        // Hide fallback when image loads successfully
                                                        const fallback = e.target.parentElement.querySelector('.fallback-icon');
                                                        if (fallback) fallback.style.display = 'none';
                                                    }}
                                                />
                                                <div
                                                    className="fallback-icon text-2xl absolute inset-0 flex items-center justify-center">🚗
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 truncate"
                                               title={brand.brand}>
                                                {brand.brand}
                                            </p>
                                            <p className="text-xs text-gray-600">{brand.count} Autos</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white shadow-sm sm:rounded-lg">
                        <div className="p-5">
                            {/* Header mit Suche und View Toggle */}
                            <div
                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Vermieter Übersicht
                                </h3>

                                <div
                                    className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-stretch sm:items-center">
                                    {/* Sortierung */}
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                            className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            <option value="newest">Neueste zuerst</option>
                                            <option value="oldest">Älteste zuerst</option>
                                            <option value="most_cars">Meiste Autos</option>
                                            <option value="most_rentals">Meiste Mieten</option>
                                            <option value="most_revenue">Höchster Umsatz</option>
                                            <option value="most_active">Meiste aktive Mieten</option>
                                            <option value="alphabetical">Alphabetisch</option>
                                        </select>
                                        <div
                                            className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* View Toggle */}
                                    <div className="flex rounded-lg border border-gray-300 bg-gray-100 p-1">
                                        <button
                                            onClick={() => setViewMode('cards')}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                viewMode === 'cards'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M19 11H5m14-7H5m14 14H5"/>
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
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M3 10h18M3 6h18m-9 8h9"/>
                                                </svg>
                                                Tabelle
                                            </div>
                                        </button>
                                    </div>

                                    {/* Suche */}
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Suche nach Name, Firma oder E-Mail..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onBlur={handleSearchBlur}
                                            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                        >
                                            Suchen
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 mb-6">
                                <nav className="-mb-px flex space-x-8">
                                    <button
                                        onClick={() => handleTabChange('unverified')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'unverified'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Nicht Verifiziert ({unverifiedCount + stripeVerifiedCount})
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('verified')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === 'verified'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Verifiziert ({verifiedCount})
                                    </button>
                                </nav>
                            </div>

                            {/* Cross-Tab Suchergebnisse */}
                            {crossTabResults && searchTerm && (
                                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" fill="currentColor"
                                                 viewBox="0 0 20 20">
                                                <path fillRule="evenodd"
                                                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-blue-800">
                                                Weitere Ergebnisse für "{searchTerm}" gefunden:
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {crossTabResults.map((result, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleTabChange(result.tab)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded-md transition-colors"
                                                    >
                                                        {result.count} bei {result.tabLabel}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Vermieter Content - Cards oder Table */}
                            {viewMode === 'cards' ? (
                                /* Karten-Ansicht */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {vermieter?.data?.length === 0 ? (
                                        <div
                                            className="col-span-full flex flex-col items-center justify-center py-12  text-gray-500">
                                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none"
                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                                            </svg>
                                            <p className="text-lg font-medium">Keine Vermieter gefunden</p>
                                            <p className="text-sm">Versuchen Sie eine andere Suche oder wechseln Sie den
                                                Tab</p>
                                        </div>
                                    ) : (
                                        vermieter?.data?.map((vermieter) => (
                                            <div
                                                key={vermieter.id}
                                                className={`rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-col h-full ${
                                                    vermieter.verified
                                                        ? 'bg-white border-gray-200'
                                                        : !vermieter.verified && vermieter.stripe_enabled && vermieter.stripe_account_id
                                                            ? 'bg-green-100 border-green-300'
                                                            : 'bg-white border-gray-200'
                                                }`}
                                                onClick={() => openPowerUpModal(vermieter)}
                                            >
                                                <div className="p-4 flex flex-col flex-1 mt-1">
                                                    {/* Header mit Profilbild */}
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="relative flex-shrink-0">
                                                            {getProfileImageUrl(vermieter) ? (
                                                                <img
                                                                    src={getProfileImageUrl(vermieter)}
                                                                    alt={vermieter.user?.name}
                                                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                                    {vermieter.user?.name?.charAt(0)?.toUpperCase() || 'V'}
                                                                </div>
                                                            )}
                                                            {/* Status Badge */}
                                                            <div
                                                                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                                                                    vermieter.verified
                                                                        ? 'bg-green-500'
                                                                        : vermieter.stripe_account_id && vermieter.stripe_enabled
                                                                            ? 'bg-green-600'
                                                                            : 'bg-gray-400'
                                                                }`}>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 -mb-2">
                                                            <h3 className=" font-semibold text-gray-900 truncate">
                                                                {vermieter.company_name || vermieter.user?.name || 'N/A'}  ({vermieter.user?.name})
                                                            </h3>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {vermieter.user?.email || 'N/A'}
                                                            </p>
                                                            <div className="text-sm text-gray-600">
                                                                <div className=" font-semibold">{getActiveCarCount(vermieter) || 0} Fahrzeug/e </div>
                                                            </div>

                                                        </div>
                                                    </div>

                                                    {/* Created At Datum unten rechts */}
                                                    <div className="flex justify-end -mt-4">
                                                        <span className="text-xs text-gray-400">
                                                            {formatDate(vermieter.created_at)}
                                                        </span>
                                                    </div>

                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Vermieter
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Firma
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Autos
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Registriert
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Aktionen
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {vermieter?.data?.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                        Keine Vermieter gefunden
                                                    </td>
                                                </tr>
                                            ) : (
                                                vermieter?.data?.map((vermieter) => (
                                                    <tr key={vermieter.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                {getProfileImageUrl(vermieter) ? (
                                                                    <img
                                                                        src={getProfileImageUrl(vermieter)}
                                                                        alt={vermieter.user?.name}
                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                                        {vermieter.user?.name?.charAt(0)?.toUpperCase() || 'V'}
                                                                    </div>
                                                                )}
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {vermieter.user?.name || 'N/A'}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {vermieter.user?.email || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {vermieter.company_name || 'Keine Firma'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {getCarCount(vermieter)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                        vermieter.verified
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : vermieter.stripe_account_id && vermieter.stripe_enabled
                                                                                ? 'bg-green-200 text-green-900'
                                                                                : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {vermieter.verified
                                                                        ? 'Verifiziert'
                                                                        : vermieter.stripe_account_id && vermieter.stripe_enabled
                                                                            ? 'Stripe Verifiziert'
                                                                            : 'Nicht verifiziert'}
                                                                </span>
                                                                {vermieter.strikes > 0 && (
                                                                    <span
                                                                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                        {vermieter.strikes} Strike{vermieter.strikes > 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(vermieter.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => openPowerUpModal(vermieter)}
                                                                    className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                                                                    title="Details anzeigen"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none"
                                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth={2}
                                                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                                    </svg>
                                                                </button>

                                                                {canVerify(vermieter) && (
                                                                    <button
                                                                        onClick={() => handleVerify(vermieter)}
                                                                        className="text-green-600 hover:text-green-900 px-3 py-1 text-xs font-medium border border-green-300 rounded hover:bg-green-50"
                                                                        title="Verifizieren"
                                                                    >
                                                                        Verifizieren
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden space-y-4">
                                        {vermieter?.data?.length === 0 ? (
                                            <div className="text-center py-12 text-gray-500">
                                                <svg className="w-12 h-12 text-gray-400 mb-4 mx-auto" fill="none"
                                                     stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                                <p className="text-lg font-medium">Keine Vermieter gefunden</p>
                                            </div>
                                        ) : (
                                            vermieter?.data?.map((vermieter) => (
                                                <div key={vermieter.id}
                                                     className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center space-x-3">
                                                            {getProfileImageUrl(vermieter) ? (
                                                                <img
                                                                    src={getProfileImageUrl(vermieter)}
                                                                    alt={vermieter.user?.name}
                                                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                                                    {vermieter.user?.name?.charAt(0)?.toUpperCase() || 'V'}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                                    {vermieter.user?.name || 'N/A'}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate">
                                                                    {vermieter.user?.email || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => openEditModal(vermieter)}
                                                                className="text-orange-600 hover:text-orange-900 p-2 rounded hover:bg-orange-50"
                                                                title="Bearbeiten"
                                                            >
                                                                <svg className="w-4 h-4" fill="none"
                                                                     stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                                          strokeWidth={2}
                                                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Company Info */}
                                                    <div className="mb-3">
                                                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Firma</h4>
                                                        <p className="text-sm text-gray-900">{vermieter.company_name || 'Keine Firma'}</p>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="mb-3">
                                                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Autos</h4>
                                                        <p className="text-sm font-medium text-gray-900">{getCarCount(vermieter)}</p>
                                                    </div>

                                                    {/* Status and Actions */}
                                                    <div className="flex flex-col space-y-3">
                                                        <div>
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</h4>
                                                            <div className="flex items-center gap-2">
                                                            <span
                                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                    vermieter.verified
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : vermieter.stripe_account_id && vermieter.stripe_enabled
                                                                            ? 'bg-green-200 text-green-900'
                                                                            : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {vermieter.verified
                                                                    ? 'Verifiziert'
                                                                    : vermieter.stripe_account_id && vermieter.stripe_enabled
                                                                        ? 'Stripe Verifiziert'
                                                                        : 'Nicht verifiziert'}
                                                            </span>
                                                                {vermieter.strikes > 0 && (
                                                                    <span
                                                                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                    {vermieter.strikes} Strike{vermieter.strikes > 1 ? 's' : ''}
                                                                </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Registered Date */}
                                                        <div>
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Registriert</h4>
                                                            <p className="text-xs text-gray-500">{formatDate(vermieter.created_at)}</p>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex gap-2 pt-2">
                                                            {canVerify(vermieter) && (
                                                                <button
                                                                    onClick={() => handleVerify(vermieter)}
                                                                    className="flex-1 text-green-600 hover:text-green-900 px-3 py-2 text-xs font-medium border border-green-300 rounded hover:bg-green-50"
                                                                >
                                                                    Verifizieren
                                                                </button>
                                                            )}
                                                            {vermieter.verified && (
                                                                <button
                                                                    onClick={() => handleUnverify(vermieter)}
                                                                    className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                                                                >
                                                                    Entverifizieren
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Pagination */}
                            {vermieter?.last_page > 1 && (
                                <div className="mt-6 flex justify-between items-center">
                                    <div className="text-sm text-gray-700">
                                        Zeige {vermieter.from} bis {vermieter.to} von {vermieter.total} Ergebnissen
                                    </div>
                                    <div className="flex gap-2">
                                        {vermieter.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (link.url) {
                                                        const url = new URL(link.url);
                                                        const page = url.searchParams.get('page');
                                                        router.get(route('vermieter'), {
                                                            tab: activeTab,
                                                            search: searchTerm,
                                                            sort: sortBy,
                                                            page: page,
                                                            per_page: 30,
                                                            limit: 30
                                                        });
                                                    }
                                                }}
                                                disabled={!link.url}
                                                className={`px-3 py-2 text-sm border rounded ${
                                                    link.active
                                                        ? 'bg-orange-600 text-white border-orange-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                } ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                dangerouslySetInnerHTML={{__html: link.label}}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Power-Up Modal */}
            {showPowerUpModal && powerUpData && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in"
                    onClick={() => setShowPowerUpModal(false)}>
                    <div
                        className="relative w-full max-w-6xl h-[95vh] sm:h-[85vh] shadow-lg rounded-lg bg-white flex flex-col animate-slide-up"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 sm:p-6 flex-shrink-0">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                    {selectedVermieter && (
                                        <>
                                            {getProfileImageUrl(selectedVermieter) ? (
                                                <img
                                                    src={getProfileImageUrl(selectedVermieter)}
                                                    alt={selectedVermieter.company_name || selectedVermieter.user?.name}
                                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                                                />
                                            ) : (
                                                <div
                                                    className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-lg flex-shrink-0">
                                                    {(selectedVermieter.company_name || selectedVermieter.user?.name || 'V').charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{selectedVermieter.company_name || selectedVermieter.user?.name || 'N/A'}</h2>
                                                <p className="text-sm sm:text-base text-gray-600 truncate">{selectedVermieter.user?.email || 'N/A'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowPowerUpModal(false)}
                                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                                >
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Haupt-Statistiken */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                                <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                                    <div
                                        className="text-lg sm:text-2xl font-bold text-green-700">{powerUpData.stats.completed_rentals}</div>
                                    <div className="text-xs sm:text-sm text-green-600">Abgeschlossene Mieten</div>
                                </div>
                                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                                    <div
                                        className="text-lg sm:text-2xl font-bold text-blue-700">{powerUpData.stats.pending_requests}</div>
                                    <div className="text-xs sm:text-sm text-blue-600">Ausstehende Anfragen</div>
                                </div>
                                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                                    <div
                                        className="text-lg sm:text-2xl font-bold text-purple-700">€{safeToFixed(powerUpData.stats.total_revenue, 2)}</div>
                                    <div className="text-xs sm:text-sm text-purple-600">Gesamtumsatz</div>
                                </div>
                                <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                                    <div
                                        className="text-lg sm:text-2xl font-bold text-orange-700">{powerUpData.stats.active_rentals}</div>
                                    <div className="text-xs sm:text-sm text-orange-600">Aktive Mieten</div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 mb-6">
                                <nav className="-mb-px flex space-x-8">
                                    <button
                                        onClick={() => setPowerUpActiveTab('statistiken')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            powerUpActiveTab === 'statistiken'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        📊 Statistiken
                                    </button>
                                    <button
                                        onClick={() => setPowerUpActiveTab('fahrzeuge')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            powerUpActiveTab === 'fahrzeuge'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        🚗 Fahrzeuge ({powerUpData.renter.cars?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setPowerUpActiveTab('mieten')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            powerUpActiveTab === 'mieten'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        🏠 Mieten ({powerUpData.stats.total_rentals})
                                    </button>
                                    <button
                                        onClick={() => setPowerUpActiveTab('chats')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            powerUpActiveTab === 'chats'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        💬 Chats ({chats?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setPowerUpActiveTab('bearbeiten')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            powerUpActiveTab === 'bearbeiten'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        ⚙️ Bearbeiten
                                    </button>
                                    <button
                                        onClick={() => setPowerUpActiveTab('stripe')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            powerUpActiveTab === 'stripe'
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        💳 Stripe
                                    </button>
                                </nav>
                            </div>

                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {powerUpActiveTab === 'fahrzeuge' && (
                                <div className="space-y-4">
                                    {/* Fahrzeuge Controls */}
                                    <div
                                        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                        {/* Suche */}
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Fahrzeuge suchen (Marke, Modell...)"
                                                value={carSearchTerm}
                                                onChange={(e) => setCarSearchTerm(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* View Mode Toggle */}
                                            <div className="flex bg-gray-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => setCarViewMode('cards')}
                                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                        carViewMode === 'cards'
                                                            ? 'bg-white text-orange-600 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2}
                                                                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                                        </svg>
                                                        Karten
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setCarViewMode('table')}
                                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                        carViewMode === 'table'
                                                            ? 'bg-white text-orange-600 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                                        </svg>
                                                        Tabelle
                                                    </div>
                                                </button>
                                            </div>

                                            {/* Tabs für aktiv/gelöscht */}
                                            <div className="flex bg-gray-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => setCarActiveTab('active')}
                                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                                        carActiveTab === 'active'
                                                            ? 'bg-white text-green-700 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                                >
                                                    Aktiv
                                                    ({powerUpData.renter.cars?.filter(car => car.deleted !== 1).length || 0})
                                                </button>
                                                <button
                                                    onClick={() => setCarActiveTab('deleted')}
                                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                                        carActiveTab === 'deleted'
                                                            ? 'bg-white text-red-700 shadow-sm'
                                                            : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                                >
                                                    Gelöscht
                                                    ({powerUpData.renter.cars?.filter(car => car.deleted === 1).length || 0})
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fahrzeuge Content - Cards oder Table */}
                                    {filterCars(powerUpData.renter.cars).length > 0 ? (
                                        <>
                                            {carViewMode === 'cards' ? (
                                                /* Karten-Ansicht */
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {filterCars(powerUpData.renter.cars).map((car) => (
                                                        <div key={car.id}
                                                             className="bg-white rounded-xl border-2 border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
                                                            {/* Car Image Gallery */}
                                                            <div className="relative">
                                                                <CarImageGallery
                                                                    images={car.images}
                                                                    carName={`${car.brand} ${car.model}`}
                                                                    onImageClick={openFullscreenSlider}
                                                                />
                                                                <div className="absolute top-3 right-3">
                                                                    <span
                                                                        className={`inline-flex px-3 py-1 text-xs rounded-full font-semibold backdrop-blur-sm ${
                                                                            car.deleted === 1 ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
                                                                        }`}>
                                                                        {car.deleted === 1 ? 'Gelöscht' : 'Aktiv'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => openCarEditModal(car)}
                                                                    className="absolute top-3 left-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none"
                                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth={2}
                                                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                            {/* Car Details */}
                                                            <div className="p-3">
                                                                <div className="mb-2">
                                                                    <h4 className="font-bold text-gray-900 text-base">{car.title || 'Kein Titel'}</h4>
                                                                    <p className="text-sm text-gray-600">{(() => {
                                                                        const brand = powerUpData?.brands?.find(b => b.id === car.brand);
                                                                        return brand?.brandName || 'Unbekannte Marke';
                                                                    })()} {car.model}</p>
                                                                </div>

                                                                {/* Specs */}
                                                                <div
                                                                    className="grid grid-cols-3 gap-1 text-xs text-gray-600 mb-2">
                                                                    <div
                                                                        className="text-center bg-gray-50 p-1.5 rounded">
                                                                        <p className="font-medium">{car.year}</p>
                                                                        <p>Jahr</p>
                                                                    </div>
                                                                    <div
                                                                        className="text-center bg-gray-50 p-1.5 rounded">
                                                                        <p className="font-medium">{(() => {
                                                                            const fuelTypes = {
                                                                                1: 'Benzin',
                                                                                2: 'Hybrid',
                                                                                3: 'Diesel',
                                                                                4: 'Elektro'
                                                                            };
                                                                            return fuelTypes[car.fuelType] || 'Unbekannt';
                                                                        })()}</p>
                                                                        <p>Kraft</p>
                                                                    </div>
                                                                    <div
                                                                        className="text-center bg-gray-50 p-1.5 rounded">
                                                                        <p className="font-medium">{(() => {
                                                                            const engineType = powerUpData?.engineTypes?.find(et => et.id === car.engineType);
                                                                            return engineType?.name || 'Unbekannt';
                                                                        })()}</p>
                                                                        <p>Motor</p>
                                                                    </div>
                                                                </div>

                                                                {/* Preise */}
                                                                <div className="grid grid-cols-2 gap-1 mb-2">
                                                                    {car.dailyRentMoThu && (
                                                                        <div
                                                                            className="bg-gray-50 border border-gray-200 p-2 rounded">
                                                                            <p className="text-xs text-gray-600 font-medium">Mo-Do</p>
                                                                            <p className="text-sm font-bold text-gray-800">€{car.dailyRentMoThu}</p>
                                                                        </div>
                                                                    )}
                                                                    {car.dailyRentFriSun && (
                                                                        <div
                                                                            className="bg-gray-50 border border-gray-200 p-2 rounded">
                                                                            <p className="text-xs text-gray-600 font-medium">Fr-So</p>
                                                                            <p className="text-sm font-bold text-gray-800">€{car.dailyRentFriSun}</p>
                                                                        </div>
                                                                    )}
                                                                    {car.weekendRent && (
                                                                        <div
                                                                            className="bg-gray-50 border border-gray-200 p-2 rounded">
                                                                            <p className="text-xs text-gray-600 font-medium">Weekend</p>
                                                                            <p className="text-sm font-bold text-gray-800">€{car.weekendRent}</p>
                                                                        </div>
                                                                    )}
                                                                    {car.weeklyRent && (
                                                                        <div
                                                                            className="bg-gray-50 border border-gray-200 p-2 rounded">
                                                                            <p className="text-xs text-gray-600 font-medium">Weekly</p>
                                                                            <p className="text-sm font-bold text-gray-800">€{car.weeklyRent}</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Kaution */}
                                                                {car.depositAmount && (
                                                                    <div
                                                                        className="bg-gray-50 border border-gray-200 p-1.5 rounded text-center">
                                                                        <p className="text-xs font-medium text-gray-700">Kaution:
                                                                            €{car.depositAmount}</p>
                                                                    </div>
                                                                )}

                                                                {/* Action Buttons */}
                                                                <div className="flex gap-2 mt-3">
                                                                    <button
                                                                        onClick={() => openCarEditModal(car)}
                                                                        className="flex-1 bg-orange-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-orange-700 transition-colors"
                                                                    >
                                                                        Bearbeiten
                                                                    </button>
                                                                    {car.deleted === 1 ? (
                                                                        <button
                                                                            onClick={() => showConfirm({
                                                                                type: 'restore',
                                                                                title: 'Auto wiederherstellen',
                                                                                message: `Möchten Sie das Auto "${car.title || 'Unbenanntes Auto'}" wirklich wiederherstellen?`,
                                                                                action: () => restoreCar(car)
                                                                            })}
                                                                            className="flex-1 bg-green-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-green-700 transition-colors"
                                                                        >
                                                                            Wiederherstellen
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => showConfirm({
                                                                                type: 'delete',
                                                                                title: 'Auto löschen',
                                                                                message: `Möchten Sie das Auto "${car.title || 'Unbenanntes Auto'}" wirklich löschen?`,
                                                                                action: () => softDeleteCar(car)
                                                                            })}
                                                                            className="flex-1 bg-red-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-red-700 transition-colors"
                                                                        >
                                                                            Löschen
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                /* Tabellen-Ansicht */
                                                <div className="overflow-x-auto">
                                                    <table
                                                        className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                        <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fahrzeug</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preise</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                        {filterCars(powerUpData.renter.cars).map((car) => (
                                                            <tr key={car.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center">
                                                                        <div
                                                                            className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 mr-3">
                                                                            {car.images?.[0] ? (
                                                                                <img
                                                                                    src={`https://drivable.app/storage/${car.images[0].image_path}`}
                                                                                    alt="Car"
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    className="w-full h-full flex items-center justify-center">
                                                                                    <svg
                                                                                        className="w-6 h-6 text-gray-400"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round"
                                                                                              strokeLinejoin="round"
                                                                                              strokeWidth={2}
                                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div
                                                                                className="font-medium text-gray-900">{car.title || 'Kein Titel'}</div>
                                                                            <div
                                                                                className="text-sm text-gray-500">{(() => {
                                                                                const brand = powerUpData?.brands?.find(b => b.id === car.brand);
                                                                                return brand?.brandName || 'Unbekannte Marke';
                                                                            })()} {car.model}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                        <span
                                                                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                                car.deleted === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                                            }`}>
                                                                            {car.deleted === 1 ? 'Gelöscht' : 'Aktiv'}
                                                                        </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="text-sm text-gray-900">
                                                                        {car.year} • {(() => {
                                                                        const fuelTypes = {
                                                                            1: 'Benzin',
                                                                            2: 'Hybrid',
                                                                            3: 'Diesel',
                                                                            4: 'Elektro'
                                                                        };
                                                                        return fuelTypes[car.fuelType] || 'Unbekannt';
                                                                    })()} • {car.gearType || 'Unbekannt'}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {(() => {
                                                                            const engineType = powerUpData?.engineTypes?.find(et => et.id === car.engineType);
                                                                            return engineType?.name || 'Unbekannter Motor';
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="text-sm space-y-1">
                                                                        {car.dailyRentMoThu && <div>Mo-Do: <span
                                                                            className="font-medium text-green-600">€{car.dailyRentMoThu}</span>
                                                                        </div>}
                                                                        {car.dailyRentFriSun && <div>Fr-So: <span
                                                                            className="font-medium text-green-600">€{car.dailyRentFriSun}</span>
                                                                        </div>}
                                                                        {car.weekendRent && <div>Weekend: <span
                                                                            className="font-medium text-green-600">€{car.weekendRent}</span>
                                                                        </div>}
                                                                        {car.weeklyRent && <div>Weekly: <span
                                                                            className="font-medium text-green-600">€{car.weeklyRent}</span>
                                                                        </div>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => openCarEditModal(car)}
                                                                            className="text-orange-600 hover:text-orange-900 font-medium text-sm"
                                                                        >
                                                                            Bearbeiten
                                                                        </button>
                                                                        {car.deleted === 1 ? (
                                                                            <button
                                                                                onClick={() => showConfirm({
                                                                                    type: 'restore',
                                                                                    title: 'Auto wiederherstellen',
                                                                                    message: `Möchten Sie das Auto "${car.title || 'Unbenanntes Auto'}" wirklich wiederherstellen?`,
                                                                                    action: () => restoreCar(car)
                                                                                })}
                                                                                className="text-green-600 hover:text-green-900 font-medium text-sm"
                                                                            >
                                                                                Wiederherstellen
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => showConfirm({
                                                                                    type: 'delete',
                                                                                    title: 'Auto löschen',
                                                                                    message: `Möchten Sie das Auto "${car.title || 'Unbenanntes Auto'}" wirklich löschen?`,
                                                                                    action: () => softDeleteCar(car)
                                                                                })}
                                                                                className="text-red-600 hover:text-red-900 font-medium text-sm"
                                                                            >
                                                                                Löschen
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none"
                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M19 11H5m14-7H5m14 14H5"/>
                                            </svg>
                                            <p className="text-lg font-medium">
                                                {carSearchTerm
                                                    ? `Keine Fahrzeuge gefunden für "${carSearchTerm}"`
                                                    : 'Keine Fahrzeuge vorhanden'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {powerUpActiveTab === 'mieten' && (
                                <div className="space-y-4">
                                    {/* Mieten Header */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-lg font-semibold">Mieten
                                                ({getFilteredRentals().length})</h3>
                                            <button
                                                onClick={refreshRentals}
                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                title="Mieten aktualisieren"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                                </svg>
                                            </button>
                                        </div>

                                        {/* View Mode Toggle */}
                                        <div className="flex bg-gray-100 rounded-lg p-1">
                                            <button
                                                onClick={() => setRentalViewMode('cards')}
                                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                    rentalViewMode === 'cards'
                                                        ? 'bg-white text-orange-600 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2}
                                                              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                                    </svg>
                                                    Karten
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setRentalViewMode('table')}
                                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                    rentalViewMode === 'table'
                                                        ? 'bg-white text-orange-600 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                                    </svg>
                                                    Tabelle
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filter und Status Stats */}
                                    <div
                                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                        {/* Filter Controls */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Quick Status Filter Pills */}
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    onClick={() => setRentalStatusFilter('all')}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                        rentalStatusFilter === 'all'
                                                            ? 'bg-orange-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    Alle ({powerUpData?.rentalStats?.total || 0})
                                                </button>
                                                <button
                                                    onClick={() => setRentalStatusFilter('requested')}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                        rentalStatusFilter === 'requested'
                                                            ? 'bg-yellow-600 text-white'
                                                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                    }`}
                                                >
                                                    Angefragt ({powerUpData?.rentalStats?.requested || 0})
                                                </button>
                                                <button
                                                    onClick={() => setRentalStatusFilter('active')}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                        rentalStatusFilter === 'active'
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    }`}
                                                >
                                                    Aktiv ({powerUpData?.rentalStats?.active || 0})
                                                </button>
                                                <button
                                                    onClick={() => setRentalStatusFilter('completed')}
                                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                        rentalStatusFilter === 'completed'
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                                    }`}
                                                >
                                                    Abgeschlossen ({powerUpData?.rentalStats?.completed || 0})
                                                </button>
                                            </div>

                                            {/* More Filters Toggle */}
                                            <button
                                                onClick={() => setRentalShowAdvancedFilters(!rentalShowAdvancedFilters)}
                                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 hover:text-orange-600 border border-gray-300 rounded-full hover:border-orange-300 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"/>
                                                </svg>
                                                Mehr Filter
                                                <svg className={`w-3 h-3 transition-transform ${
                                                    rentalShowAdvancedFilters ? 'rotate-180' : ''
                                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M19 9l-7 7-7-7"/>
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Search */}
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={rentalSearchTerm}
                                                onChange={(e) => setRentalSearchTerm(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && applyRentalFilters()}
                                                placeholder="Fahrzeug oder Mieter suchen..."
                                                className="w-64 pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none"
                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                            </svg>
                                            {rentalSearchTerm && (
                                                <button
                                                    onClick={() => setRentalSearchTerm('')}
                                                    className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Erweiterte Filter - Ausklappbar */}
                                    {rentalShowAdvancedFilters && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Payment Filter */}
                                                <div>
                                                    <label
                                                        className="block text-sm font-medium text-gray-700 mb-2">Zahlungsstatus</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => setRentalPaymentFilter('all')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalPaymentFilter === 'all'
                                                                    ? 'bg-gray-600 text-white'
                                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            Alle
                                                        </button>
                                                        <button
                                                            onClick={() => setRentalPaymentFilter('paid')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalPaymentFilter === 'paid'
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            }`}
                                                        >
                                                            Bezahlt
                                                        </button>
                                                        <button
                                                            onClick={() => setRentalPaymentFilter('pending')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalPaymentFilter === 'pending'
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                            }`}
                                                        >
                                                            Ausstehend
                                                        </button>
                                                        <button
                                                            onClick={() => setRentalPaymentFilter('partial')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalPaymentFilter === 'partial'
                                                                    ? 'bg-yellow-600 text-white'
                                                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                            }`}
                                                        >
                                                            Teilweise
                                                        </button>
                                                        <button
                                                            onClick={() => setRentalPaymentFilter('failed')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalPaymentFilter === 'failed'
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                            }`}
                                                        >
                                                            Fehlgeschlagen
                                                        </button>
                                                        <button
                                                            onClick={() => setRentalPaymentFilter('processing')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalPaymentFilter === 'processing'
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                            }`}
                                                        >
                                                            In Bearbeitung
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Status Filter (Erweitert) */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Weitere
                                                        Status</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => setRentalStatusFilter('cancelled')}
                                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                                                rentalStatusFilter === 'cancelled'
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                            }`}
                                                        >
                                                            Storniert ({powerUpData?.rentalStats?.cancelled || 0})
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Filter Reset */}
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={clearRentalFilters}
                                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2}
                                                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                                        </svg>
                                                        Alle Filter zurücksetzen
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mieten Content */}
                                    {getFilteredRentals().length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none"
                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m6-10v10m-6 4h6"/>
                                            </svg>
                                            <p>Keine Mieten vorhanden</p>
                                        </div>
                                    ) : (
                                        <>
                                            {rentalViewMode === 'cards' ? (
                                                /* Karten-Ansicht */
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {getFilteredRentals().map((rental) => (
                                                        <div key={rental.id}
                                                             className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                                            {/* Auto-Bild Header */}
                                                            <div className="relative h-32 bg-gray-100">
                                                                {rental.car?.images?.[0] ? (
                                                                    <img
                                                                        src={`https://drivable.app/storage/${rental.car.images[0].image_path}`}
                                                                        alt="Fahrzeug"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="w-full h-full flex items-center justify-center">
                                                                        <svg className="w-12 h-12 text-gray-400"
                                                                             fill="none" stroke="currentColor"
                                                                             viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round"
                                                                                  strokeLinejoin="round" strokeWidth={2}
                                                                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                <div className="absolute top-2 right-2 flex gap-1">
                                                                    <span
                                                                        className={`px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${getStatusColor(rental.status)}`}>
                                                                        {getStatusLabel(rental.status)}
                                                                    </span>
                                                                    {/* Zahlungsversuch Indikator */}
                                                                    {rental.payment_status === 'requires_payment_method' && (
                                                                        <span
                                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-red-600 text-white backdrop-blur-sm">
                                                                            ⚠️ Zahlung
                                                                        </span>
                                                                    )}
                                                                    {rental.platform_payment_intent_id && rental.payment_status !== 'requires_payment_method' && (
                                                                        <span
                                                                            className="px-2 py-1 text-xs font-medium rounded-full bg-green-600 text-white backdrop-blur-sm">
                                                                            ✓ Stripe
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="p-4">
                                                                <div className="mb-3">
                                                                    <div
                                                                        className="flex justify-between items-start mb-1">
                                                                        <h4 className="font-semibold text-gray-900">
                                                                            {rental.car?.title || 'Unbekanntes Fahrzeug'}
                                                                        </h4>
                                                                        <span
                                                                            className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                            ID: {rental.id}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600">
                                                                        {rental.car?.model} •
                                                                        Mieter: {rental.user?.name}
                                                                    </p>
                                                                </div>

                                                                <div className="space-y-2 text-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-500">Von:</span>
                                                                        <span>
                                                                            {new Date(rental.start_date).toLocaleDateString('de-DE')}
                                                                            {rental.start_hour && <span
                                                                                className="text-gray-400"> • {rental.start_hour}</span>}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-500">Bis:</span>
                                                                        <span>
                                                                            {new Date(rental.end_date).toLocaleDateString('de-DE')}
                                                                            {rental.end_hour && <span
                                                                                className="text-gray-400"> • {rental.end_hour}</span>}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between font-medium">
                                                                        <span className="text-gray-500">Betrag:</span>
                                                                        <span
                                                                            className="text-green-600">{formatPrice(rental.total_amount)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span
                                                                            className="text-gray-500">Anfragevolumen:</span>
                                                                        <span
                                                                            className="text-blue-600">{formatPrice(rental.request_volume)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span
                                                                            className="text-gray-500">Zahlungsstatus:</span>
                                                                        <span className={`font-medium ${
                                                                            rental.payment_status === 'Bezahlt' ? 'text-green-600' :
                                                                                rental.payment_status === 'Teilweise bezahlt' ? 'text-yellow-600' :
                                                                                    rental.payment_status === 'In Bearbeitung' ? 'text-blue-600' :
                                                                                        rental.payment_status === 'Fehlgeschlagen' ? 'text-red-600' :
                                                                                            'text-orange-600'
                                                                        }`}>
                                                                            {rental.payment_status || 'Ausstehend'}
                                                                        </span>
                                                                    </div>
                                                                    {/* Stripe Zahlungsversuche */}
                                                                    {rental.payment_method_type && (
                                                                        <div className="flex justify-between">
                                                                            <span
                                                                                className="text-gray-500">Zahlungsart:</span>
                                                                            <span
                                                                                className="text-indigo-600 capitalize">{rental.payment_method_type.replace('_', ' ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {rental.platform_payment_intent_id && (
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500">Payment Intent:</span>
                                                                            <span
                                                                                className="text-purple-600 font-mono">{rental.platform_payment_intent_id.substring(0, 20)}...</span>
                                                                        </div>
                                                                    )}
                                                                    {rental.payment_status === 'requires_payment_method' && (
                                                                        <div
                                                                            className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                                                                            <span
                                                                                className="text-amber-700 font-medium">⚠️ Zahlungsversuch fehlgeschlagen</span>
                                                                            <div className="text-amber-600">Stripe
                                                                                Status: {rental.payment_status}</div>
                                                                        </div>
                                                                    )}
                                                                    {rental.rent_note && (
                                                                        <div
                                                                            className="mt-2 pt-2 border-t border-gray-100">
                                                                            <p className="text-xs text-gray-600 italic">"{rental.rent_note}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                /* Tabellen-Ansicht */
                                                <div className="overflow-x-auto">
                                                    <table
                                                        className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                        <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fahrzeug</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mieter</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anfragevolumen</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zahlungsstatus</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zahlungsversuche</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                        {getFilteredRentals().map((rental) => (
                                                            <tr key={rental.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3">
                                                                    <div
                                                                        className="text-sm font-mono text-gray-700">#{rental.id}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center">
                                                                        <div
                                                                            className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 mr-3 flex-shrink-0">
                                                                            {rental.car?.images?.[0] ? (
                                                                                <img
                                                                                    src={`https://drivable.app/storage/${rental.car.images[0].image_path}`}
                                                                                    alt="Fahrzeug"
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    className="w-full h-full flex items-center justify-center">
                                                                                    <svg
                                                                                        className="w-6 h-6 text-gray-400"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round"
                                                                                              strokeLinejoin="round"
                                                                                              strokeWidth={2}
                                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium text-gray-900">
                                                                                {rental.car?.title || 'Unbekanntes Fahrzeug'}
                                                                            </div>
                                                                            <div
                                                                                className="text-sm text-gray-500">{rental.car?.model}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div
                                                                        className="text-sm text-gray-900">{rental.user?.name}</div>
                                                                    <div
                                                                        className="text-sm text-gray-500">{rental.user?.email}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="text-sm">
                                                                        <div className="text-gray-900">
                                                                            {new Date(rental.start_date).toLocaleDateString('de-DE')} - {new Date(rental.end_date).toLocaleDateString('de-DE')}
                                                                        </div>
                                                                        {(rental.start_hour || rental.end_hour) && (
                                                                            <div className="text-gray-500 mt-1">
                                                                                {rental.start_hour &&
                                                                                    <span>{rental.start_hour}</span>}
                                                                                {(rental.start_hour && rental.end_hour) &&
                                                                                    <span> - </span>}
                                                                                {rental.end_hour &&
                                                                                    <span>{rental.end_hour}</span>}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                        <span
                                                                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(rental.status)}`}>
                                                                            {getStatusLabel(rental.status)}
                                                                        </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div
                                                                        className="font-medium text-green-600">{formatPrice(rental.total_amount)}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div
                                                                        className="text-sm text-blue-600">{formatPrice(rental.request_volume)}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                        <span
                                                                            className={`px-2 py-1 text-xs font-medium rounded ${
                                                                                rental.payment_status === 'Bezahlt' ? 'bg-green-100 text-green-800' :
                                                                                    rental.payment_status === 'Teilweise bezahlt' ? 'bg-yellow-100 text-yellow-800' :
                                                                                        rental.payment_status === 'In Bearbeitung' ? 'bg-blue-100 text-blue-800' :
                                                                                            rental.payment_status === 'Fehlgeschlagen' ? 'bg-red-100 text-red-800' :
                                                                                                'bg-orange-100 text-orange-800'
                                                                            }`}>
                                                                            {rental.payment_status || 'Ausstehend'}
                                                                        </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col gap-1">
                                                                        {rental.payment_method_type && (
                                                                            <span
                                                                                className="text-xs text-indigo-600 capitalize">
                                                                                    {rental.payment_method_type.replace('_', ' ')}
                                                                                </span>
                                                                        )}
                                                                        {rental.platform_payment_intent_id && (
                                                                            <span
                                                                                className="text-xs text-purple-600 font-mono">
                                                                                    {rental.platform_payment_intent_id.substring(0, 15)}...
                                                                                </span>
                                                                        )}
                                                                        {rental.payment_status === 'requires_payment_method' && (
                                                                            <span
                                                                                className="text-xs text-amber-600 font-medium">
                                                                                    ⚠️ Fehlgeschlagen
                                                                                </span>
                                                                        )}
                                                                        {!rental.platform_payment_intent_id && !rental.payment_method_type && (
                                                                            <span className="text-xs text-gray-400">Keine Versuche</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}


                            {powerUpActiveTab === 'statistiken' && (
                                <div className="space-y-6">
                                    {/* Chat-Statistiken */}
                                    {powerUpData && (
                                        <div
                                            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat-Statistiken</h3>
                                                    <p className="text-sm text-gray-600">Überblick über alle
                                                        Chat-Aktivitäten dieses Vermieters</p>
                                                </div>
                                                <button
                                                    onClick={() => generateChatSummary(selectedVermieter)}
                                                    disabled={loading || !powerUpData.chatStats?.total_chats}
                                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                                 fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                                                        stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor"
                                                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            🔍 Analysiert...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4 mr-2" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                                            </svg>
                                                            🤖 Vermieter analysieren
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-blue-600">{powerUpData.chatStats?.total_chats || 0}</p>
                                                        <p className="text-sm text-gray-600">Gesamt Chats</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-green-600">{powerUpData.chatStats?.total_messages || 0}</p>
                                                        <p className="text-sm text-gray-600">Nachrichten</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-red-600">{powerUpData.chatStats?.total_censored_messages || 0}</p>
                                                        <p className="text-sm text-gray-600">Zensierte</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-orange-600">{powerUpData.chatStats?.chats_with_violations || 0}</p>
                                                        <p className="text-sm text-gray-600">Mit Verstößen</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-purple-600">{powerUpData.chatStats?.active_chats || 0}</p>
                                                        <p className="text-sm text-gray-600">Msg. (7T)</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-yellow-600">{powerUpData.chatStats?.recent_violations || 0}</p>
                                                        <p className="text-sm text-gray-600">Msg. (24h)</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mieten-Statistiken */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-indigo-700">{powerUpData.stats.total_rentals}</div>
                                                <div className="text-base text-gray-600">Gesamt Mieten</div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-yellow-700">{(() => {
                                                    const totalRentals = powerUpData.stats.total_rentals || 0;
                                                    const completedRentals = powerUpData.stats.completed_rentals || 0;
                                                    const percentage = totalRentals > 0 ? (completedRentals / totalRentals) * 100 : 0;
                                                    return safeToFixed(percentage, 1);
                                                })()}%
                                                </div>
                                                <div className="text-base text-gray-600">Erfolgsrate</div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-teal-700">€{(() => {
                                                    const completedRentals = powerUpData.stats.completed_rentals || 0;
                                                    const totalRevenue = powerUpData.stats.total_revenue || 0;
                                                    const avgPerRental = completedRentals > 0 ? totalRevenue / completedRentals : 0;
                                                    return safeToFixed(avgPerRental, 2);
                                                })()}</div>
                                                <div className="text-base text-gray-600">Ø pro Miete</div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Chart-Bereich */}
                                    <div className="mt-6 w-full">
                                        {renderChart()}
                                    </div>
                                </div>
                            )}

                            {powerUpActiveTab === 'chats' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat-Übersicht</h3>

                                    {chats && chats.length > 0 ? (
                                        <div className="space-y-4">
                                            {chats.map((chat) => (
                                                <div key={chat.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <h4 className="font-medium text-gray-900">
                                                                    Chat mit {chat.user?.name || 'Unbekannt'}
                                                                </h4>
                                                                <div className="flex gap-2">
                                                                    <span
                                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {chat.messages_count} Nachrichten
                                                                    </span>
                                                                    {chat.censored_messages_count > 0 && (
                                                                        <span
                                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                            🚫 {chat.censored_messages_count} Zensiert
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mb-2">
                                                                <p className="text-sm text-gray-500">Mieter:</p>
                                                                <p className="font-medium">{chat.user?.name}</p>
                                                                <p className="text-sm text-gray-500">{chat.user?.email}</p>
                                                            </div>

                                                            {chat.latest_message && (
                                                                <div
                                                                    className="bg-gray-50 p-3 rounded border-l-4 border-orange-500">
                                                                    <p className="text-sm text-gray-600 mb-1">
                                                                        <strong>Letzte Nachricht:</strong>
                                                                    </p>
                                                                    <p className="text-sm">{chat.latest_message.content}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {formatDate(chat.latest_message.created_at)}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="ml-4">
                                                            <button
                                                                onClick={() => openChatDetailsModal(chat)}
                                                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm"
                                                            >
                                                                Details
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-12 h-12 text-gray-400" fill="none"
                                                     stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                                </svg>
                                                <p className="font-medium">Keine Nachrichten gesendet</p>
                                                <p className="text-sm">Dieser Vermieter hat noch keine Chat-Nachrichten
                                                    erhalten.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {powerUpActiveTab === 'bearbeiten' && (
                                <div className="space-y-4">
                                    {/* Company Data Collapsible Section */}
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setCompanyDataExpanded(!companyDataExpanded)}
                                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded-t-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-orange-600" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">🏢
                                                        Firmen-Daten</h3>
                                                    <p className="text-sm text-gray-500">Firmenname, Adresse,
                                                        Einstellungen</p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${companyDataExpanded ? 'rotate-180' : ''}`}
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        </button>

                                        {companyDataExpanded && (
                                            <div className="px-6 pb-6 border-t border-gray-100">
                                                <form onSubmit={(e) => {
                                                    e.preventDefault();
                                                    saveRenter();
                                                }} className="space-y-6 pt-6">
                                                    {/* Firmen-Informationen */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="md:col-span-2">
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">🏢
                                                                Firmenname</label>
                                                            <input
                                                                type="text"
                                                                value={renterEditData.company_name}
                                                                onChange={(e) => setRenterEditData({
                                                                    ...renterEditData,
                                                                    company_name: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                placeholder="Firmenname eingeben..."
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">🏠
                                                                Straße</label>
                                                            <input
                                                                type="text"
                                                                value={renterEditData.company_address_street}
                                                                onChange={(e) => setRenterEditData({
                                                                    ...renterEditData,
                                                                    company_address_street: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                placeholder="Straße und Hausnummer"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">📮
                                                                PLZ / Stadt</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={renterEditData.company_address_postcode}
                                                                    onChange={(e) => setRenterEditData({
                                                                        ...renterEditData,
                                                                        company_address_postcode: e.target.value
                                                                    })}
                                                                    className="w-24 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="PLZ"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={renterEditData.company_address_city}
                                                                    onChange={(e) => setRenterEditData({
                                                                        ...renterEditData,
                                                                        company_address_city: e.target.value
                                                                    })}
                                                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="Stadt"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Einstellungen & Stripe */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-3">💳
                                                                Zahlungsmethoden</label>
                                                            <div className="space-y-2">
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={renterEditData.allowCash}
                                                                        onChange={(e) => setRenterEditData({
                                                                            ...renterEditData,
                                                                            allowCash: e.target.checked
                                                                        })}
                                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">💵 Barzahlung</span>
                                                                </label>
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={renterEditData.allowDigitalPayment}
                                                                        onChange={(e) => setRenterEditData({
                                                                            ...renterEditData,
                                                                            allowDigitalPayment: e.target.checked
                                                                        })}
                                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">💳 Digital</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-3">⚙️
                                                                Status & Einstellungen</label>
                                                            <div className="space-y-2">
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={renterEditData.isSmallBusinessOwner}
                                                                        onChange={(e) => setRenterEditData({
                                                                            ...renterEditData,
                                                                            isSmallBusinessOwner: e.target.checked
                                                                        })}
                                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">🏪 Kleinunternehmer</span>
                                                                </label>
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={renterEditData.blockPayouts}
                                                                        onChange={(e) => setRenterEditData({
                                                                            ...renterEditData,
                                                                            blockPayouts: e.target.checked
                                                                        })}
                                                                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                                    />
                                                                    <span className="ml-2 text-sm text-gray-700">🚫 Auszahlungen blockiert</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Advanced Settings */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">🔢
                                                                Strikes</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="3"
                                                                value={renterEditData.strikes}
                                                                onChange={(e) => setRenterEditData({
                                                                    ...renterEditData,
                                                                    strikes: parseInt(e.target.value)
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">💳
                                                                Stripe Account ID</label>
                                                            <input
                                                                type="text"
                                                                value={renterEditData.stripe_account_id}
                                                                onChange={(e) => setRenterEditData({
                                                                    ...renterEditData,
                                                                    stripe_account_id: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                placeholder="acct_..."
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Notizen */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">📝
                                                                Firmenbeschreibung</label>
                                                            <textarea
                                                                rows="2"
                                                                value={renterEditData.companyDescription}
                                                                onChange={(e) => setRenterEditData({
                                                                    ...renterEditData,
                                                                    companyDescription: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                placeholder="Beschreibung der Firma..."
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">🗒️
                                                                Interne Notiz</label>
                                                            <textarea
                                                                rows="2"
                                                                value={renterEditData.note}
                                                                onChange={(e) => setRenterEditData({
                                                                    ...renterEditData,
                                                                    note: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                                placeholder="Interne Notizen..."
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Save Button */}
                                                    <div className="flex justify-end pt-4 border-t border-gray-200">
                                                        <button
                                                            type="submit"
                                                            disabled={isSavingRenter}
                                                            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                        >
                                                            {isSavingRenter ? '💾 Speichert...' : '💾 Firmen-Daten speichern'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>

                                    {/* User Data Collapsible Section */}
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setUserDataExpanded(!userDataExpanded)}
                                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    {selectedVermieter?.profile_picture ? (
                                                        <img
                                                            src={`https://drivable.app/storage/${selectedVermieter.profile_picture}`}
                                                            alt={selectedVermieter.company_name}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <svg className="w-5 h-5 text-blue-600" fill="none"
                                                             stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth="2"
                                                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">👤
                                                        User-Account</h3>
                                                    <p className="text-sm text-gray-500">Name, E-Mail, Telefon,
                                                        Username</p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${userDataExpanded ? 'rotate-180' : ''}`}
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                      d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        </button>

                                        {userDataExpanded && (
                                            <div className="px-6 pb-6 border-t border-gray-100">
                                                <div className="space-y-6 pt-6">
                                                    {/* User Form Fields */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">👤
                                                                Name</label>
                                                            <input
                                                                type="text"
                                                                value={userData.name}
                                                                onChange={(e) => setUserData({
                                                                    ...userData,
                                                                    name: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="Vollständiger Name"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">📧
                                                                E-Mail</label>
                                                            <input
                                                                type="email"
                                                                value={userData.email}
                                                                onChange={(e) => setUserData({
                                                                    ...userData,
                                                                    email: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="user@example.com"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-2">📞
                                                                Telefonnummer</label>
                                                            <input
                                                                type="tel"
                                                                value={userData.phone_number}
                                                                onChange={(e) => setUserData({
                                                                    ...userData,
                                                                    phone_number: e.target.value
                                                                })}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="+49 123 456789"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Account Status */}
                                                    <div className="bg-blue-50 rounded-lg p-4">
                                                        <h5 className="text-sm font-medium text-gray-900 mb-3">📊
                                                            Account-Status</h5>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div className="bg-white rounded p-2 text-center">
                                                                <p className="text-xs text-gray-500">Erstellt</p>
                                                                <p className="text-xs font-medium">
                                                                    {selectedVermieter.user?.created_at ? new Date(selectedVermieter.user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white rounded p-2 text-center">
                                                                <p className="text-xs text-gray-500">Aktualisiert</p>
                                                                <p className="text-xs font-medium">
                                                                    {selectedVermieter.user?.updated_at ? new Date(selectedVermieter.user.updated_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white rounded p-2 text-center">
                                                                <p className="text-xs text-gray-500">E-Mail</p>
                                                                <p className="text-xs font-medium">
                                                                    {selectedVermieter.user?.email_verified_at ? (
                                                                        <span className="text-green-600">✅</span>
                                                                    ) : (
                                                                        <span className="text-red-600">❌</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white rounded p-2 text-center">
                                                                <p className="text-xs text-gray-500">Telefon</p>
                                                                <p className="text-xs font-medium">
                                                                    {selectedVermieter.user?.phone_verified_at ? (
                                                                        <span className="text-green-600">✅</span>
                                                                    ) : (
                                                                        <span className="text-red-600">❌</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white rounded p-2 text-center">
                                                                <p className="text-xs text-gray-500">Type</p>
                                                                <p className="text-xs font-medium">
                                                                    {selectedVermieter.user?.type || 'Standard'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Save Button */}
                                                    <div className="flex justify-end pt-4 border-t border-gray-200">
                                                        <button
                                                            type="button"
                                                            onClick={saveUserData}
                                                            disabled={isSavingUser}
                                                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                        >
                                                            {isSavingUser ? '💾 Speichert...' : '💾 User-Daten speichern'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Verification Actions */}
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔐 Verifikation</h3>
                                        <div className="flex justify-center gap-4">
                                            {canVerify(selectedVermieter) && (
                                                <button
                                                    type="button"
                                                    onClick={() => showConfirm({
                                                        type: 'verify',
                                                        title: 'Vermieter verifizieren',
                                                        message: `Möchten Sie ${selectedVermieter?.company_name || selectedVermieter?.user?.name} wirklich verifizieren?`,
                                                        action: () => handleVerify(selectedVermieter)
                                                    })}
                                                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                                                >
                                                    ✅ Verifizieren
                                                </button>
                                            )}
                                            {selectedVermieter?.verified && (
                                                <button
                                                    type="button"
                                                    onClick={() => showConfirm({
                                                        type: 'unverify',
                                                        title: 'Vermieter entverifizieren',
                                                        message: `Möchten Sie ${selectedVermieter?.company_name || selectedVermieter?.user?.name} wirklich entverifizieren?`,
                                                        action: () => handleUnverify(selectedVermieter)
                                                    })}
                                                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                                                >
                                                    ❌ Entverifizieren
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {powerUpActiveTab === 'stripe' && (
                                <StripeTab
                                    selectedVermieter={selectedVermieter}
                                    showNotification={showNotification}
                                    showEmailConfirm={showEmailConfirm}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Car Edit Modal */}
            {showCarEditModal && editingCar && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in"
                    onClick={() => setShowCarEditModal(false)}>
                    <div
                        className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] shadow-lg rounded-lg bg-white flex flex-col animate-slide-up"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 sm:p-6 flex-shrink-0">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                <div className="min-w-0 flex-1 mr-4">
                                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{editingCar.title || 'Kein Titel'}</h2>
                                    <p className="text-sm sm:text-base text-gray-600 truncate">{(() => {
                                        const brand = powerUpData?.brands?.find(b => b.id === editingCar.brand);
                                        return brand?.brandName || 'Unbekannte Marke';
                                    })()} {editingCar.model}</p>
                                    <p className="text-xs sm:text-sm text-gray-500 truncate">Vermieter: {powerUpData?.renter?.company_name || powerUpData?.renter?.user?.name || 'Unbekannt'}</p>
                                </div>
                                <button
                                    onClick={() => setShowCarEditModal(false)}
                                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                >
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Bilder Section */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Bilder
                                        ({editingCar.images?.length || 0}/9)</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {Array.from({length: 9}, (_, index) => {
                                            const image = editingCar.images?.[index];
                                            return (
                                                <div key={index} className="relative group">
                                                    <div
                                                        className="w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200"
                                                        style={{aspectRatio: '1/1.25'}}>
                                                        {image ? (
                                                            <>
                                                                <img
                                                                    src={`https://drivable.app/storage/${image.image_path}`}
                                                                    alt={`Bild ${index + 1}`}
                                                                    className="w-full h-full object-contain bg-gray-50"
                                                                />
                                                                <div
                                                                    className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                                                                    #{index + 1}
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteCarImage(image.id)}
                                                                    className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none"
                                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth={2}
                                                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div
                                                                className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                                                <div className="text-center">
                                                                    <svg className="w-8 h-8 mx-auto mb-2" fill="none"
                                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth={1.5}
                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                    </svg>
                                                                    <p className="text-xs font-medium">#{index + 1}</p>
                                                                    <p className="text-xs text-gray-400 mt-1">Kein
                                                                        Bild</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(!editingCar.images || editingCar.images.length === 0) && (
                                        <div className="text-center mt-6 text-gray-500">
                                            <p className="text-sm">Keine Bilder vorhanden</p>
                                            <p className="text-xs text-gray-400 mt-1">Maximum 9 Bilder (1:1.25
                                                Format)</p>
                                        </div>
                                    )}
                                </div>

                                {/* Form Section */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Fahrzeugdaten</h3>
                                    <form className="space-y-4" onSubmit={(e) => {
                                        e.preventDefault();
                                        saveCar();
                                    }}>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Titel</label>
                                            <input
                                                type="text"
                                                value={carEditData.title}
                                                onChange={(e) => setCarEditData({
                                                    ...carEditData,
                                                    title: e.target.value
                                                })}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Marke</label>
                                                <select
                                                    value={carEditData.brand}
                                                    onChange={(e) => setCarEditData({
                                                        ...carEditData,
                                                        brand: e.target.value
                                                    })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                >
                                                    <option value="">Wählen...</option>
                                                    {powerUpData?.brands?.map(brand => (
                                                        <option key={brand.id}
                                                                value={brand.id}>{brand.brandName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label
                                                    className="block text-sm font-medium text-gray-700">Modell</label>
                                                <input
                                                    type="text"
                                                    value={carEditData.model}
                                                    onChange={(e) => setCarEditData({
                                                        ...carEditData,
                                                        model: e.target.value
                                                    })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label
                                                    className="block text-sm font-medium text-gray-700">Baujahr</label>
                                                <input
                                                    type="number"
                                                    value={carEditData.year}
                                                    onChange={(e) => setCarEditData({
                                                        ...carEditData,
                                                        year: e.target.value
                                                    })}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    className="block text-sm font-medium text-gray-700">Kraftstoff</label>
                                                <select
                                                    value={carEditData.fuelType}
                                                    onChange={(e) => setCarEditData({
                                                        ...carEditData,
                                                        fuelType: e.target.value
                                                    })}
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
                                                <label
                                                    className="block text-sm font-medium text-gray-700">Getriebe</label>
                                                <select
                                                    value={carEditData.gearType}
                                                    onChange={(e) => setCarEditData({
                                                        ...carEditData,
                                                        gearType: e.target.value
                                                    })}
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
                                                value={carEditData.engineType}
                                                onChange={(e) => setCarEditData({
                                                    ...carEditData,
                                                    engineType: e.target.value
                                                })}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                <option value="">Wählen...</option>
                                                {powerUpData?.engineTypes?.map(engineType => (
                                                    <option key={engineType.id}
                                                            value={engineType.id}>{engineType.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                className="block text-sm font-medium text-gray-700">Beschreibung</label>
                                            <textarea
                                                rows="3"
                                                value={carEditData.description}
                                                onChange={(e) => setCarEditData({
                                                    ...carEditData,
                                                    description: e.target.value
                                                })}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>

                                        {/* Preise */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Preise</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Mo-Do
                                                        (€/Tag)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={carEditData.dailyRentMoThu}
                                                        onChange={(e) => setCarEditData({
                                                            ...carEditData,
                                                            dailyRentMoThu: e.target.value
                                                        })}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Fr-So
                                                        (€/Tag)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={carEditData.dailyRentFriSun}
                                                        onChange={(e) => setCarEditData({
                                                            ...carEditData,
                                                            dailyRentFriSun: e.target.value
                                                        })}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Wochenende
                                                        (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={carEditData.weekendRent}
                                                        onChange={(e) => setCarEditData({
                                                            ...carEditData,
                                                            weekendRent: e.target.value
                                                        })}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Wöchentlich
                                                        (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={carEditData.weeklyRent}
                                                        onChange={(e) => setCarEditData({
                                                            ...carEditData,
                                                            weeklyRent: e.target.value
                                                        })}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Stündlich
                                                        (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={carEditData.hourRent}
                                                        onChange={(e) => setCarEditData({
                                                            ...carEditData,
                                                            hourRent: e.target.value
                                                        })}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Kaution
                                                        (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={carEditData.depositAmount}
                                                        onChange={(e) => setCarEditData({
                                                            ...carEditData,
                                                            depositAmount: e.target.value
                                                        })}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-4 pt-6">
                                            <button
                                                type="button"
                                                onClick={() => setShowCarEditModal(false)}
                                                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSaving ? 'Speichert...' : 'Speichern'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {showConfirmModal && confirmAction && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
                    onClick={handleCancel}>
                    <div className="relative mx-auto p-4 sm:p-6 border w-full max-w-md shadow-lg rounded-lg bg-white"
                         onClick={(e) => e.stopPropagation()}>
                        <div className="mt-3 text-center">
                            {/* Icon */}
                            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
                                confirmAction.type === 'verify' || confirmAction.type === 'restore'
                                    ? 'bg-green-100'
                                    : 'bg-red-100'
                            }`}>
                                {confirmAction.type === 'verify' ? (
                                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                ) : confirmAction.type === 'restore' ? (
                                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                    </svg>
                                ) : confirmAction.type === 'delete' ? (
                                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                ) : (
                                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                    </svg>
                                )}
                            </div>

                            {/* Title */}
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                {confirmAction.title}
                            </h3>

                            {/* Message */}
                            <p className="text-sm text-gray-500 mb-6">
                                {confirmAction.message}
                            </p>

                            {/* Buttons */}
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={loading}
                                    className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                                        confirmAction.type === 'verify' || confirmAction.type === 'restore'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {loading ? 'Wird verarbeitet...' : 'Bestätigen'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Slider */}
            {showFullscreenSlider && (
                <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center animate-fade-in">
                    {/* Close Button */}
                    <button
                        onClick={closeFullscreenSlider}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>

                    {/* Image */}
                    <div className="relative w-full h-full flex items-center justify-center p-8">
                        <img
                            src={`https://drivable.app/storage/${fullscreenImages[fullscreenCurrentIndex]?.image_path}`}
                            alt={`Bild ${fullscreenCurrentIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                        />

                        {/* Previous Button */}
                        {fullscreenCurrentIndex > 0 && (
                            <button
                                onClick={prevFullscreenImage}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-70 text-2xl"
                            >
                                ‹
                            </button>
                        )}

                        {/* Next Button */}
                        {fullscreenCurrentIndex < fullscreenImages.length - 1 && (
                            <button
                                onClick={nextFullscreenImage}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-70 text-2xl"
                            >
                                ›
                            </button>
                        )}

                        {/* Image Counter */}
                        <div
                            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
                            {fullscreenCurrentIndex + 1} / {fullscreenImages.length}
                        </div>

                        {/* Dots */}
                        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {fullscreenImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setFullscreenCurrentIndex(index)}
                                    className={`w-3 h-3 rounded-full ${
                                        index === fullscreenCurrentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Address Suggestions Modal */}
            {showAddressSuggestions && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg">
                        {/* Header */}
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Adressvorschläge</h3>
                                    <p className="text-sm text-gray-500 mt-1">Bitte wählen Sie die passende Adresse
                                        aus:</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAddressSuggestions(false);
                                        setAddressSuggestions([]);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Suggestions List */}
                        <div className="max-h-96 overflow-y-auto">
                            {addressSuggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    onClick={() => selectAddressSuggestion(suggestion)}
                                    className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">
                                                {suggestion.display_name}
                                            </h4>
                                            <div className="mt-1 text-sm text-gray-600">
                                                {suggestion.address && (
                                                    <div className="space-y-1">
                                                        {suggestion.address.road && (
                                                            <span
                                                                className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                                                                {suggestion.address.road} {suggestion.address.house_number || ''}
                                                            </span>
                                                        )}
                                                        {suggestion.address.postcode && (
                                                            <span
                                                                className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
                                                                {suggestion.address.postcode}
                                                            </span>
                                                        )}
                                                        {(suggestion.address.city || suggestion.address.town || suggestion.address.municipality) && (
                                                            <span
                                                                className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                                                                {suggestion.address.city || suggestion.address.town || suggestion.address.municipality}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500">
                                                Typ: {suggestion.type} • {suggestion.class}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-4">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M9 5l7 7-7 7"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {addressSuggestions.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <p className="text-sm">Keine Adressvorschläge verfügbar</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Success Popup */}
            {showSuccessPopup && (
                <div className="fixed top-4 right-4 z-[110] animate-slide-up">
                    <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium">{successMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Details Modal */}
            {showChatDetailsModal && selectedChat && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg sm:text-xl font-semibold truncate">
                                    Chat mit {selectedChat.user?.name}
                                </h2>
                                <div className="flex items-center gap-4 mt-2">
                                    <span
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        📝 {selectedChat.messages_count} Nachrichten
                                    </span>
                                    {selectedChat.censored_messages_count > 0 && (
                                        <span
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            🚫 {selectedChat.censored_messages_count} Zensiert
                                        </span>
                                    )}
                                    <span
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        👤 {selectedChat.messages?.filter(m => m.sender_id === selectedChat.user_id).length || 0} vom User
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={closeChatDetailsModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-4">
                                {selectedChat.messages && selectedChat.messages.length > 0 ? (
                                    <>
                                        {selectedChat.messages.map((message) => (
                                            <div key={message.id}
                                                 className={`flex ${message.sender_id === selectedChat.user_id ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-2xl rounded-lg shadow-sm border ${
                                                    message.violations && message.violations.length > 0
                                                        ? 'bg-red-50 border-red-200'
                                                        : message.sender_id === selectedChat.user_id
                                                            ? 'bg-white border-gray-200'
                                                            : 'bg-blue-50 border-blue-200'
                                                }`}>
                                                    {/* Message Header */}
                                                    <div
                                                        className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            {message.sender_id !== selectedChat.user_id && selectedVermieter?.user?.profilePicture ? (
                                                                <img
                                                                    src={selectedVermieter.user.profilePicture}
                                                                    alt="Profile"
                                                                    className="w-8 h-8 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                                                        message.sender_id === selectedChat.user_id
                                                                            ? 'bg-gray-200 text-gray-700'
                                                                            : 'bg-blue-200 text-blue-700'
                                                                    }`}>
                                                                    {(message.sender_id === selectedChat.user_id
                                                                            ? message.sender?.name
                                                                            : (selectedVermieter?.company_name || message.sender?.name)
                                                                    )?.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <p className="font-medium text-sm text-gray-900">
                                                                {message.sender_id === selectedChat.user_id
                                                                    ? message.sender?.name
                                                                    : (selectedVermieter?.company_name || message.sender?.name)
                                                                }
                                                            </p>
                                                            {message.is_read && (
                                                                <span
                                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            ✓ Gelesen
                                                        </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {formatDate(message.created_at)}
                                                        </p>
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className="p-4">
                                                        <p className="text-gray-900 leading-relaxed">{message.content}</p>
                                                    </div>

                                                    {/* Moderation Panel */}
                                                    <div className={`px-4 py-3 border-t ${
                                                        message.violations && message.violations.length > 0
                                                            ? 'bg-red-100 border-red-200'
                                                            : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                        {message.violations && message.violations.length > 0 ? (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-2">
                                                            <span
                                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-900">
                                                                🚫 Zensiert
                                                            </span>
                                                                    <span className="text-xs text-red-700 font-medium">
                                                                {getViolationType(message.violations[0].violation_type)}
                                                            </span>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div
                                                                        className="bg-red-50 p-3 rounded border border-red-300">
                                                                        <p className="text-xs text-red-800 mb-2">
                                                                            <strong>Original-Nachricht:</strong>
                                                                        </p>
                                                                        <p className="text-sm text-red-900 italic">
                                                                            "{message.violations[0].original_content}"
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => confirmUncensorMessage(message)}
                                                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 border border-green-700"
                                                                        >
                                                                            ✓ Entzensieren
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-center">
                                                                <span
                                                                    className="text-xs text-gray-500">Moderation</span>
                                                                <button
                                                                    onClick={() => openCensorModal(message)}
                                                                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-orange-600 text-white hover:bg-orange-700 border border-orange-700"
                                                                >
                                                                    🔒 Zensieren
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Scroll anchor for auto-scroll to bottom */}
                                        <div ref={messagesEndRef}/>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center gap-4">
                                            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                            </svg>
                                            <div>
                                                <p className="font-semibold text-lg text-gray-600">Keine Nachrichten
                                                    gesendet</p>
                                                <p className="text-gray-500 mt-1">In diesem Chat wurden noch keine
                                                    Nachrichten ausgetauscht.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Censor Modal */}
            {showCensorModal && selectedMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Nachricht zensieren</h3>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Nachricht:</p>
                                <p className="bg-gray-100 p-3 rounded text-sm">{selectedMessage.content}</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Verstoß-Typ:
                                </label>
                                <select
                                    value={censorType}
                                    onChange={(e) => setCensorType(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                >
                                    <option value="manual_review">Manuelle Prüfung</option>
                                    <option value="contact_info">Kontaktdaten</option>
                                    <option value="inappropriate">Unangemessen</option>
                                    <option value="spam">Spam</option>
                                    <option value="other">Sonstiges</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Grund (optional):
                                </label>
                                <textarea
                                    value={censorReason}
                                    onChange={(e) => setCensorReason(e.target.value)}
                                    rows={3}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Zusätzliche Informationen..."
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowCensorModal(false)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={censorMessage}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                                >
                                    Zensieren
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Uncensor Confirmation Modal */}
            {showConfirmUncensor && messageToUncensor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4 text-red-800">Nachricht entzensieren?</h3>

                            <div className="mb-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    Diese Aktion wird die ursprüngliche Nachricht wiederherstellen und die
                                    Zensur-Markierung <strong>vollständig entfernen</strong>.
                                </p>
                                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                                    <p className="text-xs text-amber-800 mb-1">
                                        <strong>Original wird wiederhergestellt:</strong>
                                    </p>
                                    <p className="text-sm text-gray-900 italic">
                                        "{messageToUncensor.violations?.[0]?.original_content}"
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowConfirmUncensor(false)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={uncensorMessage}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                                >
                                    ✓ Entzensieren
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Summary Modal */}
            {showChatSummaryModal && chatSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                        <div
                            className="flex justify-between items-center p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">🤖
                                    KI-Vermieter-Analyse</h2>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">Detaillierte Charakteranalyse
                                    basierend auf allen verfügbaren Daten</p>
                            </div>
                            <button
                                onClick={() => setShowChatSummaryModal(false)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 max-h-[75vh] overflow-y-auto">
                            <div className="prose prose-gray max-w-none">
                                <div
                                    className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                        </svg>
                                        <h3 className="text-lg font-semibold text-blue-900">🤖 GPT-4
                                            Vermieter-Analyse</h3>
                                    </div>
                                    <p className="text-blue-700 text-sm">
                                        Diese Analyse wurde mit OpenAI GPT-4 erstellt und basiert auf allen verfügbaren
                                        Vermieter-Daten: Chats, Mieten, Fahrzeuge, Statistiken und Verhalten.
                                    </p>
                                </div>

                                <div className="whitespace-pre-line text-gray-800 leading-relaxed">
                                    {chatSummary}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => setShowChatSummaryModal(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showNotificationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-slide-up">
                        <div
                            className={`px-6 py-4 rounded-t-lg ${notificationData.type === 'success' ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
                            <div className="flex items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${notificationData.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {notificationData.type === 'success' ? (
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M5 13l4 4L19 7"/>
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    )}
                                </div>
                                <h3 className={`text-lg font-semibold ${notificationData.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                    {notificationData.title}
                                </h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-6">{notificationData.message}</p>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    className={`px-4 py-2 rounded-md font-medium ${notificationData.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Confirmation Modal */}
            {showEmailConfirmModal && emailConfirmData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-slide-up">
                        <div className="px-6 py-4 bg-blue-50 rounded-t-lg border-b border-blue-200">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-blue-800">📧 E-Mail senden</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Möchten Sie den Zahlungslink per E-Mail
                                an <strong>{selectedVermieter?.company_name}</strong> senden?
                            </p>
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">📧 An:</span> {selectedVermieter?.user?.email}
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowEmailConfirmModal(false)}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={() => {
                                        setShowEmailConfirmModal(false);
                                        sendPaymentLinkEmail(emailConfirmData);
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                                >
                                    📧 E-Mail senden
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}


// StripeTab Component
function StripeTab({selectedVermieter, showNotification, showEmailConfirm}) {
    const [stripeData, setStripeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [showAllPaymentLinks, setShowAllPaymentLinks] = useState(false);
    const [paymentDescription, setPaymentDescription] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [sendEmail, setSendEmail] = useState(true);
    const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
    const [paymentLink, setPaymentLink] = useState(null);

    useEffect(() => {
        if (selectedVermieter) {
            loadStripeData();
        }
    }, [selectedVermieter]);

    const loadStripeData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/vermieter/${selectedVermieter.id}/stripe/dashboard`);

            if (response.data.success) {
                setStripeData(response.data.data);
            } else {
                setStripeData(null);
                console.error('Fehler beim Laden der Stripe-Daten:', response.data.message);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Stripe-Daten:', error);
            setStripeData(null);
        } finally {
            setLoading(false);
        }
    };

    const manualBalanceAdjustment = async () => {
        const currentBalance = stripeData.available_balance;
        const suggestedAmount = Math.abs(currentBalance);

        const amountInput = prompt(`Manuelle Saldo-Korrektur\n\nAktuelles Saldo: ${formatCurrency(currentBalance)}\n\nBetrag eingeben (positiv für Gutschrift, negativ für Abzug):\n\nVorschlag: ${suggestedAmount} (zum Ausgleich)`, suggestedAmount.toString());

        if (amountInput === null) return; // User canceled

        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount === 0) {
            showNotification('error', 'Ungültiger Betrag', 'Bitte geben Sie einen gültigen Betrag ein.');
            return;
        }

        const reason = prompt(`Grund für die manuelle Saldo-Korrektur:\n\nBetrag: ${formatCurrency(amount)}\nNeues Saldo: ${formatCurrency(currentBalance + amount)}`, 'Banküberweisung erhalten');

        if (reason === null) return; // User canceled

        const confirmed = window.confirm(`Manuelle Saldo-Korrektur bestätigen?\n\n• Betrag: ${formatCurrency(amount)}\n• Grund: ${reason}\n• Aktuell: ${formatCurrency(currentBalance)}\n• Nach Korrektur: ${formatCurrency(currentBalance + amount)}\n\nDies wird in den Activity Logs vermerkt.`);

        if (!confirmed) return;

        try {
            const response = await axios.post(`/api/vermieter/${selectedVermieter.id}/stripe/manual-adjustment`, {
                amount: amount,
                reason: reason
            });

            if (response.data.success) {
                showNotification('success', 'Saldo-Korrektur erfolgreich', `Betrag: ${formatCurrency(amount)}\nGrund: ${reason}\nActivity Log wurde erstellt`);
                // Reload stripe data to show updated balance
                loadStripeData();
            } else {
                showNotification('error', 'Fehler bei Saldo-Korrektur', response.data.message);
            }
        } catch (error) {
            showNotification('error', 'Fehler bei Saldo-Korrektur', error.response?.data?.message || error.message);
        }
    };

    const calculateAmountWithFees = (baseAmount) => {
        // Stripe fees: max 3% + €0.50 for safety buffer
        const feePercentage = 0.03; // 3%
        const fixedFee = 0.50; // €0.50

        const totalAmount = baseAmount * (1 + feePercentage) + fixedFee;
        return Math.ceil(totalAmount * 100) / 100; // Round up to nearest cent
    };

    const openPaymentLinkModalWithFees = () => {
        if (stripeData && stripeData.available_balance < 0) {
            const deficit = Math.abs(stripeData.available_balance);
            const recommendedAmount = calculateAmountWithFees(deficit);

            setPaymentAmount(recommendedAmount.toFixed(2));
            setPaymentDescription(`Kontoguthaben Ausgleich (${formatCurrency(deficit)} + Stripe-Gebühren)`);
            setAdminNote('Automatisch berechnet für negativen Kontostand');
        } else {
            setPaymentAmount('');
            setPaymentDescription('');
            setAdminNote('');
        }
        setSendEmail(true);
        setShowPaymentLinkModal(true);
    };

    const createPaymentLink = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            showNotification('error', 'Ungültiger Betrag', 'Bitte geben Sie einen gültigen Betrag ein.');
            return;
        }

        try {
            setCreatingPaymentLink(true);
            const response = await axios.post(`/api/vermieter/${selectedVermieter.id}/stripe/payment-link`, {
                amount: parseFloat(paymentAmount),
                description: paymentDescription || 'Kontoguthaben Ausgleich',
                admin_note: adminNote,
                send_email: sendEmail
            });

            if (response.data.success) {
                setPaymentLink(response.data.payment_link);

                const successMsg = 'Zahlungslink erfolgreich erstellt!' +
                    (response.data.email_sent ? '\n\n📧 E-Mail wurde an den Vermieter gesendet!' : '');
                showNotification('success', 'Zahlungslink erstellt', successMsg);

                setShowPaymentLinkModal(false);
                setPaymentAmount('');
                setPaymentDescription('');
                setAdminNote('');
                setSendEmail(true);

                // Reload stripe data to get updated balance and payment links
                loadStripeData();
            } else {
                showNotification('error', 'Fehler beim Erstellen', response.data.message);
            }
        } catch (error) {
            showNotification('error', 'Fehler beim Erstellen', error.response?.data?.message || error.message);
        } finally {
            setCreatingPaymentLink(false);
        }
    };

    const deletePaymentLink = async (paymentLinkId) => {
        const confirmed = window.confirm('Payment Link wirklich deaktivieren?\n\nDer Link wird nicht gelöscht, sondern nur deaktiviert und kann nicht mehr verwendet werden.');

        if (!confirmed) return;

        try {
            console.log('Deleting payment link:', paymentLinkId);
            console.log('Delete URL:', `/api/vermieter/${selectedVermieter.id}/stripe/payment-link/${paymentLinkId}`);

            const response = await axios({
                method: 'DELETE',
                url: `/api/vermieter/${selectedVermieter.id}/stripe/payment-link/${paymentLinkId}`,
                headers: {
                    'X-HTTP-Method-Override': 'DELETE'
                }
            });

            if (response.data.success) {
                showNotification('success', 'Payment Link deaktiviert', 'Payment Link wurde erfolgreich deaktiviert!');
                // Reload stripe data to show updated payment links
                loadStripeData();
            } else {
                showNotification('error', 'Fehler beim Löschen', response.data.message);
            }
        } catch (error) {
            console.error('Delete error:', error);
            console.error('Error response:', error.response);
            showNotification('error', 'Fehler beim Löschen', error.response?.data?.message || error.message);
        }
    };


    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            'available': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'in_transit': 'bg-blue-100 text-blue-800',
            'paid': 'bg-green-100 text-green-800',
            'failed': 'bg-red-100 text-red-800'
        };

        return statusColors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    <span>Stripe-Daten werden geladen...</span>
                </div>
            </div>
        );
    }

    if (!stripeData) {
        return (
            <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Kein Stripe-Konto verbunden</h3>
                <p className="mt-2 text-sm text-gray-500">
                    Dieser Vermieter hat noch kein Stripe-Konto verknüpft oder es können keine Daten abgerufen werden.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Account Overview */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">💳 Stripe Account</h3>
                        <p className="text-sm text-gray-600">Kontoinformationen und Status</p>
                    </div>
                    <div className="flex space-x-2">
                        {stripeData.charges_enabled && (
                            <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Zahlungen aktiviert
                            </span>
                        )}
                        {stripeData.payouts_enabled && (
                            <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                💸 Auszahlungen aktiviert
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-500">Account ID</p>
                        <p className="font-mono text-xs text-gray-700">{stripeData.account_id}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-500">Land</p>
                        <p className="font-medium text-gray-900">{stripeData.country?.toUpperCase()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-500">Währung</p>
                        <p className="font-medium text-gray-900">{stripeData.default_currency?.toUpperCase()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-500">Typ</p>
                        <p className="font-medium text-gray-900 capitalize">{stripeData.account_type}</p>
                    </div>
                </div>
            </div>

            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Verfügbares Guthaben</p>
                            <p className={`text-2xl font-bold ${stripeData.available_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(stripeData.available_balance)}
                            </p>
                        </div>
                        <div
                            className={`p-3 rounded-full ${stripeData.available_balance < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                            <svg
                                className={`w-6 h-6 ${stripeData.available_balance < 0 ? 'text-red-600' : 'text-green-600'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Ausstehend</p>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stripeData.pending_balance)}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Gesamt</p>
                            <p className={`text-2xl font-bold ${stripeData.total_balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatCurrency(stripeData.total_balance)}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-100 rounded-full">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Link Creation for Negative Balance */}
            {stripeData.available_balance < 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-red-800">Negatives Kontoguthaben</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>Das Konto hat ein negatives Guthaben
                                    von {formatCurrency(Math.abs(stripeData.available_balance))}.</p>
                            </div>
                            <div className="mt-4 flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => openPaymentLinkModalWithFees()}
                                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                                    >
                                        💳 Zahlungslink für Vermieter erstellen
                                    </button>
                                    <button
                                        onClick={manualBalanceAdjustment}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700"
                                    >
                                        ⚖️ Manuelle Saldo-Korrektur
                                    </button>
                                </div>
                                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    <strong>Admin-Optionen:</strong>
                                    <br/>• <strong>Zahlungslink:</strong> Vermieter zahlt selbst über Stripe Checkout
                                    (inkl. automatischem Gebühren-Aufschlag)
                                    <br/>• <strong>Manuelle Korrektur:</strong> Ihr korrigiert das Saldo direkt (z.B.
                                    nach Überweisung/Kulanz)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* All Transactions */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">📊 Alle Transaktionen</h3>
                </div>
                <div className="overflow-x-auto">
                    {stripeData.transactions?.length > 0 ? (
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gebühr</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {(showAllTransactions ? stripeData.transactions : stripeData.transactions.slice(0, 5)).map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {transaction.type}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <span
                                                className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                                                {formatCurrency(transaction.amount)}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                        {transaction.description || 'Keine Beschreibung'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {transaction.created}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatCurrency(transaction.fee)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-6 py-8 text-center text-gray-500">
                            Keine Transaktionen gefunden.
                        </div>
                    )}

                    {/* Show More Button */}
                    {stripeData.transactions && stripeData.transactions.length > 5 && (
                        <div className="px-6 py-4 border-t border-gray-200 text-center">
                            <button
                                onClick={() => setShowAllTransactions(!showAllTransactions)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                            >
                                {showAllTransactions ?
                                    `📄 Weniger anzeigen (nur 5 von ${stripeData.transactions.length})` :
                                    `📄 Alle ${stripeData.transactions.length} Transaktionen anzeigen`
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* All Payouts */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">💸 Alle Auszahlungen</h3>
                </div>
                <div className="overflow-x-auto">
                    {stripeData.payouts?.length > 0 ? (
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ankunftsdatum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erstellt</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {stripeData.payouts.map((payout) => (
                                <tr key={payout.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                        {formatCurrency(payout.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payout.status)}`}>
                                                {payout.status}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {payout.arrival_date || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {payout.created}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-6 py-8 text-center text-gray-500">
                            Keine Auszahlungen gefunden.
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Link Modal */}
            {showPaymentLinkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">💳 Zahlungslink erstellen</h3>

                            {stripeData && stripeData.available_balance < 0 && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="text-sm text-blue-800">
                                        <p><strong>💡 Automatische Gebühren-Berechnung:</strong></p>
                                        <p>• Aktuelles
                                            Defizit: {formatCurrency(Math.abs(stripeData.available_balance))}</p>
                                        <p>• Stripe-Gebühren: max. 3% + €0,50</p>
                                        <p>• <strong>Empfohlener
                                            Betrag: {formatCurrency(calculateAmountWithFees(Math.abs(stripeData.available_balance)))}</strong>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Betrag (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Beschreibung (für Vermieter sichtbar)
                                </label>
                                <input
                                    type="text"
                                    value={paymentDescription}
                                    onChange={(e) => setPaymentDescription(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Kontoguthaben Ausgleich"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin-Notiz (intern, nicht für Vermieter)
                                </label>
                                <textarea
                                    rows="2"
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Interne Notiz für was dieser Payment Link erstellt wurde..."
                                />
                            </div>

                            <div className="mb-6">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="rounded border-gray-300 text-orange-600 shadow-sm focus:ring-orange-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        📧 E-Mail mit Payment Link an Vermieter senden
                                    </span>
                                </label>
                                {selectedVermieter?.user?.email && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        E-Mail wird gesendet an: {selectedVermieter.user.email}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowPaymentLinkModal(false)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={createPaymentLink}
                                    disabled={creatingPaymentLink}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                                >
                                    {creatingPaymentLink ? 'Erstellt...' : 'Link erstellen'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* General Payment Link Creation */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">💳 Neuen Payment Link erstellen</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Erstelle Payment Links für beliebige Beträge (Rechnungen, Nachzahlungen, etc.)
                    </p>
                    <button
                        onClick={() => {
                            setPaymentAmount('');
                            setPaymentDescription('');
                            setAdminNote('');
                            setSendEmail(true);
                            setShowPaymentLinkModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                        ➕ Payment Link erstellen
                    </button>
                </div>
            </div>

            {/* Existing Payment Links */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-medium text-gray-900">Bestehende Payment Links</h3>
                    {stripeData.payment_links && stripeData.payment_links.length > 0 && (
                        <span className="text-sm text-gray-500">
                            {showAllPaymentLinks ? stripeData.payment_links.length : Math.min(3, stripeData.payment_links.length)} von {stripeData.payment_links.length}
                        </span>
                    )}
                </div>
                <div className="p-6">
                    {stripeData.payment_links && stripeData.payment_links.length > 0 ? (
                        <>
                            <div className="grid gap-4">
                                {(showAllPaymentLinks ? stripeData.payment_links : stripeData.payment_links.slice(0, 3)).map((link) => (
                                    <div key={link.id}
                                         className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                                        {/* Header with Status and Date */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-3 h-3 rounded-full ${link.active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    link.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {link.active ? 'Aktiv' : 'Inaktiv'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                                {link.created}
                                            </span>
                                        </div>

                                        {/* Main Content */}
                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-4 mb-3">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {formatCurrency(link.amount)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-medium">Zweck:</span> {link.description}
                                                    </div>
                                                </div>
                                            </div>

                                            {link.admin_note && (
                                                <div
                                                    className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-600">📝</span>
                                                        <span
                                                            className="text-sm font-medium text-amber-800">Admin-Notiz:</span>
                                                    </div>
                                                    <p className="text-sm text-amber-700 mt-1">{link.admin_note}</p>
                                                </div>
                                            )}

                                            {link.email_sent && (
                                                <div
                                                    className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-3">
                                                    <span>✅</span>
                                                    <span>E-Mail gesendet: {link.email_sent_at}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payment Link URL */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 mr-3">
                                                    <div className="text-xs text-gray-500 mb-1">Payment Link</div>
                                                    <code className="text-xs text-gray-700 break-all block">
                                                        {link.url}
                                                    </code>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(link.url)}
                                                        className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-600"
                                                        title="Link kopieren"
                                                    >
                                                        📋
                                                    </button>
                                                    <a
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-all duration-200 border border-emerald-200 hover:border-emerald-600"
                                                        title="Link öffnen"
                                                    >
                                                        🔗
                                                    </a>
                                                    {selectedVermieter?.user?.email && (
                                                        <button
                                                            onClick={() => {
                                                                console.log('Email button clicked for:', link.id);
                                                                showEmailConfirm(link.id);
                                                            }}
                                                            className={`p-2 rounded-lg transition-all duration-200 border ${
                                                                link.email_sent
                                                                    ? 'text-orange-600 hover:text-white hover:bg-orange-600 border-orange-200 hover:border-orange-600'
                                                                    : 'text-purple-600 hover:text-white hover:bg-purple-600 border-purple-200 hover:border-purple-600'
                                                            }`}
                                                            title={link.email_sent ? "E-Mail nochmal senden" : "E-Mail nachträglich senden"}
                                                        >
                                                            📧
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {link.active && (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => deletePaymentLink(link.id)}
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                                                    title="Payment Link deaktivieren"
                                                >
                                                    <span>🗑️</span>
                                                    <span>Deaktivieren</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Show More Button for Payment Links */}
                            {stripeData.payment_links.length > 3 && (
                                <div className="pt-6 text-center">
                                    <button
                                        onClick={() => setShowAllPaymentLinks(!showAllPaymentLinks)}
                                        className="px-8 py-3 bg-white border border-gray-300 hover:border-gray-400 hover:shadow-md text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
                                    >
                                        <span>{showAllPaymentLinks ? '🔼' : '🔽'}</span>
                                        <span>
                                            {showAllPaymentLinks ?
                                                `Weniger anzeigen (nur 3 von ${stripeData.payment_links.length})` :
                                                `Alle ${stripeData.payment_links.length} Payment Links anzeigen`
                                            }
                                        </span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                                </svg>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Keine Payment Links</h4>
                            <p className="text-gray-500">Keine Payment Links erstellt.</p>
                        </div>
                    )}
                </div>
            </div>

            {paymentLink && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-green-800">Zahlungslink erstellt</h3>
                            <div className="mt-2 text-sm text-green-700">
                                <p>Der Zahlungslink wurde erfolgreich erstellt:</p>
                                <div className="mt-2 p-3 bg-white border border-green-200 rounded-md">
                                    <div className="flex items-center justify-between">
                                        <code className="text-xs text-gray-700 break-all">{paymentLink}</code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(paymentLink)}
                                            className="ml-2 text-green-600 hover:text-green-700"
                                            title="Link kopieren"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <a
                                    href={paymentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                                >
                                    🔗 Link öffnen
                                </a>
                                <button
                                    onClick={() => setPaymentLink(null)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600"
                                >
                                    ✕ Schließen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
