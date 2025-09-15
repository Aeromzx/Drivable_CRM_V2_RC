import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head} from '@inertiajs/react';
import {useState, useEffect} from 'react';
import axios from 'axios';

export default function Mieten() {
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState({
        total_rentals: 0,
        average_amount: 0,
        total_amount: 0,
        total_platform_fee: 0,
        completed_payments_amount: 0
    });
    const [statusData, setStatusData] = useState({});
    const [conversionRates, setConversionRates] = useState({
        payment_rate: 0,
        cancellation_rate: 0,
        rejection_rate: 0,
        total_paid: 0,
        total_cancellations: 0
    });
    const [rentals, setRentals] = useState({});
    const [filteredRentals, setFilteredRentals] = useState({});
    const [selectedStatusFilter, setSelectedStatusFilter] = useState(-1);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [openDates, setOpenDates] = useState({});
    const [selectedRental, setSelectedRental] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [activeTab, setActiveTab] = useState('car');
    const [selectedRentalDetails, setSelectedRentalDetails] = useState(null);
    const [chatData, setChatData] = useState(null);
    const [chatLoading, setChatLoading] = useState(false);

    // Chat censoring state variables (like User.jsx)
    const [showCensorModal, setShowCensorModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [censorReason, setCensorReason] = useState('');
    const [censorType, setCensorType] = useState('manual_review');
    const [showConfirmUncensor, setShowConfirmUncensor] = useState(false);
    const [messageToUncensor, setMessageToUncensor] = useState(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);

    // Edit rental state
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');
    const [saving, setSaving] = useState(false);

    // Toast notification state (like Vermieter.jsx)
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationData, setNotificationData] = useState({type: 'success', title: '', message: ''});

    // Document Images State like in User.jsx
    const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
    const [isLoadingIds, setIsLoadingIds] = useState(false);
    const [frontLicenseUrl, setFrontLicenseUrl] = useState(null);
    const [backLicenseUrl, setBackLicenseUrl] = useState(null);
    const [frontIdUrl, setFrontIdUrl] = useState(null);
    const [backIdUrl, setBackIdUrl] = useState(null);
    const [licenseImageErrors, setLicenseImageErrors] = useState({});
    const [idImageErrors, setIdImageErrors] = useState({});

    const statusOptions = {
        0: 'Angefragt',
        1: 'Storniert',
        2: 'Akzeptiert',
        3: 'Abgelehnt',
        4: 'Bezahlt',
        5: 'Aktiv',
        6: 'Abgeschlossen',
        7: 'Vom Vermieter storniert',
        8: 'Vom Mieter storniert',
        9: 'Zurückerstattet',
        10: 'Bewertet'
    };

    useEffect(() => {
        fetchRentalData();
    }, []);

    const fetchRentalData = async () => {
        setLoading(true);
        try {
            // Lade Statistiken
            const statsResponse = await axios.get('/getRentalStats');
            setStatistics(statsResponse.data.statistics);
            setStatusData(statsResponse.data.status_statistics);
            calculateConversionRates(statsResponse.data.status_statistics, statsResponse.data.statistics);

            // Lade erste Mieten-Seite
            const rentalsResponse = await axios.get('/getRentals', {
                params: {
                    page: 1,
                    per_page: 100
                }
            });
            setRentals(rentalsResponse.data.rentals || {});
            setFilteredRentals(rentalsResponse.data.rentals || {});
            setPagination(rentalsResponse.data.pagination || null);
            setCurrentPage(1);

            // Nur aktueller Tag ausgeklappt
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD Format
            const availableDates = Object.keys(rentalsResponse.data.rentals || {});

            if (availableDates.includes(today)) {
                setOpenDates({[today]: true});
            } else if (availableDates.length > 0) {
                // Falls heute keine Mieten hat, ersten verfügbaren Tag öffnen
                setOpenDates({[availableDates[0]]: true});
            }
        } catch (error) {
            console.error('Error fetching rental data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateConversionRates = (statusData, statistics) => {
        const total = statistics.total_rentals;
        if (total === 0) return;

        // Alle bezahlten Mieten (Bezahlt → Aktiv → Abgeschlossen → Bewertet)
        const totalPaid = (statusData.STATUS_PAID || 0) +
            (statusData.STATUS_ACTIVE || 0) +
            (statusData.STATUS_COMPLETED || 0) +
            (statusData.STATUS_RATED || 0);

        // Alle Stornierungen
        const totalCancellations = (statusData.STATUS_CANCELLED || 0) +
            (statusData.STATUS_CANCELLED_BY_RENTER || 0) +
            (statusData.STATUS_CANCELLED_BY_USER || 0);

        setConversionRates({
            payment_rate: (totalPaid / total) * 100,
            cancellation_rate: (totalCancellations / total) * 100,
            rejection_rate: ((statusData.STATUS_DECLINED || 0) / total) * 100,
            total_paid: totalPaid,
            total_cancellations: totalCancellations
        });
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    const formatPercentage = (value) => {
        return (value || 0).toFixed(1) + '%';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) + ' ' + new Date(date).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFuelType = (fuelType) => {
        const fuelTypes = {
            1: 'Benzin',
            2: 'Diesel',
            3: 'Elektro',
            4: 'Hybrid',
            5: 'Wasserstoff',
            'benzin': 'Benzin',
            'diesel': 'Diesel',
            'electric': 'Elektro',
            'hybrid': 'Hybrid',
            'hydrogen': 'Wasserstoff'
        };
        return fuelTypes[fuelType] || fuelType || 'N/A';
    };

    const getBrandIcon = (brandInfo) => {
        if (!brandInfo || !brandInfo.iconName) return null;
        return `https://drivable.app/images/brands/${brandInfo.iconName}.webp`;
    };

    const getRechungDownloadUrl = (rental) => {
        return `https://drivable.app/api/downloadFeeReceiptCRM/${rental.id}/pdf-download`;
    };

    const getStatusCount = (status) => {
        const statusCounts = {
            0: statusData.STATUS_REQUESTED,
            1: statusData.STATUS_CANCELLED,
            2: statusData.STATUS_ACCEPTED,
            3: statusData.STATUS_DECLINED,
            4: statusData.STATUS_PAID,
            5: statusData.STATUS_ACTIVE,
            6: statusData.STATUS_COMPLETED,
            7: statusData.STATUS_CANCELLED_BY_RENTER,
            8: statusData.STATUS_CANCELLED_BY_USER,
            9: statusData.STATUS_REFUNDED,
            10: statusData.STATUS_RATED
        };

        return statusCounts[status] || 0;
    };

    const getStatusPercentage = (status) => {
        const total = statistics.total_rentals;
        if (total === 0) return 0;
        return (getStatusCount(status) / total) * 100;
    };

    const filterByStatus = async (status) => {
        const newFilter = status === selectedStatusFilter ? -1 : status;
        setSelectedStatusFilter(newFilter);

        setLoading(true);
        try {
            const params = {
                page: 1,
                per_page: 100,
                search: searchQuery.trim(),
                status: newFilter,
                sort: sortBy
            };

            const response = await axios.get('/getRentals', {params});
            const rentalsData = response.data.rentals || {};

            setFilteredRentals(rentalsData);
            setPagination(response.data.pagination || null);
            setCurrentPage(1);

            // Nur aktueller Tag ausgeklappt bei Status-Filter
            const today = new Date().toISOString().split('T')[0];
            const availableDates = Object.keys(rentalsData);

            if (availableDates.includes(today)) {
                setOpenDates({[today]: true});
            } else if (availableDates.length > 0) {
                setOpenDates({[availableDates[0]]: true});
            }
        } catch (error) {
            console.error('Error filtering rentals:', error);
        } finally {
            setLoading(false);
        }
    };

    // Document API Functions from User.jsx
    const fetchLicenseImages = async (userId) => {
        try {
            setIsLoadingLicenses(true);
            setLicenseImageErrors({});

            const frontUrl = await getLicenseImageUrl(userId, 'front');
            const backUrl = await getLicenseImageUrl(userId, 'back');

            setFrontLicenseUrl(frontUrl);
            setBackLicenseUrl(backUrl);
        } catch (error) {
            console.error('Error fetching license images:', error);
            setLicenseImageErrors({general: 'Fehler beim Laden der Führerscheinbilder'});
        } finally {
            setIsLoadingLicenses(false);
        }
    };

    const fetchIdImages = async (userId) => {
        try {
            setIsLoadingIds(true);
            setIdImageErrors({});

            const frontUrl = await getIdImageUrl(userId, 'front');
            const backUrl = await getIdImageUrl(userId, 'back');
            setFrontIdUrl(frontUrl);
            setBackIdUrl(backUrl);
        } catch (error) {
            console.error('Error fetching ID images:', error);
            setIdImageErrors({general: 'Fehler beim Laden der Ausweisbilder'});
        } finally {
            setIsLoadingIds(false);
        }
    };

    const getLicenseImageUrl = async (userId, type) => {
        try {
            const response = await axios.get(`https://drivable.app/api/crm/license-image/${userId}/${type}`);

            if (response.data && response.data.url) {
                return response.data.url;
            }
            throw new Error('No URL returned');
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`${type === 'front' ? 'Vorderseite' : 'Rückseite'} des Führerscheins nicht gefunden`);
            }
            throw new Error(`Fehler beim Laden der ${type === 'front' ? 'Vorderseite' : 'Rückseite'} des Führerscheins`);
        }
    };

    const getIdImageUrl = async (userId, type) => {
        try {
            const response = await axios.get(`https://drivable.app/api/crm/id-image/${userId}/${type}`);
            if (response.data && response.data.url) {
                return response.data.url;
            }
            throw new Error('No URL returned');
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`${type === 'front' ? 'Vorderseite' : 'Rückseite'} des Ausweises nicht gefunden`);
            }
            throw new Error(`Fehler beim Laden der ${type === 'front' ? 'Vorderseite' : 'Rückseite'} des Ausweises`);
        }
    };

    const resetSearch = async () => {
        setSelectedStatusFilter(-1);
        setSortBy('date_desc');

        setLoading(true);
        try {
            const response = await axios.get('/getRentals', {
                params: {
                    page: 1,
                    per_page: 100
                }
            });
            const rentalsData = response.data.rentals || {};
            setRentals(rentalsData);
            setFilteredRentals(rentalsData);
            setPagination(response.data.pagination || null);
            setCurrentPage(1);

            // Nur aktueller Tag ausgeklappt bei Reset
            const today = new Date().toISOString().split('T')[0];
            const availableDates = Object.keys(rentalsData);

            if (availableDates.includes(today)) {
                setOpenDates({[today]: true});
            } else if (availableDates.length > 0) {
                setOpenDates({[availableDates[0]]: true});
            }
        } catch (error) {
            console.error('Error resetting search:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const params = {
                page: 1,
                per_page: 100,
                search: searchQuery.trim(),
                status: selectedStatusFilter,
                sort: sortBy
            };

            const response = await axios.get('/getRentals', {params});
            const rentalsData = response.data.rentals || {};

            setFilteredRentals(rentalsData);
            setPagination(response.data.pagination || null);
            setCurrentPage(1);

            // Nur aktueller Tag ausgeklappt bei Suche
            const today = new Date().toISOString().split('T')[0];
            const availableDates = Object.keys(rentalsData);

            if (availableDates.includes(today)) {
                setOpenDates({[today]: true});
            } else if (availableDates.length > 0) {
                setOpenDates({[availableDates[0]]: true});
            }
        } catch (error) {
            console.error('Error searching rentals:', error);
        } finally {
            setLoading(false);
        }
    };

    const applySorting = (rentalsData) => {
        const sortedDates = Object.keys(rentalsData).sort((a, b) => {
            if (sortBy === 'date_desc') return new Date(b) - new Date(a);
            if (sortBy === 'date_asc') return new Date(a) - new Date(b);
            return 0;
        });

        const sorted = {};
        sortedDates.forEach(date => {
            let sortedRentals = [...rentalsData[date]];

            switch (sortBy) {
                case 'amount_desc':
                    sortedRentals.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
                    break;
                case 'amount_asc':
                    sortedRentals.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
                    break;
                case 'status':
                    sortedRentals.sort((a, b) => a.status - b.status);
                    break;
                case 'company':
                    sortedRentals.sort((a, b) => (a.renter?.company_name || '').localeCompare(b.renter?.company_name || ''));
                    break;
                case 'renter':
                    sortedRentals.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));
                    break;
            }

            sorted[date] = sortedRentals;
        });

        return sorted;
    };

    const handleSortChange = async (newSort) => {
        setSortBy(newSort);

        setLoading(true);
        try {
            const params = {
                page: 1,
                per_page: 100,
                search: searchQuery.trim(),
                status: selectedStatusFilter,
                sort: newSort
            };

            const response = await axios.get('/getRentals', {params});
            const rentalsData = response.data.rentals || {};

            setFilteredRentals(rentalsData);
            setPagination(response.data.pagination || null);
            setCurrentPage(1);

            // Nur aktueller Tag ausgeklappt bei Sortierung
            const today = new Date().toISOString().split('T')[0];
            const availableDates = Object.keys(rentalsData);

            if (availableDates.includes(today)) {
                setOpenDates({[today]: true});
            } else if (availableDates.length > 0) {
                setOpenDates({[availableDates[0]]: true});
            }
        } catch (error) {
            console.error('Error sorting rentals:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPage = async (page) => {
        setLoading(true);
        try {
            const params = {
                page: page,
                per_page: 100,
                search: searchQuery.trim(),
                status: selectedStatusFilter,
                sort: sortBy
            };

            const response = await axios.get('/getRentals', {params});
            const rentalsData = response.data.rentals || {};

            setFilteredRentals(rentalsData);
            setPagination(response.data.pagination || null);
            setCurrentPage(page);

            // Beim Seitenwechsel nur aktueller Tag ausgeklappt
            const today = new Date().toISOString().split('T')[0];
            const availableDates = Object.keys(rentalsData);

            if (availableDates.includes(today)) {
                setOpenDates({[today]: true});
            } else if (availableDates.length > 0) {
                setOpenDates({[availableDates[0]]: true});
            }
        } catch (error) {
            console.error('Error loading page:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleDate = (date) => {
        setOpenDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    const showRentalDetails = async (rental) => {
        setSelectedRental(rental);
        setActiveTab('car');
        setChatData(null);
        setShowCensorModal(false);
        setSelectedMessage(null);
        setCensorReason('');
        setCensorType('manual_review');
        setShowConfirmUncensor(false);
        setMessageToUncensor(null);
        setShowScrollToBottom(false);

        // Lade vollständige Mietdetails vom Backend
        try {
            const response = await axios.get(`/api/rentals/${rental.id}`);
            setSelectedRentalDetails(response.data);
            initializeEditDates(response.data);

            // Load document images if user exists (like in User.jsx)
            if (response.data.user && response.data.user.id) {
                // Reset previous document URLs
                setFrontLicenseUrl(null);
                setBackLicenseUrl(null);
                setFrontIdUrl(null);
                setBackIdUrl(null);
                setLicenseImageErrors({});
                setIdImageErrors({});

                // Load license and ID images
                await fetchLicenseImages(response.data.user.id);
                await fetchIdImages(response.data.user.id);
            }
        } catch (error) {
            console.error('Error loading rental details:', error);
            setSelectedRentalDetails(null);
        }
    };

    const fetchChatData = async (rentalId) => {
        setChatLoading(true);
        try {
            const response = await axios.get(`/api/rentals/${rentalId}/chat`);
            setChatData(response.data);
        } catch (error) {
            console.error('Error loading chat data:', error);
            setChatData({error: 'Fehler beim Laden der Chat-Daten'});
        } finally {
            setChatLoading(false);
        }
    };

    // Chat censoring functions (exactly like User.jsx)
    const openCensorModal = (message) => {
        setSelectedMessage(message);
        setCensorReason('');
        setCensorType('manual_review');
        setShowCensorModal(true);
    };

    const censorMessage = async () => {
        try {
            const response = await axios.post(`/api/messages/${selectedMessage.id}/censor`, {
                violation_type: censorType,
                reason: censorReason
            });

            if (response.data.success) {
                // Reload chat data to get updated messages
                await fetchChatData(selectedRental.id);

                // Scroll to bottom after reload
                setTimeout(() => {
                    scrollToBottom();
                }, 100);

                setShowCensorModal(false);
                setSelectedMessage(null);
                setCensorReason('');
                setCensorType('manual_review');
            }
        } catch (error) {
            console.error('Error censoring message:', error);
        }
    };

    const confirmUncensorMessage = (message) => {
        setMessageToUncensor(message);
        setShowConfirmUncensor(true);
    };

    const uncensorMessage = async () => {
        if (!messageToUncensor) return;

        try {
            const response = await axios.post(`/api/messages/${messageToUncensor.id}/uncensor`);
            if (response.data.success) {
                // Reload chat data to get updated messages
                await fetchChatData(selectedRental.id);

                // Scroll to bottom after reload
                setTimeout(() => {
                    scrollToBottom();
                }, 100);

                setShowConfirmUncensor(false);
                setMessageToUncensor(null);
            }
        } catch (error) {
            console.error('Error uncensoring message:', error);
            setShowConfirmUncensor(false);
            setMessageToUncensor(null);
        }
    };

    const getViolationType = (violationType) => {
        const types = {
            'ai_detected': 'KI Erkannt',
            'manual_review': 'Manuelle Prüfung',
            'contact_info': 'Kontaktdaten',
            'inappropriate': 'Unangemessen',
            'spam': 'Spam',
            'other': 'Sonstiges'
        };
        return types[violationType] || violationType;
    };

    // Scroll functions for chat
    const scrollToBottom = () => {
        const chatContainer = document.getElementById('chat-messages-container');
        if (chatContainer) {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = (e) => {
        const container = e.target;
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
        setShowScrollToBottom(!isAtBottom);
    };

    // Auto scroll to bottom when chat data loads
    useEffect(() => {
        if (chatData && chatData.messages && chatData.messages.length > 0) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [chatData]);

    // ESC key handler for modal
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && selectedRental) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [selectedRental]);

    // Toast notification function (like Vermieter.jsx)
    const showNotification = (type, title, message) => {
        setNotificationData({type, title, message});
        setShowNotificationModal(true);
    };

    // Edit rental functions
    const initializeEditDates = (rental) => {
        if (rental) {
            setNewStartDate(rental.start_date || '');
            setNewEndDate(rental.end_date || '');
            setNewStartTime(rental.start_time || '');
            setNewEndTime(rental.end_time || '');
        }
    };

    const saveRentalDates = async () => {
        if (!selectedRental || !newStartDate || !newEndDate) return;

        setSaving(true);
        try {
            const requestData = {
                start_date: newStartDate,
                end_date: newEndDate
            };

            // Add times if provided
            if (newStartTime) requestData.start_time = newStartTime;
            if (newEndTime) requestData.end_time = newEndTime;

            const response = await axios.put(`/api/rentals/${selectedRental.id}`, requestData);

            if (response.data.success) {
                // Update the rental data
                setSelectedRentalDetails(prev => ({
                    ...prev,
                    start_date: newStartDate,
                    end_date: newEndDate,
                    start_time: newStartTime,
                    end_time: newEndTime
                }));

                // Show success message
                showNotification('success', 'Erfolgreich gespeichert', 'Mietzeitraum wurde erfolgreich aktualisiert!');
            }
        } catch (error) {
            console.error('Error updating rental:', error);
            showNotification('error', 'Fehler beim Speichern', 'Mietzeitraum konnte nicht aktualisiert werden.');
        } finally {
            setSaving(false);
        }
    };

    // Close modal function
    const closeModal = () => {
        setSelectedRental(null);
        setSelectedRentalDetails(null);
        setChatData(null);
        setActiveTab('car');
        // Reset edit form data
        setNewStartDate('');
        setNewEndDate('');
        setNewStartTime('');
        setNewEndTime('');
    };

    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);

        // Lade Chat-Daten wenn Chat-Tab gewählt wird
        if (tabKey === 'chat' && selectedRental && !chatData) {
            fetchChatData(selectedRental.id);
        }
    };

    const updateRentalStatus = async (rentalId, newStatus) => {
        try {
            await axios.put(`/api/rentals/${rentalId}/status`, {status: newStatus});
            // Aktualisiere lokale Daten
            fetchRentalData();
            setSelectedRental(prev => ({...prev, status: newStatus}));
        } catch (error) {
            console.error('Error updating rental status:', error);
            alert('Fehler beim Aktualisieren des Status');
        }
    };

    const deleteRental = async (rentalId) => {
        if (!confirm('Sind Sie sicher, dass Sie diese Miete löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            return;
        }

        try {
            await axios.delete(`/api/rentals/${rentalId}`);
            alert('Miete wurde erfolgreich gelöscht.');
            fetchRentalData();
            setSelectedRental(null);
            setSelectedRentalDetails(null);
        } catch (error) {
            console.error('Error deleting rental:', error);
            alert('Fehler beim Löschen der Miete');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            0: 'text-yellow-800',
            1: 'text-red-800',
            2: 'text-blue-800',
            3: 'text-red-800',
            4: 'text-green-800',
            5: 'text-blue-800',
            6: 'text-green-800',
            7: 'text-red-800',
            8: 'text-red-800',
            9: 'text-orange-800',
            10: 'text-purple-800'
        };
        return colors[status] || 'text-gray-800';
    };

    const getStatusBgColor = (status) => {
        const colors = {
            0: 'bg-yellow-100',
            1: 'bg-red-100',
            2: 'bg-blue-100',
            3: 'bg-red-100',
            4: 'bg-green-100',
            5: 'bg-blue-100',
            6: 'bg-green-100',
            7: 'bg-red-100',
            8: 'bg-red-100',
            9: 'bg-orange-100',
            10: 'bg-purple-100'
        };
        return colors[status] || 'bg-gray-100';
    };

    const getRentalCardBgColor = (status) => {
        // Status 4: Bezahlt, Status 5: Aktiv, Status 6: Abgeschlossen, Status 10: Bewertet
        const successStatuses = [4, 5, 6, 10];
        return successStatuses.includes(parseInt(status)) ? 'bg-green-50' : 'bg-white';
    };

    if (loading) {
        return (
            <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Mieten</h2>}>
                <Head title="Mieten"/>
                <div className="flex justify-center items-center min-h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Mieten</h2>}
        >
            <Head title="Mieten"/>

            <div className="p-6 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Hauptstatistiken (5 Elemente) */}
                    <div className="grid grid-cols-5 gap-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-orange-600 mb-1 break-words">{statistics.total_rentals}</p>
                                <p className="text-sm font-medium text-gray-500">Gesamtanzahl Mieten</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600 mb-1 break-words">{formatMoney(statistics.average_amount)}</p>
                                <p className="text-sm font-medium text-gray-500">Durchschnittliche Anfrage</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600 mb-1 break-words">{formatMoney(statistics.total_amount)}</p>
                                <p className="text-sm font-medium text-gray-500">Gesamtes Anfragevolumen</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-600 mb-1 break-words">{formatMoney(statistics.total_platform_fee)}</p>
                                <p className="text-sm font-medium text-gray-500">Platform Fee (Completed)</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-emerald-600 mb-1 break-words">{formatMoney(statistics.completed_payments_amount)}</p>
                                <p className="text-sm font-medium text-gray-500">Gesamtumsatz (Completed)</p>
                            </div>
                        </div>
                    </div>

                    {/* Conversion Rates (3 Elemente) */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600 mb-1 break-words">{formatPercentage(conversionRates.payment_rate)}</p>
                                <p className="text-sm font-medium text-gray-500">Bezahl-Conversion Rate</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {conversionRates.total_paid} von {statistics.total_rentals} bezahlt
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-600 mb-1 break-words">{formatPercentage(conversionRates.cancellation_rate)}</p>
                                <p className="text-sm font-medium text-gray-500">Stornierungsrate</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {conversionRates.total_cancellations} von {statistics.total_rentals} storniert
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-0">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-orange-600 mb-1 break-words">{formatPercentage(conversionRates.rejection_rate)}</p>
                                <p className="text-sm font-medium text-gray-500">Ablehnungsrate</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {statusData.STATUS_DECLINED || 0} von {statistics.total_rentals} abgelehnt
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status-Übersicht mit klickbaren Boxen */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Status Übersicht</h2>
                        </div>

                        <div className="grid grid-cols-6 gap-4">
                            {/* Einzelne Status-Boxen */}
                            {Object.entries(statusOptions).map(([status, label]) => (
                                <div
                                    key={status}
                                    className={`p-4 rounded-lg bg-gray-50 border hover:scale-95 transition-all cursor-pointer ${
                                        selectedStatusFilter === parseInt(status) ? 'ring-2 ring-orange-400' : ''
                                    }`}
                                    onClick={() => filterByStatus(parseInt(status))}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-gray-600 text-xs">{label}</div>
                                        <div className={`text-xl font-bold ${getStatusColor(parseInt(status))}`}>
                                            {getStatusCount(parseInt(status))}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {formatPercentage(getStatusPercentage(parseInt(status)))}
                                    </div>
                                </div>
                            ))}

                            {/* Aktive & Abgeschlossene Kombiniert */}
                            <div
                                className={`p-4 rounded-lg bg-gray-50 border hover:scale-95 transition-all cursor-pointer ${
                                    selectedStatusFilter === -2 ? 'ring-2 ring-orange-400' : ''
                                }`}
                                onClick={() => filterByStatus(-2)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium text-gray-800 text-xs">Aktive & abgeschlossen</div>
                                    <div className="text-xl font-bold text-orange-600">
                                        {(statusData.STATUS_ACTIVE || 0) + (statusData.STATUS_COMPLETED || 0) + (statusData.STATUS_PAID || 0) + (statusData.STATUS_RATED || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Suchleiste mit erweiterten Filtern */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Suchfeld */}
                            <div className="flex-1 relative">
                                <svg
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    type="text"
                                    placeholder="Suche nach Name, E-Mail, Auto, Buchungs-ID, Status, Betrag..."
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                />
                                {searchQuery && (
                                    <div
                                        onClick={() => {
                                            setSearchQuery('');
                                            resetSearch();
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                    >
                                        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Sortierung */}
                            <div className="lg:w-64">
                                <select
                                    value={sortBy}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    <option value="date_desc">Neueste zuerst</option>
                                    <option value="date_asc">Älteste zuerst</option>
                                    <option value="amount_desc">Höchster Betrag zuerst</option>
                                    <option value="amount_asc">Niedrigster Betrag zuerst</option>
                                    <option value="company">Nach Vermieter (A-Z)</option>
                                    <option value="renter">Nach Mieter (A-Z)</option>
                                    <option value="status">Nach Status</option>
                                </select>
                            </div>

                            <button
                                onClick={handleSearch}
                                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Suchen
                            </button>
                        </div>

                        {/* Suchstatistiken */}
                        {searchQuery && (
                            <div className="mt-3 text-sm text-gray-600">
                                {Object.values(filteredRentals).flat().length} Mieten gefunden für "{searchQuery}"
                            </div>
                        )}
                    </div>

                    {/* Paginierung */}
                    {pagination && pagination.last_page > 1 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Zeige {pagination.from || 0} bis {pagination.to || 0} von {pagination.total} Mieten
                                </div>
                                <div className="flex items-center space-x-2">
                                    {/* Previous Button */}
                                    <button
                                        onClick={() => loadPage(currentPage - 1)}
                                        disabled={currentPage <= 1 || loading}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Zurück
                                    </button>

                                    {/* Page Numbers */}
                                    {Array.from({length: Math.min(pagination.last_page, 5)}, (_, i) => {
                                        let pageNum;
                                        if (pagination.last_page <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= pagination.last_page - 2) {
                                            pageNum = pagination.last_page - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => loadPage(pageNum)}
                                                disabled={loading}
                                                className={`px-3 py-1 text-sm border rounded-md ${
                                                    currentPage === pageNum
                                                        ? 'bg-orange-600 text-white border-orange-600'
                                                        : 'border-gray-300 hover:bg-gray-50'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    {/* Next Button */}
                                    <button
                                        onClick={() => loadPage(currentPage + 1)}
                                        disabled={currentPage >= pagination.last_page || loading}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Weiter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mieten Liste - Collapsible nach Datum */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="divide-y">
                            {Object.keys(filteredRentals).length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <p>Keine Mieten gefunden für den ausgewählten Filter.</p>
                                </div>
                            ) : (
                                Object.entries(filteredRentals).map(([date, rentalsForDate]) => (
                                    <div key={date}>
                                        {/* Datum Header - Klickbar */}
                                        <div
                                            onClick={() => toggleDate(date)}
                                            className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                                        >
                                            <div className="font-medium">{formatDate(date)}</div>
                                            <div className="flex items-center space-x-4">
                                                <span
                                                    className="text-sm text-gray-600">{rentalsForDate.length} Mieten</span>
                                                <svg
                                                    className={`w-5 h-5 transform transition-transform ${openDates[date] ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                          d="M19 9l-7 7-7-7"/>
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Mieten für dieses Datum */}
                                        {openDates[date] && (
                                            <div className="divide-y">
                                                {rentalsForDate.map((rental) => (
                                                    <div
                                                        key={rental.id}
                                                        onClick={() => showRentalDetails(rental)}
                                                        className={`p-4 ${getRentalCardBgColor(rental.status)} hover:bg-gray-50 cursor-pointer`}
                                                    >
                                                        <div className="flex space-x-4">
                                                            {/* Auto Bild */}
                                                            <div className="w-24 h-24 flex-shrink-0">
                                                                {rental.car?.images?.[0] ? (
                                                                    <img
                                                                        src={`https://drivable.app/storage/${rental.car.images[0].image_path}`}
                                                                        className="w-full h-full object-cover rounded-lg"
                                                                        onError={(e) => {
                                                                            e.target.parentNode.innerHTML = '<div class="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center"><span class="text-gray-400 text-xs">Kein Bild</span></div>';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                                                        <span className="text-gray-400 text-xs">Kein Bild</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Mieten Info */}
                                                            <div className="flex-1 relative">

                                                                {/* Hauptinfo Box */}
                                                                <div
                                                                    className={`flex justify-between items-start ${getRentalCardBgColor(rental.status)} rounded-lg p-4 shadow-sm -mt-4`}>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center space-x-2">
                                                                            <svg className="w-5 h-5 text-gray-500"
                                                                                 fill="none" stroke="currentColor"
                                                                                 viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round"
                                                                                      strokeLinejoin="round"
                                                                                      strokeWidth="2"
                                                                                      d="M19 4h-4l-2-2H9L7 4H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                                                                            </svg>
                                                                            <h3 className="font-medium text-lg">{rental.car?.title || 'Unbekanntes Auto'}</h3>
                                                                        </div>

                                                                        <div
                                                                            className="flex items-center text-sm text-gray-600 space-x-2">
                                                                            <svg className="w-4 h-4" fill="none"
                                                                                 stroke="currentColor"
                                                                                 viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round"
                                                                                      strokeLinejoin="round"
                                                                                      strokeWidth="2"
                                                                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                                            </svg>
                                                                            <span>Mieter: {rental.user?.email || 'Unbekannt'}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <div
                                                                            className="text-xl font-bold text-gray-900">
                                                                            {formatMoney(rental.total_amount || rental.refundable_amount || 0)}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 mt-1">
                                                                            Platform
                                                                            Fee: {formatMoney(rental.platform_fee || 0)}
                                                                        </div>
                                                                        <div className="mt-1">
                                                                            <span
                                                                                className={`text-sm font-medium rounded-full px-2 py-1 ${getStatusBgColor(rental.status)} ${getStatusColor(rental.status)}`}>
                                                                                {statusOptions[rental.status]}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Zusätzliche Infos */}
                                                                <div className="grid grid-cols-4 gap-6 text-sm mt-4">
                                                                    <div className="space-y-1">
                                                                        <div
                                                                            className="flex items-center text-gray-500">
                                                                            <svg className="w-4 h-4 mr-2" fill="none"
                                                                                 stroke="currentColor"
                                                                                 viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round"
                                                                                      strokeLinejoin="round"
                                                                                      strokeWidth="2"
                                                                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                            </svg>
                                                                            Zeitraum
                                                                        </div>
                                                                        <div className="font-medium ml-6">
                                                                            {formatDate(rental.start_date)} - {formatDate(rental.end_date)}
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-1">
                                                                        <div
                                                                            className="flex items-center text-gray-500">
                                                                            <svg className="w-4 h-4 mr-2" fill="none"
                                                                                 stroke="currentColor"
                                                                                 viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round"
                                                                                      strokeLinejoin="round"
                                                                                      strokeWidth="2"
                                                                                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                                                            </svg>
                                                                            Vermieter
                                                                        </div>
                                                                        <div className="font-medium ml-6">
                                                                            {rental.renter?.company_name || 'Unbekannt'}
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-1">
                                                                        <div
                                                                            className="flex items-center text-gray-500">
                                                                            <svg className="w-4 h-4 mr-2" fill="none"
                                                                                 stroke="currentColor"
                                                                                 viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round"
                                                                                      strokeLinejoin="round"
                                                                                      strokeWidth="2"
                                                                                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                                                                            </svg>
                                                                            Buchungs-ID
                                                                        </div>
                                                                        <div
                                                                            className="font-medium ml-6">#{rental.id}</div>
                                                                    </div>

                                                                    {/* Chat Messages */}
                                                                    <div className="space-y-1">
                                                                        <div
                                                                            className="flex items-center text-gray-500">
                                                                            <svg className="w-4 h-4 mr-2" fill="none"
                                                                                 stroke="currentColor"
                                                                                 viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round"
                                                                                      strokeLinejoin="round"
                                                                                      strokeWidth="2"
                                                                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                                                            </svg>
                                                                            Nachrichten
                                                                        </div>
                                                                        <div
                                                                            className="font-medium ml-6 flex items-center space-x-2">
                                                                            {rental.chat_messages_count > 0 ? (
                                                                                <>
                                                                                    <span
                                                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                                                                        📝 {rental.chat_messages_count}
                                                                                    </span>
                                                                                    {rental.censored_messages_count > 0 && (
                                                                                        <span
                                                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                                                            🚫 {rental.censored_messages_count}
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-gray-400">Keine Nachrichten</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Professional Rental Details Modal */}
            {selectedRental && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-7xl h-[95vh] overflow-hidden flex flex-col border border-gray-200 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Enhanced Header */}
                        <div
                            className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-8 py-8 flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-6">
                                    {selectedRentalDetails?.renter?.profile_picture ? (
                                        <img
                                            src={`https://drivable.app/storage/${selectedRentalDetails.renter.profile_picture}`}
                                            alt="Vermieter"
                                            className="w-16 h-16 rounded-full object-cover border-3 border-gray-300 shadow-sm"
                                        />
                                    ) : (
                                        <div
                                            className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-800 border-3 border-orange-200 shadow-sm">
                                            {(selectedRentalDetails?.renter?.company_name || selectedRental.renter?.company_name || 'U')[0]}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-bold text-gray-900">Miete #{selectedRental.id}</h2>
                                        <div className="flex items-center space-x-8 text-base text-gray-600">
                                            <span
                                                className="font-semibold">{selectedRentalDetails?.renter?.company_name || selectedRental.renter?.company_name}</span>
                                            <span>Erstellt: {formatDateTime(selectedRentalDetails?.created_at || selectedRental.created_at)}</span>
                                            {selectedRentalDetails?.updated_at && selectedRentalDetails.updated_at !== selectedRentalDetails.created_at && (
                                                <span>Aktualisiert: {formatDateTime(selectedRentalDetails.updated_at)}</span>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                <div className="flex items-center space-x-3">
                                    <select
                                        value={selectedRental.status}
                                        onChange={(e) => updateRentalStatus(selectedRental.id, parseInt(e.target.value))}
                                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-gray-400"
                                    >
                                        {Object.entries(statusOptions).map(([status, label]) => (
                                            <option key={status} value={status}>{label}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => deleteRental(selectedRental.id)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                                    >
                                        Löschen
                                    </button>

                                    <button
                                        onClick={() => {
                                            setSelectedRental(null);
                                            setSelectedRentalDetails(null);
                                        }}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Header with gradient background like Vermieter.jsx */}


                        {/* Tab Navigation (like Vermieter.jsx) */}
                        <div className="border-b border-gray-200 px-6 space-y-4">
                            <nav className="-mb-px flex space-x-8 ">
                                <button
                                    onClick={() => handleTabChange('car')}
                                    className={`py-5 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'car'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    🚗 Auto & Miete
                                </button>
                                <button
                                    onClick={() => handleTabChange('renter')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'renter'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    👤 Mieter
                                </button>
                                <button
                                    onClick={() => handleTabChange('landlord')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'landlord'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    🏢 Vermieter
                                </button>
                                <button
                                    onClick={() => handleTabChange('chat')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'chat'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    💬 Chat
                                </button>
                                <button
                                    onClick={() => handleTabChange('edit')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'edit'
                                            ? 'border-orange-500 text-orange-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    ⚙️ Miete bearbeiten
                                </button>
                            </nav>
                        </div>

                        {/* Tab Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto bg-gray-50">
                            {activeTab === 'car' && (
                                <div className="p-8">
                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                        {/* Vehicle Information */}
                                        <div className="bg-white rounded-lg border border-gray-200">
                                            <div className="bg-gray-50 px-4 py-3 border-b">
                                                <h3 className="text-lg font-semibold text-gray-900">Fahrzeug
                                                    Information</h3>
                                            </div>

                                            <div className="p-6 space-y-6">
                                                {/* Car Image */}
                                                {(selectedRentalDetails?.car?.images || selectedRental.car?.images || []).length > 0 ? (
                                                    <div
                                                        className="aspect-[4/3] rounded-lg bg-gray-100 overflow-hidden">
                                                        <img
                                                            src={`https://drivable.app/storage/${(selectedRentalDetails?.car?.images || selectedRental.car?.images || [])[0]?.image_path}`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPktlaW4gQmlsZCB2ZXJmw7xnYmFyPC90ZXh0Pjwvc3ZnPg==';
                                                            }}
                                                            alt="Fahrzeug"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="aspect-[4/3] rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <div className="text-center">
                                                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2"
                                                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth="2"
                                                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                            </svg>
                                                            <span
                                                                className="text-sm text-gray-500">Kein Bild verfügbar</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Vehicle Header */}
                                                <div
                                                    className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                                                    <div
                                                        className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-lg font-bold relative">
                                                        {selectedRentalDetails?.car?.brand_info && getBrandIcon(selectedRentalDetails.car.brand_info) ? (
                                                            <img
                                                                src={getBrandIcon(selectedRentalDetails.car.brand_info)}
                                                                alt={selectedRentalDetails.car.brand_info.brandName}
                                                                className="h-8 w-8 object-contain"
                                                                onError={(e) => {
                                                                    // Hide broken image and show fallback
                                                                    e.target.style.display = 'none';
                                                                    const fallback = e.target.parentElement.querySelector('.fallback-text');
                                                                    if (fallback) fallback.style.display = 'block';
                                                                }}
                                                                onLoad={(e) => {
                                                                    // Hide fallback when image loads successfully
                                                                    const fallback = e.target.parentElement.querySelector('.fallback-text');
                                                                    if (fallback) fallback.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <span className="fallback-text"
                                                              style={{display: selectedRentalDetails?.car?.brand_info && getBrandIcon(selectedRentalDetails.car.brand_info) ? 'none' : 'block'}}>
                                                            {(selectedRentalDetails?.car?.brand_info?.brandName || selectedRentalDetails?.car?.brand || selectedRental.car?.brand || 'A')[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xl text-gray-900">{selectedRentalDetails?.car?.title || selectedRental.car?.title || 'Unbekanntes Auto'}</h4>
                                                        <p className="text-sm text-gray-500">Fahrzeug-ID:
                                                            #{selectedRentalDetails?.car?.id || 'Unbekannt'}</p>
                                                    </div>
                                                </div>



                                                {selectedRentalDetails?.car?.hash_id && (
                                                    <div className="pt-4">
                                                        <a
                                                            href={`https://drivable.app/car/${selectedRentalDetails.car.hash_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-colors duration-200"
                                                        >
                                                            <svg className="w-5 h-5 mr-2" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth="2"
                                                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                                            </svg>
                                                            Auto-Details öffnen
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rental Information */}
                                        <div className="bg-white rounded-lg border border-gray-200">
                                            <div className="bg-gray-50 px-4 py-3 border-b">
                                                <h3 className="text-lg font-semibold text-gray-900">Miete
                                                    Information</h3>
                                            </div>

                                            <div className="p-6 space-y-6">
                                                {/* Rental Period */}
                                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                                    <div className="text-gray-700 font-semibold mb-2">Mietzeitraum</div>
                                                    <div className="font-bold text-gray-900 text-xl">
                                                        {formatDate(selectedRentalDetails?.start_date || selectedRental.start_date)} - {formatDate(selectedRentalDetails?.end_date || selectedRental.end_date)}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div
                                                            className="text-gray-600 font-medium text-sm mb-1">Übergabezeiten
                                                        </div>
                                                        <div className="font-bold text-gray-900 text-lg">
                                                            {selectedRentalDetails?.start_hour || 'N/A'} - {selectedRentalDetails?.end_hour || 'N/A'} Uhr
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div className="text-gray-600 font-medium text-sm mb-1">Inkl.
                                                            Kilometer
                                                        </div>
                                                        <div className="font-bold text-gray-900 text-lg">
                                                            {selectedRentalDetails?.default_kilometers || selectedRental.default_kilometers || 'N/A'} km
                                                        </div>
                                                    </div>
                                                    <div className={`p-4 rounded-lg border ${getStatusBgColor(selectedRental.status)} border-gray-200`}>
                                                        <div className="text-gray-600 font-medium text-sm mb-1">Status
                                                        </div>
                                                        <div
                                                            className={`font-bold text-lg ${getStatusColor(selectedRental.status)}`}>{statusOptions[selectedRental.status]}</div>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div
                                                            className="text-gray-600 font-medium text-sm mb-1">Buchungs-ID
                                                        </div>
                                                        <div
                                                            className="font-bold text-gray-900 text-lg">#{selectedRental.id}</div>
                                                    </div>
                                                </div>

                                                {/* Kilometer Overview */}
                                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                                    <div
                                                        className="text-gray-700 font-semibold mb-4">Kilometer-Übersicht
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span
                                                                className="text-gray-600 font-medium">Inklusive:</span>
                                                            <span
                                                                className="font-bold text-gray-900 text-lg">{selectedRentalDetails?.default_kilometers || selectedRental.default_kilometers || '250'} km</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-600 font-medium">Extra:</span>
                                                            <span
                                                                className="font-bold text-gray-900 text-lg">{selectedRentalDetails?.extra_kilometers || '200'} km</span>
                                                        </div>
                                                        <div
                                                            className="flex justify-between items-center border-t border-gray-300 pt-3">
                                                            <span
                                                                className="font-bold text-gray-700 text-lg">Gesamt:</span>
                                                            <span
                                                                className="font-bold text-gray-900 text-2xl">{(parseInt(selectedRentalDetails?.default_kilometers || selectedRental.default_kilometers || '250') + parseInt(selectedRentalDetails?.extra_kilometers || '200'))} km</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Rental Note */}
                                                {(selectedRentalDetails?.rent_note || selectedRental.rent_note) && (
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div className="text-gray-700 font-semibold mb-2">Mietnotiz
                                                        </div>
                                                        <div
                                                            className="font-medium italic text-gray-900 text-base">"{selectedRentalDetails?.rent_note || selectedRental.rent_note}"
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment & Cost Information */}
                                        <div className="bg-white rounded-lg border border-gray-200">
                                            <div className="bg-gray-50 px-4 py-3 border-b">
                                                <h3 className="text-lg font-semibold text-gray-900">Zahlung &
                                                    Kosten</h3>
                                            </div>

                                            <div className="p-6 space-y-6">
                                                {/* Total Amount */}
                                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                                    <div className="text-gray-700 font-semibold mb-2">Gesamtbetrag</div>
                                                    <div className="text-3xl font-bold text-gray-900">
                                                        {formatMoney(selectedRentalDetails?.total_amount || selectedRental.total_amount || 0)}
                                                    </div>
                                                </div>

                                                {/* Cost Breakdown */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div className="text-gray-600 font-medium text-sm mb-1">Platform
                                                            Fee
                                                        </div>
                                                        <div className="font-bold text-gray-900 text-lg">
                                                            {formatMoney(selectedRentalDetails?.platform_fee || selectedRental.platform_fee || 0)}
                                                        </div>
                                                    </div>

                                                    {selectedRentalDetails?.refundable_amount && (
                                                        <div
                                                            className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                            <div
                                                                className="text-gray-600 font-medium text-sm mb-1">Erstattbar
                                                            </div>
                                                            <div className="font-bold text-gray-900 text-lg">
                                                                {formatMoney(selectedRentalDetails.refundable_amount)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(selectedRentalDetails?.refunded_amount || selectedRental.refunded_amount) && (
                                                        <div
                                                            className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                            <div
                                                                className="text-gray-600 font-medium text-sm mb-1">Bereits
                                                                erstattet
                                                            </div>
                                                            <div className="font-bold text-gray-900 text-lg">
                                                                {formatMoney(selectedRentalDetails?.refunded_amount || selectedRental.refunded_amount || 0)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Payment Information */}
                                                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                                    <div
                                                        className="text-gray-700 font-semibold mb-4">Zahlungsinformationen
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span
                                                                className="text-gray-600 font-medium">Zahlungsmethode:</span>
                                                            <span
                                                                className={`font-bold capitalize px-3 py-1 rounded-lg border ${
                                                                    (selectedRentalDetails?.payment_method_type || selectedRental.payment_method_type || '').toLowerCase() === 'klarna'
                                                                        ? 'bg-pink-100 text-pink-800 border-pink-300'
                                                                        : 'bg-white border-gray-300'
                                                                }`}>
                                                                {selectedRentalDetails?.payment_method_type || selectedRental.payment_method_type || 'Unbekannt'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span
                                                                className="text-gray-600 font-medium">Zahlungsstatus:</span>
                                                            <span
                                                                className={`font-bold px-3 py-1 rounded-lg text-sm border ${
                                                                    (selectedRentalDetails?.payment_status || selectedRental.payment_status) === 'completed' || (selectedRentalDetails?.payment_status || selectedRental.payment_status) === 'succeeded' ? 'bg-green-100 text-green-800 border-green-300' :
                                                                        (selectedRentalDetails?.payment_status || selectedRental.payment_status) === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                                            'bg-gray-100 text-gray-800 border-gray-300'
                                                                }`}>
                                                                {selectedRentalDetails?.payment_status || selectedRental.payment_status || 'Unbekannt'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Extras & Zusatzleistungen */}
                                                {selectedRentalDetails?.rent_extras && (
                                                    <div className="border-t pt-4">
                                                        <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                                            <svg className="w-4 h-4 mr-2 text-purple-600" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                            </svg>
                                                            Extras & Zusatzleistungen
                                                        </h5>

                                                        {/* Extra Kilometer */}
                                                        {selectedRentalDetails.rent_extras.extra_kilometers > 0 && (
                                                            <div
                                                                className="bg-orange-50 p-3 rounded-lg mb-2 border border-orange-200">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-medium text-orange-800">Extra Kilometer:</span>
                                                                    <span
                                                                        className="font-bold text-orange-900">+{selectedRentalDetails.rent_extras.extra_kilometers} km</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Weitere Extras */}
                                                        {selectedRentalDetails.rent_extras.extras && (
                                                            <div className="space-y-2">
                                                                {JSON.parse(selectedRentalDetails.rent_extras.extras || '[]').map((extra, index) => (
                                                                    <div key={index}
                                                                         className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                                                        <div
                                                                            className="flex justify-between items-center">
                                                                            <span
                                                                                className="font-medium text-purple-800">{extra.name}</span>
                                                                            <span
                                                                                className="font-bold text-purple-900">{formatMoney(extra.price)}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Rechnungs-Download */}
                                                <div className="border-t pt-4">
                                                    <a
                                                        href={getRechungDownloadUrl(selectedRental)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full inline-flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth="2"
                                                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                                        </svg>
                                                        Rechnung herunterladen (PDF)
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'renter' && (
                                <div className="p-6">
                                    <div className="space-y-6">
                                        {/* User Header & Stats */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center space-x-4 mb-6">
                                                {selectedRentalDetails?.user?.profile_image ? (
                                                    <img
                                                        src={`https://drivable.app/storage/${selectedRentalDetails.user.profile_image}`}
                                                        alt="Profilbild"
                                                        className="w-16 h-16 rounded-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 text-xl font-bold ${
                                                        selectedRentalDetails?.user?.profile_image ? 'hidden' : ''
                                                    }`}>
                                                    {(selectedRentalDetails?.user?.name || selectedRental.user?.name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">
                                                        {selectedRentalDetails?.user?.name || selectedRental.user?.name || 'Unbekannter Nutzer'}
                                                    </h3>
                                                    <p className="text-gray-600">User-ID:
                                                        #{selectedRentalDetails?.user?.id || selectedRental.user?.id || 'N/A'}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Registriert: {selectedRentalDetails?.user?.created_at ? formatDate(selectedRentalDetails.user.created_at) : 'Unbekannt'}
                                                    </p>

                                                </div>
                                            </div>

                                            {/* User Stats */}
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="bg-blue-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-blue-700">Angesehene
                                                        Autos
                                                    </div>
                                                    <div className="text-2xl font-semibold text-blue-600">
                                                        {selectedRentalDetails?.user?.viewed_cars_count || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-green-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-green-700">Buchungen</div>
                                                    <div className="text-2xl font-semibold text-green-600">
                                                        {selectedRentalDetails?.user?.bookings_count || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-purple-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-purple-700">E-Mail</div>
                                                    <div className="text-sm font-semibold text-purple-600">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            selectedRentalDetails?.user?.email_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {selectedRentalDetails?.user?.email_verified ? 'Verifiziert' : 'Nicht verifiziert'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="bg-orange-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-orange-700">Telefon</div>
                                                    <div className="text-xs font-medium text-orange-600">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            selectedRentalDetails?.user?.phone_number_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {selectedRentalDetails?.user?.phone_number_verified ? 'Verifiziert' : 'Nicht verifiziert'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {/* User Details */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                    </svg>
                                                    Benutzer Informationen
                                                </h3>

                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">E-Mail</div>
                                                        <div
                                                            className="text-sm text-gray-900">{selectedRentalDetails?.user?.email || selectedRental.user?.email || 'Nicht verfügbar'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">Telefon</div>
                                                        <div
                                                            className="text-sm text-gray-900">{selectedRentalDetails?.user?.phone_number || 'Nicht verfügbar'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">E-Mail
                                                            verifiziert
                                                        </div>
                                                        <div className="text-sm text-gray-900">
                                                            {selectedRentalDetails?.user?.email_verified_at ? formatDate(selectedRentalDetails.user.email_verified_at) : 'Nicht verifiziert'}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                                    </svg>
                                                    Schnellzugriff
                                                </h3>

                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => window.open(`https://crmnew.drivable.app/user?search=${selectedRentalDetails?.user?.email || selectedRental.user?.email}`, '_blank')}
                                                        className="w-full flex items-center justify-start px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth="2"
                                                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                                        </svg>
                                                        User-Details öffnen
                                                    </button>
                                                    <button
                                                        className="w-full flex items-center justify-start px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth="2"
                                                                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                        </svg>
                                                        E-Mail senden
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {/* Führerschein */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                    </svg>
                                                    Führerschein
                                                </h3>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Front License */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-medium text-gray-700">Vorderseite</h4>
                                                        <div className="relative">
                                                            {isLoadingLicenses ? (
                                                                <div
                                                                    className="border border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <div className="text-sm text-gray-500">Laden...
                                                                    </div>
                                                                </div>
                                                            ) : frontLicenseUrl ? (
                                                                <div
                                                                    className="border rounded-lg overflow-hidden bg-gray-50">
                                                                    <img
                                                                        src={frontLicenseUrl}
                                                                        alt="Führerschein Vorderseite"
                                                                        className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => window.open(frontLicenseUrl, '_blank')}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2"
                                                                         fill="none" stroke="currentColor"
                                                                         viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth="2"
                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                    </svg>
                                                                    <p className="text-sm text-gray-500">
                                                                        {licenseImageErrors.general ? licenseImageErrors.general : 'Nicht verfügbar'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Back License */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-medium text-gray-700">Rückseite</h4>
                                                        <div className="relative">
                                                            {isLoadingLicenses ? (
                                                                <div
                                                                    className="border border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <div className="text-sm text-gray-500">Laden...
                                                                    </div>
                                                                </div>
                                                            ) : backLicenseUrl ? (
                                                                <div
                                                                    className="border rounded-lg overflow-hidden bg-gray-50">
                                                                    <img
                                                                        src={backLicenseUrl}
                                                                        alt="Führerschein Rückseite"
                                                                        className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => window.open(backLicenseUrl, '_blank')}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2"
                                                                         fill="none" stroke="currentColor"
                                                                         viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth="2"
                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                    </svg>
                                                                    <p className="text-sm text-gray-500">
                                                                        {licenseImageErrors.general ? licenseImageErrors.general : 'Nicht verfügbar'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Personalausweis */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                                                    </svg>
                                                    Personalausweis
                                                </h3>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Front ID */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-medium text-gray-700">Vorderseite</h4>
                                                        <div className="relative">
                                                            {isLoadingIds ? (
                                                                <div
                                                                    className="border border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <div className="text-sm text-gray-500">Laden...
                                                                    </div>
                                                                </div>
                                                            ) : frontIdUrl ? (
                                                                <div
                                                                    className="border rounded-lg overflow-hidden bg-gray-50">
                                                                    <img
                                                                        src={frontIdUrl}
                                                                        alt="Ausweis Vorderseite"
                                                                        className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => window.open(frontIdUrl, '_blank')}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2"
                                                                         fill="none" stroke="currentColor"
                                                                         viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth="2"
                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                    </svg>
                                                                    <p className="text-sm text-gray-500">
                                                                        {idImageErrors.general ? idImageErrors.general : 'Nicht verfügbar'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Back ID */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-medium text-gray-700">Rückseite</h4>
                                                        <div className="relative">
                                                            {isLoadingIds ? (
                                                                <div
                                                                    className="border border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <div className="text-sm text-gray-500">Laden...
                                                                    </div>
                                                                </div>
                                                            ) : backIdUrl ? (
                                                                <div
                                                                    className="border rounded-lg overflow-hidden bg-gray-50">
                                                                    <img
                                                                        src={backIdUrl}
                                                                        alt="Ausweis Rückseite"
                                                                        className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => window.open(backIdUrl, '_blank')}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2"
                                                                         fill="none" stroke="currentColor"
                                                                         viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round" strokeWidth="2"
                                                                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                    </svg>
                                                                    <p className="text-sm text-gray-500">
                                                                        {idImageErrors.general ? idImageErrors.general : 'Nicht verfügbar'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Angesehene Autos & Buchungen */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {/* Angesehene Autos */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                                    </svg>
                                                    Angesehene Autos (Letzte 10)
                                                </h3>

                                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                                    {selectedRentalDetails?.user?.viewed_cars?.length ?
                                                        selectedRentalDetails.user.viewed_cars.slice(0, 10).map((car, index) => (
                                                            <div key={index}
                                                                 className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                                                <div
                                                                    className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                                                                    {car.image ? (
                                                                        <img
                                                                            src={`https://drivable.app/storage/${car.image}`}
                                                                            alt={car.title}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOSAxMmEzIDMgMCAxMS02IDAgMyAzIDAgMDE2IDB6IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Im0yMSAyMS0zLjUtMy41IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg=='}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="w-full h-full flex items-center justify-center text-gray-400">
                                                                            <svg className="w-6 h-6" fill="currentColor"
                                                                                 viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd"
                                                                                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                                                                      clipRule="evenodd"/>
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div
                                                                        className="text-sm font-medium text-gray-900">{car.title || 'Unbekanntes Auto'}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {car.view_count ? `${car.view_count} mal angesehen` : 'Angesehen'}
                                                                        {car.last_viewed && ` • ${formatDate(car.last_viewed)}`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-center py-4 text-gray-500">
                                                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400"
                                                                     fill="none" stroke="currentColor"
                                                                     viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                                          strokeWidth="2" d="M19 11H5m14-7H5m14 14H5"/>
                                                                </svg>
                                                                Keine angesehenen Autos
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </div>

                                            {/* Bisherige Buchungen */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                                    </svg>
                                                    Bisherige Buchungen (Alle Status)
                                                </h3>

                                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                                    {selectedRentalDetails?.user?.all_bookings?.length ?
                                                        selectedRentalDetails.user.all_bookings.map((booking, index) => (
                                                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div
                                                                        className="text-sm font-medium text-gray-900">#{booking.id}</div>
                                                                    <span
                                                                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusBgColor(booking.status)} ${getStatusColor(booking.status)}`}>
                                                                        {statusOptions[booking.status]}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    {booking.car_title || 'Unbekanntes Auto'}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {formatDate(booking.created_at)} • {formatMoney(booking.total_amount || 0)}
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-center py-4 text-gray-500">
                                                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400"
                                                                     fill="none" stroke="currentColor"
                                                                     viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                                          strokeWidth="2"
                                                                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                                                </svg>
                                                                Keine bisherigen Buchungen
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'landlord' && (
                                <div className="p-6">
                                    <div className="space-y-6">
                                        {/* Vermieter Header & Basic Info */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center space-x-4 mb-6">
                                                {selectedRentalDetails?.renter?.profile_picture ? (
                                                    <img
                                                        src={`https://drivable.app/storage/${selectedRentalDetails?.renter?.profile_picture}`}
                                                        alt="Vermieter Profilbild"
                                                        className="w-16 h-16 rounded-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}

                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">
                                                        {selectedRentalDetails?.renter?.company_name || selectedRental.renter?.company_name || 'Unbekannter Vermieter'}
                                                    </h3>
                                                    <p className="text-gray-600">Vermieter-ID:
                                                        #{selectedRentalDetails?.renter?.id || selectedRental.renter?.id || 'N/A'}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Registriert: {selectedRentalDetails?.renter?.created_at ? formatDate(selectedRentalDetails.renter.created_at) : 'Unbekannt'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Vermieter Stats */}
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="bg-blue-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-blue-700">Gesamtmieten
                                                    </div>
                                                    <div className="text-2xl font-semibold text-blue-600">
                                                        {selectedRentalDetails?.renter?.statistics?.total_rentals || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-green-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-green-700">Abgeschlossen
                                                    </div>
                                                    <div className="text-2xl font-semibold text-green-600">
                                                        {selectedRentalDetails?.renter?.statistics?.completed_rentals || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-purple-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-purple-700">Aktiv &
                                                        Bezahlt
                                                    </div>
                                                    <div className="text-2xl font-semibold text-purple-600">
                                                        {selectedRentalDetails?.renter?.statistics?.active_rentals || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-orange-50 rounded-lg p-4 text-center">
                                                    <div className="text-sm font-medium text-orange-700">Gesamtumsatz
                                                    </div>
                                                    <div className="text-lg font-semibold text-orange-600">
                                                        {formatMoney(selectedRentalDetails?.renter?.statistics?.total_revenue || 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {/* Vermieter Details */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-orange-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h6M7 3v18M3 21l18 0"/>
                                                    </svg>
                                                    Vermieter-Informationen
                                                </h3>
                                                <div className="space-y-4 text-sm">
                                                    <div>
                                                        <div className="text-gray-600 font-medium">E-Mail</div>
                                                        <div
                                                            className="text-gray-900">{selectedRentalDetails?.renter?.user?.email || selectedRentalDetails?.renter?.email || 'Nicht verfügbar'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Telefonnummer</div>
                                                        <div
                                                            className="text-gray-900">{selectedRentalDetails?.renter?.user?.phone_number || selectedRentalDetails?.renter?.phone || 'Nicht verfügbar'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Steuernummer</div>
                                                        <div
                                                            className="text-gray-900">{selectedRentalDetails?.renter?.tax_number || 'Nicht hinterlegt'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Verfügbarkeit
                                                            (Worktimes)
                                                        </div>
                                                        <div className="text-gray-900">
                                                            {selectedRentalDetails?.renter?.availableStartTime || '09:00'} - {selectedRentalDetails?.renter?.availableEndTime || '18:00'} Uhr
                                                        </div>
                                                    </div>
                                                    {selectedRentalDetails?.renter?.company_address && (
                                                        <div>
                                                            <div className="text-gray-600 font-medium">Firmenadresse
                                                            </div>
                                                            <div
                                                                className="text-gray-900 text-sm">{selectedRentalDetails.renter.company_address}</div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Verifikation</div>
                                                        <span
                                                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                                                selectedRentalDetails?.renter?.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {selectedRentalDetails?.renter?.verified ? 'Verifiziert' : 'Nicht verifiziert'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stripe & Zahlungen */}
                                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                                    </svg>
                                                    Stripe & Zahlungen
                                                </h3>
                                                <div className="space-y-4 text-sm">
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Stripe Status</div>
                                                        <span
                                                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                                                selectedRentalDetails?.renter?.stripe_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {selectedRentalDetails?.renter?.stripe_enabled ? 'Aktiviert' : 'Nicht aktiviert'}
                                                        </span>
                                                    </div>
                                                    {selectedRentalDetails?.renter?.stripe_account_id && (
                                                        <div>
                                                            <div className="text-gray-600 font-medium">Stripe Account
                                                                ID
                                                            </div>
                                                            <div
                                                                className="font-mono text-xs bg-gray-50 p-2 rounded break-all text-gray-900">
                                                                {selectedRentalDetails.renter.stripe_account_id}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Zahlungsmethoden
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {selectedRentalDetails?.renter?.allowCash && (
                                                                <span
                                                                    className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Bargeld</span>
                                                            )}
                                                            {selectedRentalDetails?.renter?.allowDigitalPayment && (
                                                                <span
                                                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Digital</span>
                                                            )}
                                                            {!selectedRentalDetails?.renter?.allowCash && !selectedRentalDetails?.renter?.allowDigitalPayment && (
                                                                <span
                                                                    className="text-gray-500 text-xs">Nicht definiert</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Performance</div>
                                                        <div className="space-y-2 mt-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-xs">Annahmerate:</span>
                                                                <span
                                                                    className="text-xs font-medium">{selectedRentalDetails?.renter?.statistics?.acceptance_rate || 0}%</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-xs">Abschlussrate:</span>
                                                                <span
                                                                    className="text-xs font-medium">{selectedRentalDetails?.renter?.statistics?.completion_rate || 0}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alle Mieten des Vermieters */}
                                        {selectedRentalDetails?.renter?.all_rentals && selectedRentalDetails.renter.all_rentals.length > 0 && (
                                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                <h3 className="font-bold text-lg mb-4 flex items-center">
                                                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth="2"
                                                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                                    </svg>
                                                    Alle Mieten des Vermieters (Letzte 10)
                                                </h3>
                                                <div className="space-y-2">
                                                    {selectedRentalDetails.renter.all_rentals.map((rental, index) => (
                                                        <div key={index}
                                                             className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                                            <div className="flex items-center space-x-3">
                                                                <div
                                                                    className="font-medium text-gray-900">#{rental.id}</div>
                                                                <div className="text-gray-600">{rental.user_name}</div>
                                                            </div>
                                                            <div className="flex items-center space-x-3">
                                                                <span
                                                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                                                        getStatusBgColor(rental.status)
                                                                    } ${getStatusColor(rental.status)}`}>
                                                                    {statusOptions[rental.status]}
                                                                </span>
                                                                <div
                                                                    className="font-medium text-gray-900 min-w-[80px] text-right">
                                                                    {formatMoney(rental.total_amount)}
                                                                </div>
                                                                <div
                                                                    className="text-gray-500 text-xs min-w-[80px] text-right">
                                                                    {formatDate(rental.created_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-semibold text-gray-900">Chat-Übersicht</h3>
                                            <button
                                                onClick={() => fetchChatData(selectedRental.id)}
                                                disabled={chatLoading}
                                                className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                                            >
                                                {chatLoading ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                             fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10"
                                                                    stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor"
                                                                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Laden...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 mr-1.5" fill="none"
                                                             stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2}
                                                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                                        </svg>
                                                        Chat-Reload
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {chatLoading ? (
                                            <div className="text-center py-8">
                                                <div className="inline-flex items-center gap-2 text-gray-500">
                                                    <div
                                                        className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                                                    Lade Chat...
                                                </div>
                                            </div>
                                        ) : chatData?.error ? (
                                            <div className="text-center py-8">
                                                <div className="text-red-500">{chatData.error}</div>
                                            </div>
                                        ) : !chatData?.chat ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <div className="flex flex-col items-center gap-3">
                                                    <svg className="w-12 h-12 text-gray-400" fill="none"
                                                         stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={1.5}
                                                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                                    </svg>
                                                    <p className="font-medium">Kein Chat gefunden</p>
                                                    <p className="text-sm">{chatData?.message || 'Kein Chat zwischen diesem Mieter und Vermieter gefunden.'}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border rounded-lg p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <h4 className="font-medium text-gray-900">
                                                                Chat
                                                                mit {chatData.chat.renter?.company_name || 'Vermieter'}
                                                            </h4>
                                                            <div className="flex gap-2">
                                                                <span
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {chatData.messages.length} Nachrichten
                                                                </span>
                                                                {chatData.messages.filter(msg => msg.violations && msg.violations.length > 0).length > 0 && (
                                                                    <span
                                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                        🚫 {chatData.messages.filter(msg => msg.violations && msg.violations.length > 0).length} Zensiert
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="mb-2">
                                                            <p className="text-sm text-gray-500">Zwischen:</p>
                                                            <p className="font-medium text-sm">{chatData.chat.user?.name} ↔ {chatData.chat.renter?.company_name}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Chat Messages */}
                                                <div className="relative">
                                                    <div
                                                        id="chat-messages-container"
                                                        className="max-h-[60vh] overflow-y-auto pr-2"
                                                        onScroll={handleScroll}
                                                    >
                                                        <div className="space-y-4">
                                                            {chatData.messages.length === 0 ? (
                                                                <div className="text-center py-12 text-gray-500">
                                                                    <div className="flex flex-col items-center gap-4">
                                                                        <svg className="w-16 h-16 text-gray-300"
                                                                             fill="none" stroke="currentColor"
                                                                             viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round"
                                                                                  strokeLinejoin="round" strokeWidth={1}
                                                                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                                                        </svg>
                                                                        <div>
                                                                            <p className="font-semibold text-lg text-gray-600">Keine
                                                                                Nachrichten</p>
                                                                            <p className="text-gray-500 mt-1">In diesem
                                                                                Chat wurden noch keine Nachrichten
                                                                                ausgetauscht.</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                chatData.messages.map((message) => (
                                                                    <div key={message.id}
                                                                         className={`flex ${message.sender_id !== chatData.chat.user_id ? 'justify-start' : 'justify-end'}`}>
                                                                        <div
                                                                            className={`max-w-2xl rounded-lg shadow-sm border ${
                                                                                message.violations && message.violations.length > 0
                                                                                    ? 'bg-red-50 border-red-200'
                                                                                    : message.sender_id !== chatData.chat.user_id
                                                                                        ? 'bg-white border-gray-200'
                                                                                        : 'bg-blue-50 border-blue-200'
                                                                            }`}>
                                                                            <div
                                                                                className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                                                                <div
                                                                                    className="flex items-center gap-2">
                                                                                    {/* Profile Image */}
                                                                                    <div
                                                                                        className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                                                                        {message.sender_id !== chatData.chat.user_id ? (
                                                                                            // Vermieter Profilbild
                                                                                            selectedRentalDetails?.renter?.user?.profile_image ? (
                                                                                                <img
                                                                                                    src={`https://drivable.app/storage/${selectedRentalDetails.renter.user.profile_image}`}
                                                                                                    alt="Vermieter"
                                                                                                    className="w-full h-full object-cover"
                                                                                                    onError={(e) => {
                                                                                                        e.target.style.display = 'none';
                                                                                                        e.target.nextSibling.style.display = 'flex';
                                                                                                    }}
                                                                                                />
                                                                                            ) : (
                                                                                                <div
                                                                                                    className="w-full h-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-medium">
                                                                                                    {chatData.chat.renter?.company_name?.charAt(0).toUpperCase()}
                                                                                                </div>
                                                                                            )
                                                                                        ) : (
                                                                                            // Mieter Profilbild
                                                                                            selectedRentalDetails?.user?.profile_image ? (
                                                                                                <img
                                                                                                    src={`https://drivable.app/storage/${selectedRentalDetails.user.profile_image}`}
                                                                                                    alt="Mieter"
                                                                                                    className="w-full h-full object-cover"
                                                                                                    onError={(e) => {
                                                                                                        e.target.style.display = 'none';
                                                                                                        e.target.nextSibling.style.display = 'flex';
                                                                                                    }}
                                                                                                />
                                                                                            ) : (
                                                                                                <div
                                                                                                    className="w-full h-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium">
                                                                                                    {chatData.chat.user?.name?.charAt(0).toUpperCase()}
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="font-medium text-sm text-gray-900">
                                                                                        {message.sender_id !== chatData.chat.user_id
                                                                                            ? chatData.chat.renter?.company_name + ' (Vermieter)'
                                                                                            : chatData.chat.user?.name + ' (Mieter)'
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
                                                                                    {new Date(message.created_at).toLocaleDateString('de-DE', {
                                                                                        day: '2-digit',
                                                                                        month: '2-digit',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })}
                                                                                </p>
                                                                            </div>

                                                                            <div className="p-4">
                                                                                <p className="text-gray-900 leading-relaxed">{message.content}</p>
                                                                            </div>

                                                                            <div className={`px-4 py-3 border-t ${
                                                                                message.violations && message.violations.length > 0
                                                                                    ? 'bg-red-100 border-red-200'
                                                                                    : 'bg-gray-50 border-gray-200'
                                                                            }`}>
                                                                                {message.violations && message.violations.length > 0 ? (
                                                                                    <div className="space-y-3">
                                                                                        <div
                                                                                            className="flex items-center gap-2">
                                                                                        <span
                                                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-900">
                                                                                            🚫 Zensiert
                                                                                        </span>
                                                                                            <span
                                                                                                className="text-xs text-red-700 font-medium">
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
                                                                                    <div
                                                                                        className="flex justify-between items-center">
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
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Scroll to Bottom Button */}
                                                    {showScrollToBottom && (
                                                        <button
                                                            onClick={scrollToBottom}
                                                            className="absolute bottom-4 right-4 bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-10"
                                                            title="Zum Ende scrollen"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                                 viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'edit' && (
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-semibold text-gray-900">Miete bearbeiten</h3>
                                        </div>

                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h4 className="font-bold text-lg mb-4">Mietzeitraum ändern</h4>

                                            <div className="grid grid-cols-2 gap-6 mb-6">
                                                {/* Current dates display */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h5 className="font-medium text-gray-700 mb-2">Aktuelle Miete</h5>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <p>
                                                            <strong>Start:</strong> {selectedRentalDetails?.start_date ? new Date(selectedRentalDetails.start_date).toLocaleDateString('de-DE') : 'Nicht gesetzt'}
                                                        </p>
                                                        {selectedRentalDetails?.start_time && (
                                                            <p className="ml-4 text-xs">
                                                                <strong>Zeit:</strong> {selectedRentalDetails.start_time}
                                                            </p>
                                                        )}
                                                        <p>
                                                            <strong>Ende:</strong> {selectedRentalDetails?.end_date ? new Date(selectedRentalDetails.end_date).toLocaleDateString('de-DE') : 'Nicht gesetzt'}
                                                        </p>
                                                        {selectedRentalDetails?.end_time && (
                                                            <p className="ml-4 text-xs">
                                                                <strong>Zeit:</strong> {selectedRentalDetails.end_time}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* New dates input */}
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-1">
                                                                Neues Startdatum
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={newStartDate}
                                                                onChange={(e) => setNewStartDate(e.target.value)}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-1">
                                                                Startzeit (optional)
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={newStartTime}
                                                                onChange={(e) => setNewStartTime(e.target.value)}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-1">
                                                                Neues Enddatum
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={newEndDate}
                                                                onChange={(e) => setNewEndDate(e.target.value)}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                className="block text-sm font-medium text-gray-700 mb-1">
                                                                Endzeit (optional)
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={newEndTime}
                                                                onChange={(e) => setNewEndTime(e.target.value)}
                                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Save button */}
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        setNewStartDate(selectedRentalDetails?.start_date || '');
                                                        setNewEndDate(selectedRentalDetails?.end_date || '');
                                                        setNewStartTime(selectedRentalDetails?.start_time || '');
                                                        setNewEndTime(selectedRentalDetails?.end_time || '');
                                                    }}
                                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                                                >
                                                    Zurücksetzen
                                                </button>
                                                <button
                                                    onClick={saveRentalDates}
                                                    disabled={saving || !newStartDate || !newEndDate || new Date(newEndDate) <= new Date(newStartDate)}
                                                    className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <svg
                                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                                                                fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                                                        stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor"
                                                                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Speichern...
                                                        </>
                                                    ) : (
                                                        'Miete aktualisieren'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Censor Modal */}
            {showCensorModal && selectedMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
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
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
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

            {/* Notification Modal (like Vermieter.jsx) */}
            {showNotificationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-slide-up">
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
                            <p className="text-gray-700 whitespace-pre-line">{notificationData.message}</p>
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
