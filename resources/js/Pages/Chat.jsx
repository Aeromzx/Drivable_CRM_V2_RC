import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Chat({ chats, search, filter, statistics }) {
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [activeFilter, setActiveFilter] = useState(filter || 'all');
    const [selectedChat, setSelectedChat] = useState(null);
    const [showChatModal, setShowChatModal] = useState(false);
    const [chatData, setChatData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCensorModal, setShowCensorModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [censorReason, setCensorReason] = useState('');
    const [censorType, setCensorType] = useState('manual_review');
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

    const handleFilterChange = (newFilter) => {
        setActiveFilter(newFilter);
        router.get(route('chat'), { 
            filter: newFilter, 
            search: searchTerm
        }, { 
            preserveState: true,
            preserveScroll: true 
        });
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        router.get(route('chat'), { 
            filter: activeFilter, 
            search: searchTerm
        }, { 
            preserveState: true 
        });
    };

    const handleSearchBlur = () => {
        if (searchTerm !== search) {
            handleSearch();
        }
    };

    const openChatModal = async (chat) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/chat/${chat.id}`);
            setChatData(response.data.chat);
            setSelectedChat(chat);
            setShowChatModal(true);
        } catch (error) {
            alert('Fehler beim Laden der Chat-Details');
        } finally {
            setLoading(false);
        }
    };

    const closeChatModal = () => {
        setShowChatModal(false);
        setSelectedChat(null);
        setChatData(null);
    };

    const uncensorMessage = async (message) => {
        try {
            const response = await axios.post(`/api/chat/messages/${message.id}/uncensor`);
            
            if (response.data.success) {
                showSuccess('Nachricht wurde erfolgreich entzensiert');
                
                // Update the message in chatData
                setChatData(prevData => ({
                    ...prevData,
                    messages: prevData.messages.map(msg => 
                        msg.id === message.id ? response.data.updated_message : msg
                    )
                }));
            }
        } catch (error) {
            alert('Fehler beim Entzensieren der Nachricht: ' + (error.response?.data?.message || error.message));
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
            const response = await axios.post(`/api/chat/messages/${selectedMessage.id}/censor`, {
                violation_type: censorType,
                reason: censorReason
            });
            
            if (response.data.success) {
                showSuccess('Nachricht wurde erfolgreich zensiert');
                
                // Update the message in chatData
                setChatData(prevData => ({
                    ...prevData,
                    messages: prevData.messages.map(msg => 
                        msg.id === selectedMessage.id ? response.data.updated_message : msg
                    )
                }));
                
                setShowCensorModal(false);
                setSelectedMessage(null);
            }
        } catch (error) {
            alert('Fehler beim Zensieren der Nachricht: ' + (error.response?.data?.message || error.message));
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('de-DE');
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

    return (
        <AuthenticatedLayout>
            <Head title="Chat Verwaltung" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6 text-gray-900">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat Verwaltung</h1>
                            <p className="text-gray-600">Übersicht aller Chat-Konversationen und Moderationsaktionen</p>
                        </div>
                    </div>

                    {/* Statistics */}
                    {statistics && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Gesamt Chats</h3>
                                <p className="text-3xl font-bold text-blue-600">{statistics.total_chats || 0}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Aktive Chats</h3>
                                <p className="text-3xl font-bold text-green-600">{statistics.active_chats || 0}</p>
                                <p className="text-sm text-gray-500">Letzten 7 Tage</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Mit Verstößen</h3>
                                <p className="text-3xl font-bold text-red-600">{statistics.chats_with_violations || 0}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Offene Verstöße</h3>
                                <p className="text-3xl font-bold text-orange-600">{statistics.total_violations || 0}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Neue Verstöße</h3>
                                <p className="text-3xl font-bold text-purple-600">{statistics.recent_violations || 0}</p>
                                <p className="text-sm text-gray-500">Heute</p>
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row gap-4 justify-between">
                                {/* Search */}
                                <form onSubmit={handleSearch} className="flex-1">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Suche nach Benutzern oder Vermietern..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onBlur={handleSearchBlur}
                                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                                        />
                                        <button 
                                            type="submit" 
                                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md"
                                        >
                                            Suchen
                                        </button>
                                    </div>
                                </form>

                                {/* Filter Tabs */}
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleFilterChange('all')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            activeFilter === 'all' 
                                                ? 'bg-white text-orange-700 shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Alle ({chats?.total || 0})
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('active')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            activeFilter === 'active' 
                                                ? 'bg-white text-green-700 shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Aktiv
                                    </button>
                                    <button
                                        onClick={() => handleFilterChange('censored')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            activeFilter === 'censored' 
                                                ? 'bg-white text-red-700 shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Mit Verstößen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Chat Übersicht</h2>
                            
                            {chats?.data?.length > 0 ? (
                                <div className="space-y-4">
                                    {chats.data.map((chat) => (
                                        <div key={chat.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <h3 className="font-medium text-gray-900">
                                                            Chat #{chat.id}
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {chat.messages_count} Nachrichten
                                                            </span>
                                                            {chat.censored_messages_count > 0 && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    {chat.censored_messages_count} Verstöße
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                                        <div>
                                                            <p className="text-sm text-gray-500">Mieter:</p>
                                                            <p className="font-medium">{chat.user?.name || 'Unbekannt'}</p>
                                                            <p className="text-sm text-gray-500">{chat.user?.email}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500">Vermieter:</p>
                                                            <p className="font-medium">
                                                                {chat.renter?.company_name || chat.renter?.user?.name || 'Unbekannt'}
                                                            </p>
                                                            <p className="text-sm text-gray-500">{chat.renter?.user?.email}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {chat.latest_message && (
                                                        <div className="bg-gray-50 p-3 rounded border-l-4 border-orange-500">
                                                            <p className="text-sm text-gray-600 mb-1">
                                                                <strong>{chat.latest_message.sender?.name}:</strong>
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
                                                        onClick={() => openChatModal(chat)}
                                                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm"
                                                        disabled={loading}
                                                    >
                                                        {loading ? 'Laden...' : 'Details'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>Keine Chats gefunden.</p>
                                </div>
                            )}

                            {/* Pagination */}
                            {chats?.links && chats.links.length > 3 && (
                                <div className="mt-6 flex justify-center">
                                    <nav className="flex space-x-2">
                                        {chats.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (link.url) {
                                                        router.visit(link.url + `&search=${searchTerm}&filter=${activeFilter}`);
                                                    }
                                                }}
                                                disabled={!link.url}
                                                className={`px-3 py-2 text-sm rounded-md ${
                                                    link.active 
                                                        ? 'bg-orange-600 text-white' 
                                                        : link.url 
                                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </nav>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Popup */}
            {showSuccessPopup && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                    <p>{successMessage}</p>
                </div>
            )}

            {/* Chat Detail Modal */}
            {showChatModal && chatData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-semibold">
                                Chat #{chatData.id} - {chatData.user?.name} ↔ {chatData.renter?.company_name}
                            </h2>
                            <button 
                                onClick={closeChatModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-4">
                                {chatData.messages?.map((message) => (
                                    <div key={message.id} className={`flex ${message.sender_id === chatData.user_id ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-2xl p-4 rounded-lg ${
                                            message.sender_id === chatData.user_id 
                                                ? 'bg-gray-100 text-gray-900' 
                                                : 'bg-orange-500 text-white'
                                        }`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-medium text-sm">
                                                    {message.sender?.name}
                                                </p>
                                                <p className={`text-xs ml-4 ${
                                                    message.sender_id === chatData.user_id ? 'text-gray-500' : 'text-orange-100'
                                                }`}>
                                                    {formatDate(message.created_at)}
                                                </p>
                                            </div>
                                            
                                            <p className="mb-2">{message.content}</p>
                                            
                                            {/* Violation indicators and actions */}
                                            {message.violations && message.violations.length > 0 && (
                                                <div className="mt-3 border-t pt-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            🚫 Zensiert
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {getViolationType(message.violations[0].violation_type)}
                                                        </span>
                                                    </div>
                                                    
                                                    {message.content === 'Diese Nachricht wurde zensiert.' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => uncensorMessage(message)}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                                                            >
                                                                Entzensieren
                                                            </button>
                                                            <button
                                                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
                                                                title={`Original: ${message.violations[0].original_content}`}
                                                            >
                                                                Original anzeigen
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => openCensorModal(message)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            Zensieren
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* If message is not censored, show censor button */}
                                            {(!message.violations || message.violations.length === 0) && (
                                                <div className="mt-3 border-t pt-3">
                                                    <button
                                                        onClick={() => openCensorModal(message)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                                                    >
                                                        Zensieren
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
        </AuthenticatedLayout>
    );
}