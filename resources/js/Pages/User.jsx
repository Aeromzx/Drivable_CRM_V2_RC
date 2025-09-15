import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function User({ search, sort, filter }) {
    const [loading, setLoading] = useState(true);
    const [loadingUserDetails, setLoadingUserDetails] = useState(false);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [sortBy, setSortBy] = useState(sort || 'newest');
    const [activeFilter, setActiveFilter] = useState(filter || 'all');
    const [stats, setStats] = useState({
        total_users: 0,
        only_email_verified: 0,
        phone_verified: 0,
        id_uploaded: 0,
        license_uploaded: 0,
        all_verified: 0
    });
    const [chartData, setChartData] = useState({
        registrations: [],
        growth: []
    });
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });

    // User Details Modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState({});
    const [activeTab, setActiveTab] = useState('cars');
    const [expandedCar, setExpandedCar] = useState(null);
    const [carsViewMode, setCarsViewMode] = useState('cards');
    const [bookingViewMode, setBookingViewMode] = useState('cards');
    const [carsSortBy, setCarsSortBy] = useState('views');
    const [bookingSortBy, setBookingSortBy] = useState('newest');
    const [carActivityData, setCarActivityData] = useState({ lifetime: [], thirty_days: [] });
    const [bookingActivityData, setBookingActivityData] = useState({ lifetime: [], thirty_days: [] });

    // Chat-related state variables
    const [showChatDetailsModal, setShowChatDetailsModal] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [showCensorModal, setShowCensorModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [censorReason, setCensorReason] = useState('');
    const [censorType, setCensorType] = useState('manual_review');
    const [showConfirmUncensor, setShowConfirmUncensor] = useState(false);
    const [messageToUncensor, setMessageToUncensor] = useState(null);
    const [chatSummary, setChatSummary] = useState(null);
    const [showChatSummaryModal, setShowChatSummaryModal] = useState(false);

    // Push & WhatsApp
    const [pushMessage, setPushMessage] = useState('');
    const [sendingPush, setSendingPush] = useState(false);
    const [pushResult, setPushResult] = useState(null);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
    const [whatsappResult, setWhatsappResult] = useState(null);

    // Notification System
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationData, setNotificationData] = useState({ type: 'success', title: '', message: '' });

    const tabs = [
        { id: 'cars', name: 'Angesehene Autos' },
        { id: 'bookings', name: 'Buchungen & Anfragen' },
        { id: 'chats', name: 'Chats' },
        { id: 'whatsapp', name: 'WhatsApp' },
        { id: 'push', name: 'Push Benachrichtigungen' },
        { id: 'edit', name: 'Bearbeiten' }
    ];

    // Push Templates State
    const [pushTemplates, setPushTemplates] = useState([]);
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ title: '', message: '' });

    // Edit User State
    const [editUserData, setEditUserData] = useState({});
    const [originalPasswordHash, setOriginalPasswordHash] = useState('');
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [saveUserLoading, setSaveUserLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordHistory, setPasswordHistory] = useState([]);
    const [showPasswordHistory, setShowPasswordHistory] = useState(false);
    
    // Document Images State
    const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
    const [isLoadingIds, setIsLoadingIds] = useState(false);
    const [frontLicenseUrl, setFrontLicenseUrl] = useState(null);
    const [backLicenseUrl, setBackLicenseUrl] = useState(null);
    const [frontIdUrl, setFrontIdUrl] = useState(null);
    const [backIdUrl, setBackIdUrl] = useState(null);
    const [licenseImageErrors, setLicenseImageErrors] = useState({});
    const [idImageErrors, setIdImageErrors] = useState({});

    const predefinedWhatsappMessages = [
        { title: "Willkommen", message: "Hallo {name}! Willkommen bei Drivable. Bei Fragen stehen wir dir gerne zur Verfügung." },
        { title: "Mietanfrage bestätigt", message: "Hallo {name}! Deine Mietanfrage wurde bestätigt. Du kannst jetzt bezahlen." },
        { title: "Dokumente fehlen", message: "Hallo {name}! Bitte lade deine fehlenden Dokumente in der App hoch." },
        { title: "Erinnerung Bezahlung", message: "Hallo {name}! Vergiss nicht deine Miete zu bezahlen. Der Link ist in der App." },
        { title: "Support", message: "Hallo {name}! Unser Support-Team ist für dich da. Schreib uns deine Frage." }
    ];

    const brands = {
        '1': 'Mercedes-Benz', '2': 'BMW', '3': 'Audi', '5': 'Lamborghini',
        '8': 'Ford', '16': 'Nissan'
    };

    const statuses = {
        0: { text: 'Angefragt', class: 'bg-yellow-100 text-yellow-800' },
        1: { text: 'Storniert', class: 'bg-gray-100 text-gray-800' },
        2: { text: 'Akzeptiert', class: 'bg-green-100 text-green-800' },
        3: { text: 'Abgelehnt', class: 'bg-red-100 text-red-800' },
        4: { text: 'Bezahlt', class: 'bg-blue-100 text-blue-800' },
        5: { text: 'Aktiv', class: 'bg-purple-100 text-purple-800' },
        6: { text: 'Abgeschlossen', class: 'bg-indigo-100 text-indigo-800' },
        7: { text: 'Storniert (Vermieter)', class: 'bg-orange-100 text-orange-800' },
        8: { text: 'Storniert (Nutzer)', class: 'bg-pink-100 text-pink-800' },
        9: { text: 'Erstattet', class: 'bg-teal-100 text-teal-800' },
        10: { text: 'Bewertet', class: 'bg-lime-100 text-lime-800' }
    };

    useEffect(() => {
        fetchUsers();
        fetchStats();
        fetchChartData();
        fetchPushTemplates();
    }, []);

    useEffect(() => {
        if (activeTab === 'bookings' && selectedUser) {
            fetchBookingActivity(selectedUser.id);
        }
    }, [activeTab, selectedUser]);

    // Initialize edit data when userDetails loads
    useEffect(() => {
        if (userDetails && userDetails.id) {
            setEditUserData({
                name: userDetails.name || '',
                email: userDetails.email || '',
                phone_number: userDetails.phone_number || ''
            });
        }
    }, [userDetails]);

    const fetchStats = async () => {
        try {
            const response = await axios.get('/getUserVerificationStats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchChartData = async () => {
        try {
            const response = await axios.get('/api/users/registration-stats');
            setChartData(response.data);
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
    };

    const fetchPushTemplates = async () => {
        try {
            const response = await axios.get('/api/push-templates');
            setPushTemplates(response.data.data);
        } catch (error) {
            console.error('Error fetching push templates:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/users/basic', {
                params: {
                    search: searchTerm,
                    sort: sortBy,
                    filter: activeFilter,
                    page: 1
                }
            });

            setUsers(response.data.data.data);
            setPagination(response.data.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showNotification('error', 'Fehler beim Laden', 'Benutzer konnten nicht geladen werden');
        } finally {
            setLoading(false);
        }
    };

    const goToPage = async (url) => {
        if (!url) return;
        try {
            setLoading(true);
            const response = await axios.get(url, {
                params: {
                    search: searchTerm,
                    sort: sortBy
                }
            });

            setUsers(response.data.data.data);
            setPagination(response.data.data);
        } catch (error) {
            console.error('Error navigating to page:', error);
            showNotification('error', 'Fehler beim Laden', 'Seite konnte nicht geladen werden');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId) => {
        try {
            setLoadingUserDetails(true);
            const response = await axios.get(`/api/users/detail/${userId}`);
            setUserDetails(response.data.data);

            // Store original password hash for restore functionality
            setOriginalPasswordHash(response.data.data.password || '');

            // Fetch car activity data for graphs
            fetchCarActivity(userId);
        } catch (error) {
            console.error('Error fetching user details:', error);
            showNotification('error', 'Fehler beim Laden', 'Benutzer-Details konnten nicht geladen werden');
        } finally {
            setLoadingUserDetails(false);
        }
    };

    const saveUserChanges = async () => {
        try {
            setSaveUserLoading(true);

            // Prepare data including verification fields
            const dataToSave = {
                ...editUserData,
                email_verified: editUserData.email_verified !== undefined ? editUserData.email_verified : userDetails.email_verified,
                phone_number_verified: editUserData.phone_number_verified !== undefined ? editUserData.phone_number_verified : userDetails.phone_number_verified
            };

            const response = await axios.put(`/api/users/${userDetails.id}/update`, dataToSave);

            // Update userDetails with the new data including verification fields
            setUserDetails(prev => ({
                ...prev,
                ...dataToSave
            }));

            // Reset edit state
            setEditUserData({});
            setIsEditingUser(false);

            // Refresh password history if password was changed
            if (dataToSave.password) {
                await fetchPasswordHistory(userDetails.id);
            }

            showNotification('success', 'Erfolgreich gespeichert', 'Benutzer-Daten wurden erfolgreich aktualisiert');
        } catch (error) {
            console.error('Error saving user changes:', error);
            showNotification('error', 'Fehler beim Speichern', 'Benutzer-Daten konnten nicht gespeichert werden');
        } finally {
            setSaveUserLoading(false);
        }
    };

    const toggleEmailVerification = () => {
        const currentValue = editUserData.email_verified !== undefined ? editUserData.email_verified : userDetails.email_verified;
        setEditUserData({...editUserData, email_verified: !currentValue});
    };

    const togglePhoneVerification = () => {
        const currentValue = editUserData.phone_number_verified !== undefined ? editUserData.phone_number_verified : userDetails.phone_number_verified;
        setEditUserData({...editUserData, phone_number_verified: !currentValue});
    };

    const fetchPasswordHistory = async (userId) => {
        try {
            const response = await axios.get(`/api/users/${userId}/password-history`);
            setPasswordHistory(response.data.data);
        } catch (error) {
            console.error('Error fetching password history:', error);
        }
    };

    const restorePasswordFromHistory = async (historyId) => {
        try {
            const response = await axios.post(`/api/users/${userDetails.id}/restore-password`, {
                history_id: historyId
            });

            if (response.data.success) {
                showNotification('success', 'Passwort wiederhergestellt', response.data.message);
                setShowPasswordHistory(false);
                setEditUserData({...editUserData, password: ''});
                await fetchPasswordHistory(userDetails.id);
            }
        } catch (error) {
            showNotification('error', 'Fehler', error.response?.data?.error || 'Passwort konnte nicht wiederhergestellt werden');
        }
    };

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

    const handleImageError = (type, side) => {
        if (type === 'license') {
            setLicenseImageErrors(prev => ({
                ...prev,
                [side]: `Fehler beim Laden der ${side === 'front' ? 'Vorderseite' : 'Rückseite'}`
            }));
        } else if (type === 'id') {
            setIdImageErrors(prev => ({
                ...prev,
                [side]: `Fehler beim Laden der ${side === 'front' ? 'Vorderseite' : 'Rückseite'}`
            }));
        }
    };

    const fetchCarActivity = async (userId) => {
        try {
            const response = await axios.get(`/api/users/${userId}/car-activity`);
            setCarActivityData(response.data);
        } catch (error) {
            console.error('Error fetching car activity:', error);
        }
    };

    const fetchBookingActivity = async (userId) => {
        try {
            const response = await axios.get(`/api/users/${userId}/booking-activity`);
            setBookingActivityData(response.data);
        } catch (error) {
            console.error('Error fetching booking activity:', error);
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        router.get('/user', {
            search: searchTerm,
            sort: sortBy,
            filter: activeFilter
        });
    };

    const handleSearchBlur = () => {
        if (searchTerm !== search) {
            handleSearch();
        }
    };

    const handleSortChange = (newSort) => {
        router.get('/user', {
            search: searchTerm,
            sort: newSort,
            filter: activeFilter
        });
    };

    const handleFilterChange = (newFilter) => {
        router.get('/user', {
            search: searchTerm,
            sort: sortBy,
            filter: newFilter
        });
    };

    const handlePageChange = (page) => {
        router.get('/user', {
            search: searchTerm,
            sort: sortBy,
            filter: activeFilter,
            page: page
        });
    };

    const openUserDetails = async (user) => {
        setSelectedUser(user.id);
        setUserDetails({
            ...user,
            viewed_cars: [],
            bookings: [],
            booking_initiations: [],
            chats: []
        });
        setActiveTab('cars');
        await fetchUserDetails(user.id);
        await fetchPasswordHistory(user.id);
        await fetchLicenseImages(user.id);
        await fetchIdImages(user.id);
    };

    const closeUserDetails = () => {
        setSelectedUser(null);
        setUserDetails({});
        setPushResult(null);
        setWhatsappResult(null);
        setPushMessage('');
        setWhatsappMessage('');
    };

    const showNotification = (type, title, message) => {
        setNotificationData({ type, title, message });
        setShowNotificationModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const getBrandName = (brandId) => {
        return brands[brandId] || brandId;
    };

    const getStatusText = (status) => {
        return statuses[status]?.text || `Status ${status}`;
    };

    const getStatusClass = (status) => {
        return statuses[status]?.class || 'bg-gray-100 text-gray-800';
    };

    const handleGenericImageError = (event) => {
        event.target.src = 'https://drivable.app/images/logo_drive_withoutText.png';
    };

    const sendPushNotification = async (e) => {
        e.preventDefault();
        if (!pushMessage.trim()) return;

        setSendingPush(true);
        setPushResult(null);

        try {
            const response = await axios.post('https://drivable.app/api/test-push/ce6947a6-d0b6-4e3e-bc2b-f65b3d5f6b95', {
                user_id: userDetails.id,
                text: pushMessage
            });

            setPushResult({
                success: response.data.success,
                message: response.data.message || 'Push-Benachrichtigung wurde erfolgreich gesendet.'
            });

            if (response.data.success) {
                setPushMessage('');
                await fetchUserDetails(userDetails.id);
            }
        } catch (error) {
            setPushResult({
                success: false,
                message: error.response?.data?.message || 'Fehler beim Senden der Push-Benachrichtigung.'
            });
        } finally {
            setSendingPush(false);
        }
    };

    const createPushTemplate = async (e) => {
        e.preventDefault();
        if (!newTemplate.title.trim() || !newTemplate.message.trim()) return;

        try {
            const response = await axios.post('/api/push-templates', newTemplate);
            if (response.data.success) {
                showNotification('success', 'Template erstellt', 'Push-Vorlage wurde erfolgreich erstellt');
                setNewTemplate({ title: '', message: '' });
                setShowCreateTemplateModal(false);
                await fetchPushTemplates();
            }
        } catch (error) {
            showNotification('error', 'Fehler', error.response?.data?.message || 'Fehler beim Erstellen der Vorlage');
        }
    };

    const applyPushTemplate = (template) => {
        setPushMessage(template.message);
    };

    const resendPushNotification = (notification) => {
        setPushMessage(notification.message);
    };

    const deletePushTemplate = async (templateId) => {
        if (!confirm('Vorlage wirklich löschen?')) return;

        try {
            const response = await axios.delete(`/api/push-templates/${templateId}`);
            if (response.data.success) {
                showNotification('success', 'Template gelöscht', 'Push-Vorlage wurde erfolgreich gelöscht');
                await fetchPushTemplates();
            }
        } catch (error) {
            showNotification('error', 'Fehler', error.response?.data?.message || 'Fehler beim Löschen der Vorlage');
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('success', 'Kopiert', 'Token wurde in die Zwischenablage kopiert');
        } catch (error) {
            showNotification('error', 'Fehler', 'Token konnte nicht kopiert werden');
        }
    };

    const sendWhatsappMessage = async (e) => {
        e.preventDefault();
        if (!whatsappMessage.trim()) return;

        setSendingWhatsapp(true);
        setWhatsappResult(null);

        try {
            const response = await axios.post(`/api/users/${userDetails.id}/whatsapp`, {
                message: whatsappMessage,
                is_template: true
            });

            setWhatsappResult({
                success: true,
                message: 'WhatsApp Nachricht erfolgreich gesendet!'
            });

            // Reload user details to get updated chat
            await fetchUserDetails(userDetails.id);
            setWhatsappMessage('');

            // Scroll to bottom after update
            setTimeout(() => {
                const chatContainer = document.querySelector('#whatsapp-chat-container');
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 100);
        } catch (error) {
            setWhatsappResult({
                success: false,
                message: error.response?.data?.message || 'Fehler beim Senden der WhatsApp Nachricht.'
            });
        } finally {
            setSendingWhatsapp(false);
        }
    };


    const applyPredefinedWhatsappMessage = (message) => {
        setWhatsappMessage(message.replace('{name}', userDetails.name || 'Benutzer'));
    };

    const handleChartHover = (event, data, type) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        let content = '';
        if (type === 'registration') {
            content = `${data.formatted_date}: ${data.count} Anmeldungen`;
        } else if (type === 'growth') {
            content = `${data.formatted_date}: ${data.total} User insgesamt`;
        }

        setTooltip({
            show: true,
            x: event.clientX,
            y: event.clientY - 50,
            content
        });
    };

    const handleChartLeave = () => {
        setTooltip({ show: false, x: 0, y: 0, content: '' });
    };

    // Chat functions
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
                showNotification('success', '✓ Nachricht entzensiert', 'Nachricht wurde freigegeben');

                // Reload user details to get updated chat data
                await fetchUserDetails(userDetails.id);

                // Update selected chat with fresh data
                if (selectedChat) {
                    const updatedUserDetails = await axios.get(`/api/users/detail/${userDetails.id}`);
                    const updatedChat = updatedUserDetails.data.data.chats.find(chat => chat.id === selectedChat.id);
                    if (updatedChat) {
                        setSelectedChat(updatedChat);
                    }
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
                showNotification('success', 'Nachricht zensiert', 'Nachricht wurde erfolgreich zensiert');

                // Reload user details to get updated chat data
                await fetchUserDetails(userDetails.id);

                // Update selected chat with fresh data
                if (selectedChat) {
                    const updatedUserDetails = await axios.get(`/api/users/detail/${userDetails.id}`);
                    const updatedChat = updatedUserDetails.data.data.chats.find(chat => chat.id === selectedChat.id);
                    if (updatedChat) {
                        setSelectedChat(updatedChat);
                    }
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

    const generateChatSummary = async (user) => {
        try {
            setLoading(true);
            const response = await axios.post(`/api/users/${user.id}/chats/summarize`);
            if (response.data.success) {
                setChatSummary(response.data.summary);
                setShowChatSummaryModal(true);
                showNotification('success', '🤖 User-Analyse erstellt', 'Analyse erfolgreich generiert');
            }
        } catch (error) {
            showNotification('error', 'Fehler bei KI-Analyse', error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    User Verwaltung
                </h2>
            }
        >
            <Head title="User" />

            <div className="py-6">
                <div className="mx-auto w-full sm:w-[90%] lg:w-[75%] xl:w-[60%] max-w-none px-4 sm:px-6 lg:px-8">

                    {/* Statistics Dashboard */}
                    <div className="mb-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            <button
                                onClick={() => handleFilterChange('all')}
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all ${
                                    activeFilter === 'all' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-500">Benutzer</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.total_users}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleFilterChange('email_verified')}
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all ${
                                    activeFilter === 'email_verified' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-500">E-Mail</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.only_email_verified}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleFilterChange('phone_verified')}
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all ${
                                    activeFilter === 'phone_verified' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-500">Telefon</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.phone_verified}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleFilterChange('id_uploaded')}
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all ${
                                    activeFilter === 'id_uploaded' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-500">Ausweis</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.id_uploaded}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleFilterChange('license_uploaded')}
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all ${
                                    activeFilter === 'license_uploaded' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 01-1 1H8a1 1 0 110-2h4a1 1 0 011 1zm-1 4a1 1 0 100-2H8a1 1 0 100 2h4z" clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-500">Führerschein</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.license_uploaded}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleFilterChange('all_verified')}
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all ${
                                    activeFilter === 'all_verified' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-500">Vollständig</p>
                                        <p className="text-2xl font-semibold text-gray-900">{stats.all_verified}</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            {/* Registration Timeline */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Anmeldungen (letzte 30 Tage)</h3>
                                <div className="h-32 relative">
                                    <svg viewBox="0 0 400 120" className="w-full h-full">
                                        <defs>
                                            <linearGradient id="registrationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                                                <stop offset="100%" stopColor="#f97316" stopOpacity="0.1"/>
                                            </linearGradient>
                                        </defs>

                                        {chartData.registrations.length > 0 && (() => {
                                            const maxCount = Math.max(...chartData.registrations.map(d => d.count), 1);
                                            const points = chartData.registrations.map((data, index) => {
                                                const x = (index / (chartData.registrations.length - 1)) * 360 + 20;
                                                const y = 100 - (data.count / maxCount) * 80;
                                                return `${x},${y}`;
                                            }).join(' ');

                                            return (
                                                <>
                                                    <polyline
                                                        fill="url(#registrationGradient)"
                                                        stroke="#f97316"
                                                        strokeWidth="2"
                                                        points={`20,100 ${points} 380,100`}
                                                    />
                                                    <polyline
                                                        fill="none"
                                                        stroke="#f97316"
                                                        strokeWidth="2"
                                                        points={points}
                                                    />
                                                    {chartData.registrations.map((data, index) => {
                                                        const x = (index / (chartData.registrations.length - 1)) * 360 + 20;
                                                        const y = 100 - (data.count / maxCount) * 80;
                                                        return (
                                                            <circle
                                                                key={index}
                                                                cx={x}
                                                                cy={y}
                                                                r="6"
                                                                fill="#f97316"
                                                                className="cursor-pointer hover:r-8 transition-all"
                                                                onMouseEnter={(e) => handleChartHover(e, data, 'registration')}
                                                                onMouseLeave={handleChartLeave}
                                                            />
                                                        );
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>{chartData.registrations[0]?.formatted_date}</span>
                                    <span>{chartData.registrations[chartData.registrations.length - 1]?.formatted_date}</span>
                                </div>
                            </div>

                            {/* Growth Chart */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Nutzerwachstum</h3>
                                <div className="h-32 relative">
                                    <svg viewBox="0 0 400 120" className="w-full h-full">
                                        <defs>
                                            <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
                                            </linearGradient>
                                        </defs>

                                        {chartData.growth.length > 0 && (() => {
                                            const maxTotal = Math.max(...chartData.growth.map(d => d.total), 1);
                                            const minTotal = Math.min(...chartData.growth.map(d => d.total));
                                            const points = chartData.growth.map((data, index) => {
                                                const x = (index / (chartData.growth.length - 1)) * 360 + 20;
                                                const y = 100 - ((data.total - minTotal) / (maxTotal - minTotal)) * 80;
                                                return `${x},${y}`;
                                            }).join(' ');

                                            return (
                                                <>
                                                    <polyline
                                                        fill="url(#growthGradient)"
                                                        stroke="#10b981"
                                                        strokeWidth="2"
                                                        points={`20,100 ${points} 380,100`}
                                                    />
                                                    <polyline
                                                        fill="none"
                                                        stroke="#10b981"
                                                        strokeWidth="2"
                                                        points={points}
                                                    />
                                                    {chartData.growth.map((data, index) => {
                                                        const x = (index / (chartData.growth.length - 1)) * 360 + 20;
                                                        const y = 100 - ((data.total - minTotal) / (maxTotal - minTotal)) * 80;
                                                        return (
                                                            <circle
                                                                key={index}
                                                                cx={x}
                                                                cy={y}
                                                                r="6"
                                                                fill="#10b981"
                                                                className="cursor-pointer hover:r-8 transition-all"
                                                                onMouseEnter={(e) => handleChartHover(e, data, 'growth')}
                                                                onMouseLeave={handleChartLeave}
                                                            />
                                                        );
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>{chartData.growth[0]?.total || 0}</span>
                                    <span>{chartData.growth[chartData.growth.length - 1]?.total || 0} User</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="bg-white shadow-sm sm:rounded-lg">
                        {/* Header */}
                        <div className="p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                                <h3 className="text-lg font-medium text-gray-900">Benutzer Übersicht</h3>

                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                    {/* Sort Filter */}
                                    <select
                                        value={sortBy}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="newest">Neueste zuerst</option>
                                        <option value="oldest">Älteste zuerst</option>
                                        <option value="activity">Meiste Aktivitäten</option>
                                        <option value="cars">Meiste Autos angesehen</option>
                                        <option value="bookings">Meiste Buchungen</option>
                                        <option value="chats">Meiste Chats</option>
                                    </select>

                                    {/* Search */}
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Suche nach Name, Email oder Telefonnummer..."
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
                        </div>

                        {/* Users Table */}
                        {loading ? (
                            <div className="flex justify-center items-center p-12">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Benutzer
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Verifizierung
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Geräteinfo
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Aktivitäten
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Aktionen
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                                        <div className="flex flex-col items-center">
                                                            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                            </svg>
                                                            <p className="text-lg font-medium">Keine Benutzer gefunden</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                users.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-10 w-10 flex-shrink-0">
                                                                    {user.profile_image ? (
                                                                        <img
                                                                            src={`https://drivable.app/storage/${user.profile_image}`}
                                                                            className="h-10 w-10 rounded-full object-cover"
                                                                            onError={handleGenericImageError}
                                                                        />
                                                                    ) : (
                                                                        <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                                    <div className="text-xs text-gray-400">{user.phone_number}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex gap-1">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    user.email_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    E-Mail
                                                                </span>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    user.phone_number_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    Telefon
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {user.device ? (
                                                                <div className="text-sm text-gray-900">
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{user.device.platform} {user.device.platform_version}</span>
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                            user.device.type === 'ios' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                                        }`}>
                                                                            {user.device.type}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Zuletzt: {formatDate(user.device.last_seen)}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-gray-500">Keine Gerätedaten</div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-wrap gap-1">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                                    {user.interaction_stats.viewed_cars_count} Autos
                                                                </span>
                                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                                    {user.interaction_stats.bookings_count} Buchungen
                                                                </span>
                                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                                    {user.interaction_stats.chats_count} Chats
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Gesamt: {user.interaction_stats.total_interactions} Interaktionen
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => openUserDetails(user)}
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors"
                                                            >
                                                                Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-4">
                                    {users.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <svg className="w-12 h-12 text-gray-400 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            <p className="text-lg font-medium">Keine Benutzer gefunden</p>
                                        </div>
                                    ) : (
                                        users.map((user) => (
                                            <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                {/* User Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="h-12 w-12 flex-shrink-0">
                                                            {user.profile_image ? (
                                                                <img
                                                                    src={`https://drivable.app/storage/${user.profile_image}`}
                                                                    className="h-12 w-12 rounded-full object-cover"
                                                                    onError={handleGenericImageError}
                                                                />
                                                            ) : (
                                                                <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                                            <p className="text-xs text-gray-400">{user.phone_number}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => openUserDetails(user)}
                                                        className="flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </div>

                                                {/* Verification Status */}
                                                <div className="mb-3">
                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Verifizierung</h4>
                                                    <div className="flex gap-2">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            user.email_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            E-Mail
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            user.phone_number_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            Telefon
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Device Info */}
                                                <div className="mb-3">
                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Gerät</h4>
                                                    {user.device ? (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm text-gray-900">{user.device.platform} {user.device.platform_version}</span>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    user.device.type === 'ios' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {user.device.type}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500">Zuletzt: {formatDate(user.device.last_seen)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">Keine Gerätedaten</p>
                                                    )}
                                                </div>

                                                {/* Activity Stats */}
                                                <div>
                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Aktivitäten</h4>
                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                            {user.interaction_stats.viewed_cars_count} Autos
                                                        </span>
                                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                            {user.interaction_stats.bookings_count} Buchungen
                                                        </span>
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                            {user.interaction_stats.chats_count} Chats
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500">Gesamt: {user.interaction_stats.total_interactions} Interaktionen</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.total > pagination.per_page && (
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Zeige <span className="font-medium">{pagination.from}</span> bis
                                            <span className="font-medium"> {pagination.to}</span> von
                                            <span className="font-medium"> {pagination.total}</span> Benutzern
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => handlePageChange(pagination.current_page - 1)}
                                                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${pagination.current_page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={pagination.current_page <= 1}
                                            >
                                                <span className="sr-only">Zurück</span>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                </svg>
                                            </button>

                                            {/* Page Numbers */}
                                            {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                                                let pageNum;
                                                if (pagination.last_page <= 5) {
                                                    pageNum = i + 1;
                                                } else {
                                                    if (pagination.current_page <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (pagination.current_page >= pagination.last_page - 2) {
                                                        pageNum = pagination.last_page - 4 + i;
                                                    } else {
                                                        pageNum = pagination.current_page - 2 + i;
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                            pageNum === pagination.current_page
                                                                ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            {/* Next Button */}
                                            <button
                                                onClick={() => handlePageChange(pagination.current_page + 1)}
                                                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${pagination.current_page >= pagination.last_page ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={pagination.current_page >= pagination.last_page}
                                            >
                                                <span className="sr-only">Weiter</span>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                                                </svg>
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Detail Modal */}
                    {selectedUser && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={(e) => e.target === e.currentTarget && closeUserDetails()}>
                            <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">
                                {loadingUserDetails ? (
                                    <div className="flex-1 flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Modal Header */}
                                        <div className="p-4 sm:p-6 border-b bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                                                    {userDetails.profile_image ? (
                                                        <img
                                                            src={`https://drivable.app/storage/${userDetails.profile_image}`}
                                                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
                                                            onError={handleGenericImageError}
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-lg flex-shrink-0">
                                                            {userDetails.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                                                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{userDetails.name}</h2>
                                                            <span className={`self-start px-2 py-1 rounded-full text-xs font-medium ${
                                                                userDetails.email_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {userDetails.email_verified ? 'E-Mail Verifiziert' : 'E-Mail Nicht Verifiziert'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{userDetails.email}</p>
                                                        <p className="text-xs sm:text-sm text-gray-600 truncate">{userDetails.phone_number || 'Keine Telefonnummer'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={closeUserDetails}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                                                >
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* User Stats */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                                                <div className="bg-blue-50 rounded-lg p-3 sm:p-4 text-center">
                                                    <div className="text-xs sm:text-sm font-medium text-blue-700">Angesehene Autos</div>
                                                    <div className="text-lg sm:text-2xl font-semibold text-blue-600">
                                                        {userDetails.interaction_stats?.viewed_cars_count || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-green-50 rounded-lg p-3 sm:p-4 text-center">
                                                    <div className="text-xs sm:text-sm font-medium text-green-700">Anfragen</div>
                                                    <div className="text-lg sm:text-2xl font-semibold text-green-600">
                                                        {userDetails.interaction_stats?.booking_initiations_count || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-purple-50 rounded-lg p-3 sm:p-4 text-center">
                                                    <div className="text-xs sm:text-sm font-medium text-purple-700">Buchungen</div>
                                                    <div className="text-lg sm:text-2xl font-semibold text-purple-600">
                                                        {userDetails.interaction_stats?.bookings_count || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-orange-50 rounded-lg p-3 sm:p-4 text-center">
                                                    <div className="text-xs sm:text-sm font-medium text-orange-700">Chats</div>
                                                    <div className="text-lg sm:text-2xl font-semibold text-orange-600">
                                                        {userDetails.interaction_stats?.chats_count || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Modal Content */}
                                        <div className="flex-1 overflow-auto">
                                            {/* Tabs */}
                                            <div className="border-b bg-gray-50 px-6">
                                                <nav className="flex space-x-8" aria-label="Tabs">
                                                    {tabs.map((tab) => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setActiveTab(tab.id)}
                                                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                                                activeTab === tab.id
                                                                    ? 'border-blue-500 text-blue-600'
                                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            {tab.name}
                                                        </button>
                                                    ))}
                                                </nav>
                                            </div>

                                            {/* Tab Content */}
                                            <div className="p-6">
                                                {/* Angesehene Autos Tab */}
                                                {activeTab === 'cars' && (
                                                    <div>
                                                        {userDetails.viewed_cars && userDetails.viewed_cars.length === 0 ? (
                                                            <div className="text-center p-8 bg-gray-50 rounded-lg">
                                                                <div className="flex flex-col items-center">
                                                                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14-7H5m14 14H5"/>
                                                                    </svg>
                                                                    <p className="text-lg font-medium text-gray-900">Keine angesehenen Autos</p>
                                                                    <p className="text-sm text-gray-500">Dieser Benutzer hat noch keine Autos angesehen.</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Activity Charts */}
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Auto-Aktivität (Lifetime)</h4>
                                                                        <div className="h-20 bg-white rounded border relative">
                                                                            <svg viewBox="0 0 300 80" className="w-full h-full">
                                                                                <defs>
                                                                                    <linearGradient id="lifetimeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                                                                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1"/>
                                                                                    </linearGradient>
                                                                                </defs>
                                                                                {carActivityData.lifetime.length > 0 && (() => {
                                                                                    const maxCount = Math.max(...carActivityData.lifetime.map(d => d.count), 1);
                                                                                    const points = carActivityData.lifetime.map((data, index) => {
                                                                                        const x = (index / (carActivityData.lifetime.length - 1)) * 260 + 20;
                                                                                        const y = 60 - (data.count / maxCount) * 40;
                                                                                        return `${x},${y}`;
                                                                                    }).join(' ');

                                                                                    return (
                                                                                        <>
                                                                                            <polyline
                                                                                                fill="url(#lifetimeGradient)"
                                                                                                stroke="#8b5cf6"
                                                                                                strokeWidth="1.5"
                                                                                                points={`20,60 ${points} 280,60`}
                                                                                            />
                                                                                            <polyline
                                                                                                fill="none"
                                                                                                stroke="#8b5cf6"
                                                                                                strokeWidth="1.5"
                                                                                                points={points}
                                                                                            />
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Auto-Aktivität (30 Tage)</h4>
                                                                        <div className="h-20 bg-white rounded border relative">
                                                                            <svg viewBox="0 0 300 80" className="w-full h-full">
                                                                                <defs>
                                                                                    <linearGradient id="thirtyDayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3"/>
                                                                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1"/>
                                                                                    </linearGradient>
                                                                                </defs>
                                                                                {carActivityData.thirty_days.length > 0 && (() => {
                                                                                    const maxCount = Math.max(...carActivityData.thirty_days.map(d => d.count), 1);
                                                                                    const points = carActivityData.thirty_days.map((data, index) => {
                                                                                        const x = (index / (carActivityData.thirty_days.length - 1)) * 260 + 20;
                                                                                        const y = 60 - (data.count / maxCount) * 40;
                                                                                        return `${x},${y}`;
                                                                                    }).join(' ');

                                                                                    return (
                                                                                        <>
                                                                                            <polyline
                                                                                                fill="url(#thirtyDayGradient)"
                                                                                                stroke="#06b6d4"
                                                                                                strokeWidth="1.5"
                                                                                                points={`20,60 ${points} 280,60`}
                                                                                            />
                                                                                            <polyline
                                                                                                fill="none"
                                                                                                stroke="#06b6d4"
                                                                                                strokeWidth="1.5"
                                                                                                points={points}
                                                                                            />
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* View Mode Toggle & Sort */}
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                                                        <button
                                                                            onClick={() => setCarsViewMode('cards')}
                                                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                                                carsViewMode === 'cards'
                                                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                                                    : 'text-gray-600 hover:text-gray-900'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                                                            </svg>
                                                                            Karten
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setCarsViewMode('table')}
                                                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                                                carsViewMode === 'table'
                                                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                                                    : 'text-gray-600 hover:text-gray-900'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                                                            </svg>
                                                                            Tabelle
                                                                        </button>
                                                                    </div>
                                                                    <select
                                                                        value={carsSortBy}
                                                                        onChange={(e) => setCarsSortBy(e.target.value)}
                                                                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    >
                                                                        <option value="views">Meiste Views</option>
                                                                        <option value="newest">Neueste zuerst</option>
                                                                        <option value="oldest">Älteste zuerst</option>
                                                                    </select>
                                                                </div>

                                                                {/* Cars Content */}
                                                                {(() => {
                                                                    // Sort cars based on selection
                                                                    let sortedCars = [...(userDetails.viewed_cars || [])];
                                                                    if (carsSortBy === 'views') {
                                                                        sortedCars.sort((a, b) => b.view_count - a.view_count);
                                                                    } else if (carsSortBy === 'newest') {
                                                                        sortedCars.sort((a, b) => new Date(b.last_viewed) - new Date(a.last_viewed));
                                                                    } else if (carsSortBy === 'oldest') {
                                                                        sortedCars.sort((a, b) => new Date(a.last_viewed) - new Date(b.last_viewed));
                                                                    }

                                                                    return carsViewMode === 'cards' ? (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                            {sortedCars.map((car) => (
                                                                                <div key={car.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                                                                                    <div className="aspect-w-16 aspect-h-10">
                                                                                        {car.image ? (
                                                                                            <img
                                                                                                src={`https://drivable.app/storage/${car.image}`}
                                                                                                className="w-full h-48 object-cover"
                                                                                                onError={handleGenericImageError}
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="w-full h-48 flex items-center justify-center bg-gray-200">
                                                                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                </svg>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="p-4">
                                                                                        <h4 className="font-semibold text-gray-900 mb-2">{car.title}</h4>
                                                                                        <div className="space-y-1 text-sm text-gray-600">
                                                                                            <div>Marke: {getBrandName(car.brand)}</div>
                                                                                            <div className="cursor-pointer text-blue-600 hover:text-blue-800" onClick={() => setExpandedCar(car.id === expandedCar ? null : car.id)}>
                                                                                                {car.view_count}x angesehen {car.id === expandedCar ? '▼' : '▶'}
                                                                                            </div>
                                                                                            <div>Zuletzt: {formatDate(car.last_viewed)}</div>
                                                                                        </div>
                                                                                        <div className="mt-3 flex gap-2">
                                                                                            <a
                                                                                                href={`https://drivable.app/car/${car.hash}`}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                                                                                            >
                                                                                                Auto öffnen
                                                                                            </a>
                                                                                        </div>
                                                                                        {car.id === expandedCar && car.view_details && (
                                                                                            <div className="mt-3 p-3 bg-blue-50 rounded border-t">
                                                                                                <h5 className="text-sm font-medium text-gray-900 mb-2">View-Historie:</h5>
                                                                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                                                                    {car.view_details.map((view, index) => (
                                                                                                        <div key={index} className="text-xs text-gray-600">
                                                                                                            {formatDate(view.created_at)}
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="overflow-x-auto">
                                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zuletzt angesehen</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                                    {sortedCars.map((car) => (
                                                                                        <tr key={car.id} className="hover:bg-gray-50">
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <div className="flex items-center">
                                                                                                    <div className="h-10 w-10 flex-shrink-0">
                                                                                                        {car.image ? (
                                                                                                            <img
                                                                                                                src={`https://drivable.app/storage/${car.image}`}
                                                                                                                className="h-10 w-10 rounded object-cover"
                                                                                                                onError={handleGenericImageError}
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                                                                                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                                                                                                </svg>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="ml-4">
                                                                                                        <div className="text-sm font-medium text-gray-900">{car.title}</div>
                                                                                                        <div className="text-sm text-gray-500">{getBrandName(car.brand)}</div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <div className="cursor-pointer text-blue-600 hover:text-blue-800" onClick={() => setExpandedCar(car.id === expandedCar ? null : car.id)}>
                                                                                                    {car.view_count}x {car.id === expandedCar ? '▼' : '▶'}
                                                                                                </div>
                                                                                                {car.id === expandedCar && car.view_details && (
                                                                                                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                                                                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                                                                                            {car.view_details.map((view, index) => (
                                                                                                                <div key={index} className="text-gray-600">
                                                                                                                    {formatDate(view.created_at)}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                                                {formatDate(car.last_viewed)}
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                                                <a
                                                                                                    href={`https://drivable.app/car/${car.hash}`}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors"
                                                                                                >
                                                                                                    Auto öffnen
                                                                                                </a>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Buchungen & Anfragen Tab */}
                                                {activeTab === 'bookings' && (
                                                    <div>
                                                        {(!userDetails.booking_initiations || userDetails.booking_initiations.length === 0) && (!userDetails.bookings || userDetails.bookings.length === 0) ? (
                                                            <div className="text-center p-8 bg-gray-50 rounded-lg">
                                                                <div className="flex flex-col items-center">
                                                                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                    </svg>
                                                                    <p className="text-lg font-medium text-gray-900">Keine Buchungen</p>
                                                                    <p className="text-sm text-gray-500">Dieser Benutzer hat noch keine Buchungen oder Anfragen gestellt.</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Activity Charts */}
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Buchungs-Aktivität (Lifetime)</h4>
                                                                        <div className="h-20 bg-white rounded border relative">
                                                                            <svg viewBox="0 0 300 80" className="w-full h-full">
                                                                                <defs>
                                                                                    <linearGradient id="lifetimeBookingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                                                                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1"/>
                                                                                    </linearGradient>
                                                                                </defs>
                                                                                {bookingActivityData.lifetime.length > 0 && (() => {
                                                                                    const maxCount = Math.max(...bookingActivityData.lifetime.map(d => d.count), 1);
                                                                                    const points = bookingActivityData.lifetime.map((data, index) => {
                                                                                        const x = (index / (bookingActivityData.lifetime.length - 1)) * 260 + 20;
                                                                                        const y = 60 - (data.count / maxCount) * 40;
                                                                                        return `${x},${y}`;
                                                                                    }).join(' ');

                                                                                    return (
                                                                                        <>
                                                                                            <polyline
                                                                                                fill="url(#lifetimeBookingGradient)"
                                                                                                stroke="#8b5cf6"
                                                                                                strokeWidth="1.5"
                                                                                                points={`20,60 ${points} 280,60`}
                                                                                            />
                                                                                            <polyline
                                                                                                fill="none"
                                                                                                stroke="#8b5cf6"
                                                                                                strokeWidth="1.5"
                                                                                                points={points}
                                                                                            />
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Buchungs-Aktivität (30 Tage)</h4>
                                                                        <div className="h-20 bg-white rounded border relative">
                                                                            <svg viewBox="0 0 300 80" className="w-full h-full">
                                                                                <defs>
                                                                                    <linearGradient id="thirtyDayBookingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3"/>
                                                                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1"/>
                                                                                    </linearGradient>
                                                                                </defs>
                                                                                {bookingActivityData.thirty_days.length > 0 && (() => {
                                                                                    const maxCount = Math.max(...bookingActivityData.thirty_days.map(d => d.count), 1);
                                                                                    const points = bookingActivityData.thirty_days.map((data, index) => {
                                                                                        const x = (index / (bookingActivityData.thirty_days.length - 1)) * 260 + 20;
                                                                                        const y = 60 - (data.count / maxCount) * 40;
                                                                                        return `${x},${y}`;
                                                                                    }).join(' ');

                                                                                    return (
                                                                                        <>
                                                                                            <polyline
                                                                                                fill="url(#thirtyDayBookingGradient)"
                                                                                                stroke="#06b6d4"
                                                                                                strokeWidth="1.5"
                                                                                                points={`20,60 ${points} 280,60`}
                                                                                            />
                                                                                            <polyline
                                                                                                fill="none"
                                                                                                stroke="#06b6d4"
                                                                                                strokeWidth="1.5"
                                                                                                points={points}
                                                                                            />
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Statistics Section - 4 important stats */}
                                                                {userDetails.booking_stats && (
                                                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                                                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                                                                            <div className="text-sm font-medium text-blue-700">Gesamtes Anfragevolumen</div>
                                                                            <div className="text-2xl font-semibold text-blue-600">
                                                                                {userDetails.booking_stats.total_request_volume || 0}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                                                                            <div className="text-sm font-medium text-purple-700">Bezahlt</div>
                                                                            <div className="text-2xl font-semibold text-purple-600">
                                                                                {userDetails.booking_stats.paid_bookings || 0}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-emerald-50 rounded-lg p-4 text-center">
                                                                            <div className="text-sm font-medium text-emerald-700">Abgeschlossen</div>
                                                                            <div className="text-2xl font-semibold text-emerald-600">
                                                                                {userDetails.booking_stats.completed_bookings || 0}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                                                                            <div className="text-sm font-medium text-orange-700">Bezahlt (Volumen)</div>
                                                                            <div className="text-2xl font-semibold text-orange-600">
                                                                                {formatCurrency(userDetails.booking_stats.paid_volume)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* View Mode Toggle & Sort */}
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                                                        <button
                                                                            onClick={() => setBookingViewMode('cards')}
                                                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                                                bookingViewMode === 'cards'
                                                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                                                    : 'text-gray-600 hover:text-gray-900'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                                                                            </svg>
                                                                            Karten
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setBookingViewMode('table')}
                                                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                                                                bookingViewMode === 'table'
                                                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                                                    : 'text-gray-600 hover:text-gray-900'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                                                            </svg>
                                                                            Tabelle
                                                                        </button>
                                                                    </div>
                                                                    <select
                                                                        value={bookingSortBy}
                                                                        onChange={(e) => setBookingSortBy(e.target.value)}
                                                                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    >
                                                                        <option value="newest">Neueste zuerst</option>
                                                                        <option value="oldest">Älteste zuerst</option>
                                                                        <option value="amount">Höchster Betrag</option>
                                                                    </select>
                                                                </div>

                                                                {/* Bookings Content */}
                                                                {(() => {
                                                                    // Combine all bookings (requests and completed)
                                                                    let allBookings = [
                                                                        ...(userDetails.booking_initiations || []).map(b => ({...b, type: 'request'})),
                                                                        ...(userDetails.bookings || []).map(b => ({...b, type: 'booking'}))
                                                                    ];

                                                                    // Sort bookings based on selection
                                                                    if (bookingSortBy === 'newest') {
                                                                        allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                                                    } else if (bookingSortBy === 'oldest') {
                                                                        allBookings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                                                                    } else if (bookingSortBy === 'amount') {
                                                                        allBookings.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
                                                                    }

                                                                    return bookingViewMode === 'cards' ? (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                            {allBookings.map((booking) => (
                                                                                <div key={`${booking.type}-${booking.id}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative">
                                                                                    {/* Status Badge - Top Right */}
                                                                                    <div className="absolute top-3 right-3 z-10">
                                                                                        {booking.type === 'request' ? (
                                                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-200 text-orange-800 shadow-sm">
                                                                                                Anfrage
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusClass(booking.status)}`}>
                                                                                                {getStatusText(booking.status)}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="aspect-w-16 aspect-h-10">
                                                                                        {booking.car?.images?.[0] ? (
                                                                                            <img
                                                                                                src={`https://drivable.app/storage/${booking.car.images[0].image_path}`}
                                                                                                className="w-full h-48 object-cover"
                                                                                                onError={handleGenericImageError}
                                                                                            />
                                                                                        ) : booking.car?.image ? (
                                                                                            <img
                                                                                                src={`https://drivable.app/storage/${booking.car.image}`}
                                                                                                className="w-full h-48 object-cover"
                                                                                                onError={handleGenericImageError}
                                                                                            />
                                                                                        ) : (
                                                                                            <div className="w-full h-48 flex items-center justify-center bg-gray-200">
                                                                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                </svg>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="p-4">
                                                                                        <h4 className="font-semibold text-gray-900 mb-2">{booking.car?.title || 'Auto nicht verfügbar'}</h4>
                                                                                        <div className="space-y-2 text-sm text-gray-600">
                                                                                            <div>Marke: {getBrandName(booking.car?.brand)}</div>
                                                                                            {/* Tracking Views Display */}
                                                                                            {booking.views_before_booking && (
                                                                                                <div className="flex items-center gap-1">
                                                                                                    <span className="text-gray-500">👀</span>
                                                                                                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border">
                                                                                                        {booking.views_before_booking}x angesehen vor Anfrage
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                            <div>Zeitraum: {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}</div>
                                                                                            <div>Preis: {formatCurrency(booking.total_price)}</div>
                                                                                        </div>
                                                                                        <div className="mt-3 flex gap-2">
                                                                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                                                                                #{booking.id}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="overflow-x-auto">
                                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zeitraum</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Erstellt</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                                    {allBookings.map((booking) => (
                                                                                        <tr key={`${booking.type}-${booking.id}`} className="hover:bg-gray-50">
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <div className="flex items-center">
                                                                                                    <div className="h-10 w-10 flex-shrink-0">
                                                                                                        {booking.car?.images?.[0] ? (
                                                                                                            <img
                                                                                                                src={`https://drivable.app/storage/${booking.car.images[0].image_path}`}
                                                                                                                className="h-10 w-10 rounded object-cover"
                                                                                                                onError={handleGenericImageError}
                                                                                                            />
                                                                                                        ) : booking.car?.image ? (
                                                                                                            <img
                                                                                                                src={`https://drivable.app/storage/${booking.car.image}`}
                                                                                                                className="h-10 w-10 rounded object-cover"
                                                                                                                onError={handleGenericImageError}
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                                                                                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                                </svg>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="ml-4">
                                                                                                        <div className="text-sm font-medium text-gray-900">{booking.car?.title || 'Auto nicht verfügbar'}</div>
                                                                                                        <div className="text-sm text-gray-500">{getBrandName(booking.car?.brand)}</div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                {booking.views_before_booking ? (
                                                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border">
                                                                                                        <span>👀</span>
                                                                                                        <span>{booking.views_before_booking}x</span>
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="text-xs text-gray-400">-</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                                                    booking.type === 'request'
                                                                                                        ? 'bg-orange-100 text-orange-800'
                                                                                                        : 'bg-green-100 text-green-800'
                                                                                                }`}>
                                                                                                    {booking.type === 'request' ? 'Anfrage' : 'Buchung'}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                                                <div>{new Date(booking.start_date).toLocaleDateString('de-DE')}</div>
                                                                                                <div>{new Date(booking.end_date).toLocaleDateString('de-DE')}</div>
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                {booking.type === 'request' ? (
                                                                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                                                                                                        Anfrage
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                                                                                                        {getStatusText(booking.status)}
                                                                                                    </span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                                {formatCurrency(booking.total_price)}
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                                                {formatDate(booking.created_at)}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </>
                                                        )}
                                                    </div>
                                                )}


                                                {/* Chats Tab */}
                                                {activeTab === 'chats' && (
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <h3 className="text-lg font-semibold text-gray-900">Chat-Übersicht</h3>
                                                            <button
                                                                onClick={() => generateChatSummary(userDetails)}
                                                                disabled={loading || !userDetails.chats?.length}
                                                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {loading ? (
                                                                    <>
                                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Analysiere...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        🤖 KI-Analyse
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {userDetails.chats && userDetails.chats.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {userDetails.chats.map((chat) => (
                                                                    <div key={chat.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-4 mb-2">
                                                                                    <h4 className="font-medium text-gray-900">
                                                                                        Chat mit {chat.renter?.name || 'Vermieter'}
                                                                                    </h4>
                                                                                    <div className="flex gap-2">
                                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                                            {chat.messages_count} Nachrichten
                                                                                        </span>
                                                                                        {chat.censored_messages_count > 0 && (
                                                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                                                🚫 {chat.censored_messages_count} Zensiert
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="mb-2">
                                                                                    <p className="text-sm text-gray-500">Vermieter:</p>
                                                                                    <p className="font-medium">{chat.renter?.name}</p>
                                                                                </div>
                                                                                {chat.last_message && (
                                                                                    <div className="bg-gray-50 p-3 rounded border-l-4 border-orange-500">
                                                                                        <p className="text-sm text-gray-600 mb-1">
                                                                                            <strong>Letzte Nachricht:</strong>
                                                                                        </p>
                                                                                        <p className="text-sm">{chat.last_message}</p>
                                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                                            {formatDate(chat.last_message_at)}
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
                                                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                    </svg>
                                                                    <p className="font-medium">Keine Nachrichten gesendet</p>
                                                                    <p className="text-sm">Dieser Benutzer hat noch keine Chat-Nachrichten gesendet.</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* WhatsApp Tab */}
                                                {activeTab === 'whatsapp' && (
                                                    <div className="space-y-6">
                                                        {/* Send WhatsApp Message */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Nachricht senden</h3>

                                                            {/* Predefined Messages */}
                                                            <div className="mb-4">
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">Vordefinierte Nachrichten:</label>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {predefinedWhatsappMessages.map((message, index) => (
                                                                        <button
                                                                            key={index}
                                                                            onClick={() => applyPredefinedWhatsappMessage(message.message)}
                                                                            className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <div className="font-medium text-sm text-gray-900">{message.title}</div>
                                                                            <div className="text-xs text-gray-600 truncate">{message.message}</div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <form onSubmit={sendWhatsappMessage}>
                                                                <div className="mb-4">
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nachricht:</label>
                                                                    <textarea
                                                                        value={whatsappMessage}
                                                                        onChange={(e) => setWhatsappMessage(e.target.value)}
                                                                        rows="4"
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                        placeholder="WhatsApp Nachricht eingeben..."
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <button
                                                                        type="submit"
                                                                        disabled={sendingWhatsapp || !whatsappMessage.trim()}
                                                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        {sendingWhatsapp ? 'Sendet...' : 'WhatsApp senden'}
                                                                    </button>
                                                                    {whatsappResult && (
                                                                        <span className={`text-sm font-medium ${whatsappResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                                                            {whatsappResult.message}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </form>
                                                        </div>

                                                        {/* WhatsApp Chat Conversation */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Unterhaltung</h3>
                                                            {!userDetails.whatsapp_messages || userDetails.whatsapp_messages.length === 0 ? (
                                                                <div className="text-center py-12">
                                                                    <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                        </svg>
                                                                    </div>
                                                                    <p className="text-gray-500">Noch keine WhatsApp Nachrichten ausgetauscht</p>
                                                                </div>
                                                            ) : (
                                                                <div id="whatsapp-chat-container" className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                                                                    {userDetails.whatsapp_messages?.map((message) => (
                                                                        <div key={message.id} className={`flex ${message.is_outbound ? 'justify-end' : 'justify-start'}`}>
                                                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                                                message.is_outbound
                                                                                    ? 'bg-green-500 text-white'
                                                                                    : 'bg-white border border-gray-200 text-gray-900'
                                                                            }`}>
                                                                                <div className="text-sm whitespace-pre-wrap">{message.body}</div>
                                                                                <div className={`text-xs mt-1 ${
                                                                                    message.is_outbound ? 'text-green-100' : 'text-gray-500'
                                                                                }`}>
                                                                                    {formatDate(message.created_at)}
                                                                                    {message.is_outbound && (
                                                                                        <span className="ml-2">
                                                                                            {message.status === 'delivered' ? '✓✓' :
                                                                                             message.status === 'sent' ? '✓' :
                                                                                             message.status === 'failed' ? '✗' : message.status}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {message.is_outbound && (
                                                                                    <button
                                                                                        onClick={() => setWhatsappMessage(message.body)}
                                                                                        className="text-xs text-green-100 hover:text-white mt-1 underline"
                                                                                    >
                                                                                        Nochmal senden
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Push Benachrichtigungen Tab */}
                                                {activeTab === 'push' && (
                                                    <div className="space-y-6">
                                                        {/* Push Statistics */}
                                                        {userDetails.push_stats && (
                                                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notification Statistiken</h3>
                                                                <div className="grid grid-cols-4 gap-4">
                                                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                                        <div className="text-2xl font-semibold text-gray-600">
                                                                            {userDetails.push_stats.total}
                                                                        </div>
                                                                        <div className="text-sm font-medium text-gray-700">Gesamt</div>
                                                                    </div>
                                                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                                                        <div className="text-2xl font-semibold text-green-600">
                                                                            {userDetails.push_stats.successful}
                                                                        </div>
                                                                        <div className="text-sm font-medium text-green-700">Erfolgreich</div>
                                                                    </div>
                                                                    <div className="bg-red-50 rounded-lg p-4 text-center">
                                                                        <div className="text-2xl font-semibold text-red-600">
                                                                            {userDetails.push_stats.failed}
                                                                        </div>
                                                                        <div className="text-sm font-medium text-red-700">Fehlgeschlagen</div>
                                                                    </div>
                                                                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                                                                        <div className="text-2xl font-semibold text-orange-600">
                                                                            {userDetails.push_stats.success_rate}%
                                                                        </div>
                                                                        <div className="text-sm font-medium text-orange-700">Erfolgsrate</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Device Tokens */}
                                                        {userDetails.device_tokens && userDetails.device_tokens.length > 0 ? (
                                                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Tokens ({userDetails.device_tokens.length})</h3>
                                                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                                                    {userDetails.device_tokens.map((token) => (
                                                                        <div key={token.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                                                            <div className="flex items-center space-x-3">
                                                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                                                    token.device_type === 'ios' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                                                }`}>
                                                                                    {token.device_type.toUpperCase()}
                                                                                </span>
                                                                                <div className="text-sm text-gray-500 font-mono truncate max-w-xs">
                                                                                    {token.push_token}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="text-xs text-gray-400">{formatDate(token.created_at)}</span>
                                                                                <button
                                                                                    onClick={() => copyToClipboard(token.push_token)}
                                                                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                                                                    title="Token kopieren"
                                                                                >
                                                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                                <div className="text-center py-8">
                                                                    <div className="w-16 h-16 mx-auto mb-4 text-orange-400">
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                        </svg>
                                                                    </div>
                                                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Push-Tokens</h3>
                                                                    <p className="text-gray-500">Dieser Benutzer hat noch keine Push-Tokens registriert.</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Vorgefertigte Nachrichten */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="text-lg font-semibold text-gray-900">Vorgefertigte Nachrichten</h3>
                                                                <button
                                                                    onClick={() => setShowCreateTemplateModal(true)}
                                                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                    </svg>
                                                                    Neue Vorlage
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {pushTemplates.map((template) => (
                                                                    <div key={template.id} className="relative group">
                                                                        <button
                                                                            onClick={() => applyPushTemplate(template)}
                                                                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <div className="font-medium text-gray-900 mb-1">{template.title}</div>
                                                                            <div className="text-sm text-gray-600">
                                                                                {template.message.replace('{name}', userDetails.name || 'Benutzer')}
                                                                            </div>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                deletePushTemplate(template.id);
                                                                            }}
                                                                            className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                            title="Vorlage löschen"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Push senden Form */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Benachrichtigung senden</h3>

                                                            {/* Warnung wenn keine Tokens */}
                                                            {(!userDetails.device_tokens || userDetails.device_tokens.length === 0) && (
                                                                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                                    <div className="flex items-start">
                                                                        <div className="flex-shrink-0">
                                                                            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                            </svg>
                                                                        </div>
                                                                        <div className="ml-3">
                                                                            <h4 className="text-sm font-medium text-yellow-800">Warnung</h4>
                                                                            <p className="text-sm text-yellow-700 mt-1">
                                                                                Keine Push-Tokens vorhanden. Die Benachrichtigung wird fehlschlagen.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <form onSubmit={sendPushNotification}>
                                                                <div className="mb-4">
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nachricht:</label>
                                                                    <textarea
                                                                        value={pushMessage}
                                                                        onChange={(e) => setPushMessage(e.target.value)}
                                                                        rows="3"
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                        placeholder="Push Nachricht eingeben..."
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <button
                                                                        type="submit"
                                                                        disabled={sendingPush || !pushMessage.trim()}
                                                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        {sendingPush ? (
                                                                            <>
                                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                                </svg>
                                                                                Senden...
                                                                            </>
                                                                        ) : (
                                                                            'Push senden'
                                                                        )}
                                                                    </button>
                                                                    {pushResult && (
                                                                        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                                                            pushResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                        }`}>
                                                                            <div className="flex items-center">
                                                                                <span className="mr-2">{pushResult.success ? '✓' : '✗'}</span>
                                                                                <div>
                                                                                    <div>{pushResult.success ? 'Erfolgreich gesendet' : 'Fehler beim Senden'}</div>
                                                                                    <div className="text-xs mt-1">{pushResult.message}</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </form>
                                                        </div>

                                                        {/* Push Notification History */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Verlauf</h3>
                                                            {userDetails.push_history && userDetails.push_history.length > 0 ? (
                                                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                                                    {userDetails.push_history.map((push) => (
                                                                        <div key={push.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                                                            <div className="flex justify-between items-start mb-3">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                                        push.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                                    }`}>
                                                                                        {push.success ? '✓ Erfolgreich' : '✗ Fehlgeschlagen'}
                                                                                    </span>
                                                                                    {!push.tokens_found && (
                                                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                                            Keine Tokens
                                                                                        </span>
                                                                                    )}
                                                                                    {push.tokens_count && (
                                                                                        <span className="text-xs text-gray-500">
                                                                                            {push.tokens_count} Gerät(e)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <button
                                                                                        onClick={() => resendPushNotification(push)}
                                                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                                                                                    >
                                                                                        Nochmal senden
                                                                                    </button>
                                                                                    <span className="text-xs text-gray-500">{formatDate(push.created_at)}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm text-gray-900">
                                                                                {push.title && (
                                                                                    <div className="font-medium mb-1">{push.title}:</div>
                                                                                )}
                                                                                <div className="text-gray-700">{push.body}</div>
                                                                            </div>
                                                                            {push.error_message && (
                                                                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                                                                    Fehler: {push.error_message}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-12">
                                                                    <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12v5l-5-5h5z" />
                                                                        </svg>
                                                                    </div>
                                                                    <p className="text-gray-500">Noch keine Push Benachrichtigungen gesendet</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Edit Tab */}
                                                {activeTab === 'edit' && (
                                                    <div className="space-y-6">
                                                        {/* User Information Edit */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Benutzerinformationen bearbeiten</h3>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editUserData.name || userDetails.name || ''}
                                                                        onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                                        placeholder="Vollständiger Name"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="email"
                                                                            value={editUserData.email || userDetails.email || ''}
                                                                            onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                                                                            placeholder="E-Mail Adresse"
                                                                        />
                                                                        <button
                                                                            onClick={() => toggleEmailVerification()}
                                                                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded ${
                                                                                (editUserData.email_verified !== undefined ? editUserData.email_verified : userDetails.email_verified)
                                                                                    ? 'text-green-600 hover:bg-green-50'
                                                                                    : 'text-gray-400 hover:bg-gray-50'
                                                                            }`}
                                                                            title={userDetails.email_verified ? 'E-Mail verifiziert - klicken zum entfernen' : 'E-Mail nicht verifiziert - klicken zum verifizieren'}
                                                                        >
                                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefonnummer</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            value={editUserData.phone_number || userDetails.phone_number || ''}
                                                                            onChange={(e) => setEditUserData({...editUserData, phone_number: e.target.value})}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                                                                            placeholder="Telefonnummer"
                                                                        />
                                                                        <button
                                                                            onClick={() => togglePhoneVerification()}
                                                                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded ${
                                                                                (editUserData.phone_number_verified !== undefined ? editUserData.phone_number_verified : userDetails.phone_number_verified)
                                                                                    ? 'text-green-600 hover:bg-green-50'
                                                                                    : 'text-gray-400 hover:bg-gray-50'
                                                                            }`}
                                                                            title={userDetails.phone_number_verified ? 'Telefon verifiziert - klicken zum entfernen' : 'Telefon nicht verifiziert - klicken zum verifizieren'}
                                                                        >
                                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Passwort</label>
                                                                    <div className="flex gap-2">
                                                                        <div className="relative flex-1">
                                                                            <input
                                                                                type={showPassword ? "text" : "password"}
                                                                                value={editUserData.password || ''}
                                                                                onChange={(e) => setEditUserData({...editUserData, password: e.target.value})}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                                                                                placeholder="Neues Passwort eingeben (leer lassen für keine Änderung)"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowPassword(!showPassword)}
                                                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                                                                                title={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    {showPassword ? (
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.463 6.463l-1.414 1.414L7.878 9.878m4.242 4.242l3.536 3.536 1.414-1.414-3.536-3.536" />
                                                                                    ) : (
                                                                                        <>
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                        </>
                                                                                    )}
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setShowPasswordHistory(!showPasswordHistory)}
                                                                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                                                                                title="Passwort-Historie anzeigen"
                                                                            >
                                                                                Historie
                                                                            </button>

                                                                            {showPasswordHistory && (
                                                                                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                                                                    <div className="p-3 border-b border-gray-200">
                                                                                        <h4 className="font-medium text-gray-900">Passwort-Historie</h4>
                                                                                    </div>
                                                                                    <div className="p-2">
                                                                                        {passwordHistory.length > 0 ? (
                                                                                            passwordHistory.map((entry, index) => (
                                                                                                <div key={entry.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                                                                    <div className="flex-1">
                                                                                                        <div className="text-sm font-medium text-gray-900">
                                                                                                            Änderung #{passwordHistory.length - index}
                                                                                                        </div>
                                                                                                        <div className="text-xs text-gray-500">
                                                                                                            {new Date(entry.created_at).toLocaleString('de-DE')}
                                                                                                        </div>
                                                                                                        <div className="text-xs text-gray-500">
                                                                                                            von: {entry.changed_by}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <button
                                                                                                        onClick={() => restorePasswordFromHistory(entry.id)}
                                                                                                        className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                                                                                                    >
                                                                                                        Wiederherstellen
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))
                                                                                        ) : (
                                                                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                                                                Keine Passwort-Historie verfügbar
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Dokumente Bereich */}
                                                            <div className="mt-8">
                                                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Hochgeladene Dokumente</h4>
                                                                
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    {/* Führerschein */}
                                                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                                                        <h3 className="font-bold text-lg mb-4 flex items-center">
                                                                            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                                            </svg>
                                                                            Führerschein
                                                                        </h3>

                                                                        {/* Loading State */}
                                                                        {isLoadingLicenses ? (
                                                                            <div className="flex justify-center items-center py-8">
                                                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                                                                <span className="ml-2 text-gray-600">Lade Führerscheinbilder...</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                {/* Front License */}
                                                                                <div className="space-y-2">
                                                                                    <h4 className="text-sm font-medium text-gray-700">Vorderseite</h4>
                                                                                    <div className="relative">
                                                                                        {frontLicenseUrl && !licenseImageErrors.front ? (
                                                                                            <div className="border rounded-lg overflow-hidden bg-gray-50">
                                                                                                <img 
                                                                                                    src={frontLicenseUrl}
                                                                                                    alt="Führerschein Vorderseite"
                                                                                                    className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                                                    onError={() => handleImageError('license', 'front')}
                                                                                                    onClick={() => window.open(frontLicenseUrl, '_blank')}
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                </svg>
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    {licenseImageErrors.front || 'Nicht verfügbar'}
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Back License */}
                                                                                <div className="space-y-2">
                                                                                    <h4 className="text-sm font-medium text-gray-700">Rückseite</h4>
                                                                                    <div className="relative">
                                                                                        {backLicenseUrl && !licenseImageErrors.back ? (
                                                                                            <div className="border rounded-lg overflow-hidden bg-gray-50">
                                                                                                <img 
                                                                                                    src={backLicenseUrl}
                                                                                                    alt="Führerschein Rückseite"
                                                                                                    className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                                                    onError={() => handleImageError('license', 'back')}
                                                                                                    onClick={() => window.open(backLicenseUrl, '_blank')}
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                </svg>
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    {licenseImageErrors.back || 'Nicht verfügbar'}
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* License Error Message */}
                                                                        {licenseImageErrors.general && (
                                                                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                                                <p className="text-sm text-red-600 flex items-center">
                                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                                                    </svg>
                                                                                    {licenseImageErrors.general}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Personalausweis */}
                                                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                                                        <h3 className="font-bold text-lg mb-4 flex items-center">
                                                                            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                                                                            </svg>
                                                                            Personalausweis
                                                                        </h3>

                                                                        {/* Loading State */}
                                                                        {isLoadingIds ? (
                                                                            <div className="flex justify-center items-center py-8">
                                                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                                                                                <span className="ml-2 text-gray-600">Lade Ausweisbilder...</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                {/* Front ID */}
                                                                                <div className="space-y-2">
                                                                                    <h4 className="text-sm font-medium text-gray-700">Vorderseite</h4>
                                                                                    <div className="relative">
                                                                                        {frontIdUrl && !idImageErrors.front ? (
                                                                                            <div className="border rounded-lg overflow-hidden bg-gray-50">
                                                                                                <img 
                                                                                                    src={frontIdUrl}
                                                                                                    alt="Ausweis Vorderseite"
                                                                                                    className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                                                    onError={() => handleImageError('id', 'front')}
                                                                                                    onClick={() => window.open(frontIdUrl, '_blank')}
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                </svg>
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    {idImageErrors.front || 'Nicht verfügbar'}
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Back ID */}
                                                                                <div className="space-y-2">
                                                                                    <h4 className="text-sm font-medium text-gray-700">Rückseite</h4>
                                                                                    <div className="relative">
                                                                                        {backIdUrl && !idImageErrors.back ? (
                                                                                            <div className="border rounded-lg overflow-hidden bg-gray-50">
                                                                                                <img 
                                                                                                    src={backIdUrl}
                                                                                                    alt="Ausweis Rückseite"
                                                                                                    className="w-full h-40 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                                                    onError={() => handleImageError('id', 'back')}
                                                                                                    onClick={() => window.open(backIdUrl, '_blank')}
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 h-40 flex flex-col justify-center">
                                                                                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                                                                </svg>
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    {idImageErrors.back || 'Nicht verfügbar'}
                                                                                                </p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* ID Error Message */}
                                                                        {idImageErrors.general && (
                                                                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                                                <p className="text-sm text-red-600 flex items-center">
                                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                                                    </svg>
                                                                                    {idImageErrors.general}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Save Button */}
                                                            <div className="pt-4 border-t border-gray-200 mt-6">
                                                                <button
                                                                    onClick={saveUserChanges}
                                                                    disabled={saveUserLoading}
                                                                    className={`inline-flex items-center px-6 py-3 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors ${
                                                                        saveUserLoading ? 'opacity-50 cursor-not-allowed' : ''
                                                                    }`}
                                                                >
                                                                    {saveUserLoading ? (
                                                                        <>
                                                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Speichern...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"/>
                                                                            </svg>
                                                                            Änderungen speichern
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>


                                                        {/* Account Management */}
                                                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontoverwaltung</h3>
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                                    <div className="flex items-center space-x-3">
                                                                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                                                        </svg>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">Passwort zurücksetzen</p>
                                                                            <p className="text-xs text-gray-500">Sendet eine Passwort-Reset E-Mail an den Benutzer</p>
                                                                        </div>
                                                                    </div>
                                                                    <button className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors">
                                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                                                        </svg>
                                                                        Reset senden
                                                                    </button>
                                                                </div>
                                                                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                                                                    <div className="flex items-center space-x-3">
                                                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
                                                                        </svg>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">Konto sperren/entsperren</p>
                                                                            <p className="text-xs text-gray-500">Benutzer temporär sperren oder entsperren</p>
                                                                        </div>
                                                                    </div>
                                                                    <button className={`inline-flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                                                                        userDetails.is_blocked
                                                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                                                            : 'bg-red-600 text-white hover:bg-red-700'
                                                                    }`}>
                                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            {userDetails.is_blocked ? (
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                                                                            ) : (
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                                                            )}
                                                                        </svg>
                                                                        {userDetails.is_blocked ? 'Entsperren' : 'Sperren'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>


                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Create Push Template Modal */}
                    {showCreateTemplateModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
                            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Neue Push-Vorlage erstellen</h3>

                                <form onSubmit={createPushTemplate} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Titel:</label>
                                        <input
                                            type="text"
                                            value={newTemplate.title}
                                            onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="z.B. Willkommen"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nachricht:</label>
                                        <textarea
                                            value={newTemplate.message}
                                            onChange={(e) => setNewTemplate({...newTemplate, message: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            rows="4"
                                            placeholder="z.B. Hallo {name}! Willkommen bei Drivable..."
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Verwende {name} für den Benutzernamen und [AUTO] für Fahrzeug-Platzhalter
                                        </p>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCreateTemplateModal(false);
                                                setNewTemplate({ title: '', message: '' });
                                            }}
                                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Erstellen
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Notification Modal */}
                    {showNotificationModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
                                <div className="flex items-center mb-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                        notificationData.type === 'success' ? 'bg-green-100 text-green-600' :
                                        notificationData.type === 'error' ? 'bg-red-100 text-red-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {notificationData.type === 'success' ?
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                            </svg> :
                                         notificationData.type === 'error' ?
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                                            </svg> :
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                            </svg>
                                        }
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">{notificationData.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{notificationData.message}</p>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowNotificationModal(false)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Details Modal */}
                    {showChatDetailsModal && selectedChat && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                                <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg sm:text-xl font-semibold truncate">
                                            Chat mit {selectedChat.renter?.name || 'Vermieter'}
                                        </h2>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                📝 {selectedChat.messages_count} Nachrichten
                                            </span>
                                            {selectedChat.censored_messages_count > 0 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    🚫 {selectedChat.censored_messages_count} Zensiert
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeChatDetailsModal}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="p-6 max-h-[70vh] overflow-y-auto">
                                    <div className="space-y-4">
                                        {selectedChat.messages && selectedChat.messages.length > 0 ? (
                                            <>
                                                {selectedChat.messages.map((message) => (
                                                    <div key={message.id} className={`flex ${message.sender_id === selectedChat.user_id ? 'justify-start' : 'justify-end'}`}>
                                                        <div className={`max-w-2xl rounded-lg shadow-sm border ${
                                                            message.violations && message.violations.length > 0
                                                                ? 'bg-red-50 border-red-200'
                                                                : message.sender_id === selectedChat.user_id
                                                                    ? 'bg-white border-gray-200'
                                                                    : 'bg-blue-50 border-blue-200'
                                                        }`}>
                                                            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                                                        message.sender_id === selectedChat.user_id
                                                                            ? 'bg-gray-200 text-gray-700'
                                                                            : 'bg-blue-200 text-blue-700'
                                                                    }`}>
                                                                        {(message.sender_id === selectedChat.user_id
                                                                            ? userDetails.name
                                                                            : selectedChat.renter?.name
                                                                        )?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <p className="font-medium text-sm text-gray-900">
                                                                        {message.sender_id === selectedChat.user_id
                                                                            ? userDetails.name
                                                                            : selectedChat.renter?.name
                                                                        }
                                                                    </p>
                                                                    {message.is_read && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                            ✓ Gelesen
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    {formatDate(message.created_at)}
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
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-900">
                                                                                🚫 Zensiert
                                                                            </span>
                                                                            <span className="text-xs text-red-700 font-medium">
                                                                                {getViolationType(message.violations[0].violation_type)}
                                                                            </span>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <div className="bg-red-50 p-3 rounded border border-red-300">
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
                                                                        <span className="text-xs text-gray-500">Moderation</span>
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
                                            </>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <div className="flex flex-col items-center gap-4">
                                                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    <div>
                                                        <p className="font-semibold text-lg text-gray-600">Keine Nachrichten</p>
                                                        <p className="text-gray-500 mt-1">In diesem Chat wurden noch keine Nachrichten ausgetauscht.</p>
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
                                            Diese Aktion wird die ursprüngliche Nachricht wiederherstellen und die Zensur-Markierung <strong>vollständig entfernen</strong>.
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
                            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                                <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">🤖 KI-User-Analyse</h2>
                                        <p className="text-sm text-gray-600 mt-1">Detaillierte Charakteranalyse basierend auf allen verfügbaren Daten</p>
                                    </div>
                                    <button
                                        onClick={() => setShowChatSummaryModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="p-6 max-h-[75vh] overflow-y-auto">
                                    <div className="prose prose-gray max-w-none">
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                                <h3 className="text-lg font-semibold text-blue-900">🤖 GPT-4 User-Analyse</h3>
                                            </div>
                                            <p className="text-blue-700 text-sm">
                                                Diese Analyse wurde mit OpenAI GPT-4 erstellt und basiert auf allen verfügbaren User-Daten: Chats, Buchungen, Aktivitäten, Statistiken und Verhalten.
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

                    {/* Tooltip */}
                    {tooltip.show && (
                        <div
                            className="fixed bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium z-50 pointer-events-none shadow-lg"
                            style={{
                                left: tooltip.x,
                                top: tooltip.y,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            {tooltip.content}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
