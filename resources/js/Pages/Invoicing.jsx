import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Invoicing() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showMahnungDashboard, setShowMahnungDashboard] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);

    useEffect(() => {
        loadInvoices();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown && !event.target.closest('.dropdown-container')) {
                setOpenDropdown(null);
            }
        };
        if (openDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openDropdown]);

    const loadInvoices = async () => {
        try {
            const response = await axios.get('/invoices');
            setInvoices(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading invoices:', error);
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = !searchQuery ||
            invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = !statusFilter || invoice.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('de-DE');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            'draft': 'bg-gray-100 text-gray-800',
            'sent': 'bg-blue-100 text-blue-800',
            'paid': 'bg-green-100 text-green-800',
            'overdue': 'bg-red-100 text-red-800'
        };

        const statusLabels = {
            'draft': 'Entwurf',
            'sent': 'Versendet',
            'paid': 'Bezahlt',
            'overdue': 'Überfällig'
        };

        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    const getDueDateClass = (invoice) => {
        if (!invoice.due_date) return '';

        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (invoice.status === 'paid') {
            return 'text-green-600 font-medium';
        } else if (daysDiff < 0) {
            return 'text-red-600 font-bold';
        } else if (daysDiff <= 7) {
            return 'text-yellow-600 font-medium';
        } else {
            return 'text-gray-900';
        }
    };

    const updateInvoiceStatus = async (invoiceId, newStatus) => {
        try {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            const requestData = { status: newStatus };

            if (newStatus === 'paid' && !invoice.paid_date) {
                requestData.paid_date = new Date().toISOString().split('T')[0];
            }

            const response = await axios.patch(`/invoices/${invoiceId}/status`, requestData);

            if (response.data.success) {
                alert('Status erfolgreich aktualisiert');
                await loadInvoices();
            }
        } catch (error) {
            alert('Fehler beim Aktualisieren des Status');
            await loadInvoices();
        }
    };

    const downloadInvoicePDF = async (invoiceId, invoiceNumber) => {
        try {
            const response = await axios.get(`/invoices/${invoiceId}/pdf`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Fehler beim PDF-Download:', error);
            alert('Fehler beim PDF-Download');
        }
    };

    const createMahnung = async (invoiceId, mahnstufe = null) => {
        const mahnungText = mahnstufe ? `${mahnstufe}. Mahnung` : 'eine Mahnung';

        console.log('Creating Mahnung for invoice:', invoiceId, 'Mahnstufe:', mahnstufe);

        if (!confirm(`Möchten Sie ${mahnungText} für diese Rechnung erstellen?`)) {
            return;
        }

        try {
            const requestData = { invoice_id: invoiceId };
            if (mahnstufe) {
                requestData.mahnstufe = mahnstufe;
            }

            console.log('Sending request:', requestData);

            const response = await axios.post(`/invoices/${invoiceId}/mahnung`, requestData);

            console.log('Response:', response.data);

            if (response.data.success) {
                alert(response.data.message);
                await loadInvoices();
            }
        } catch (error) {
            console.error('Full error:', error);
            console.error('Error response:', error.response?.data);
            alert(error.response?.data?.message || 'Fehler beim Erstellen der Mahnung');
        }
    };

    const createPaymentLink = async (invoiceId) => {
        try {
            const response = await axios.post(`/invoices/${invoiceId}/payment-link`);

            if (response.data.success) {
                alert(response.data.message);
                await loadInvoices();
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen des Payment Links';
            alert(errorMessage);
            console.error('Fehler beim Erstellen des Payment Links:', error);
        }
    };

    const deleteInvoice = async (invoiceId) => {
        try {
            const response = await axios.delete(`/invoices/${invoiceId}`);
            if (response.data.success) {
                alert('Rechnung erfolgreich gelöscht');
                await loadInvoices();
            }
        } catch (error) {
            alert('Fehler beim Löschen der Rechnung');
            console.error('Fehler beim Löschen:', error);
        }
    };

    const editInvoice = (invoice) => {
        setEditingInvoice({ ...invoice });
        setShowEditModal(true);
    };

    const StatusBadgeComponent = ({ status, onUpdate, invoiceId }) => {
        return (
            <select
                value={status}
                onChange={(e) => onUpdate(invoiceId, e.target.value)}
                className="text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-orange-500 bg-gray-100 text-gray-800"
            >
                <option value="draft">Entwurf</option>
                <option value="sent">Versendet</option>
                <option value="paid">Bezahlt</option>
                <option value="overdue">Überfällig</option>
            </select>
        );
    };

    const downloadMahnungPDF = async (mahnungId) => {
        try {
            const response = await axios.get(`/mahnungen/${mahnungId}/pdf`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `mahnung-${mahnungId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Fehler beim Mahnung-PDF Download:', error);
            alert('Fehler beim Mahnung-PDF Download');
        }
    };

    const MahnungStatusComponent = ({ invoice }) => {
        // Check if invoice has mahnungen property and it's an array
        const mahnungen = Array.isArray(invoice.mahnungen) ? invoice.mahnungen : [];
        const mahnungCount = mahnungen.length;

        // Debug log
        console.log('Invoice:', invoice.invoice_number, 'Status:', invoice.status, 'Mahnungen:', mahnungen);

        // If we have mahnungen, show them with download buttons
        if (mahnungCount > 0) {
            return (
                <div className="flex items-center space-x-1">
                    {mahnungen.map((mahnung, index) => (
                        <button
                            key={mahnung.id}
                            onClick={() => downloadMahnungPDF(mahnung.id)}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
                            title={`${mahnung.mahnstufe}. Mahnung herunterladen`}
                        >
                            {mahnung.mahnstufe}. Mahnung
                        </button>
                    ))}
                    {/* Plus button for creating next Mahnung */}
                    <button
                        onClick={() => {
                            const nextMahnstufe = Math.max(...mahnungen.map(m => m.mahnstufe)) + 1;
                            createMahnung(invoice.id, nextMahnstufe);
                        }}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                        title="Nächste Mahnung erstellen"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            );
        }

        // If no mahnungen, show create button for sent, overdue, or even draft status
        // Allow creating mahnungen for any unpaid invoice
        if (invoice.status !== 'paid') {
            return (
                <button
                    onClick={() => createMahnung(invoice.id, 1)}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        invoice.status === 'overdue'
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                    }`}
                    title="Erste Mahnung erstellen"
                >
                    1. Mahnung erstellen
                </button>
            );
        }

        return <span className="text-gray-400 text-xs">-</span>;
    };

    if (showMahnungDashboard) {
        return (
            <AuthenticatedLayout
                header={
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800">
                                Mahnungsübersicht
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Verwaltung von Mahnverfahren
                            </p>
                        </div>
                    </div>
                }
            >
                <Head title="Mahnungsübersicht" />

                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 text-gray-900">
                                <button
                                    onClick={() => setShowMahnungDashboard(false)}
                                    className="mb-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
                                >
                                    ← Zurück zu Rechnungen
                                </button>
                                <p>Mahnung Dashboard - noch nicht implementiert</p>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            Rechnungen & Mahnwesen
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Verwaltung von Rechnungen und Mahnverfahren
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Rechnungen & Mahnwesen" />

            <div className="py-6 sm:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-0 mb-6">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                            <button
                                onClick={() => setShowMahnungDashboard(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 sm:py-2 rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-lg text-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="hidden sm:inline">Mahnung-Übersicht</span>
                                <span className="sm:hidden">Mahnungen</span>
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:py-2 rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-lg text-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Neue Rechnung</span>
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                                <span className="text-gray-600">Daten werden geladen...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Search and Filters */}
                            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
                                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                                </svg>
                                            </div>
                                            <input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                type="text"
                                                placeholder="Suche nach Kunde, Rechnung..."
                                                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full sm:min-w-[160px] px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                        >
                                            <option value="">Alle Status</option>
                                            <option value="draft">Entwurf</option>
                                            <option value="sent">Versendet</option>
                                            <option value="paid">Bezahlt</option>
                                            <option value="overdue">Überfällig</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Table - Desktop */}
                            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Rechnung
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Kunde
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Datum
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Fällig
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Betrag
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Mahnungen
                                                </th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Aktionen
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredInvoices.map((invoice) => (
                                                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                                                        <div className="text-xs text-gray-500">{formatDate(invoice.created_at)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{invoice.customer_name}</div>
                                                        <div className="text-xs text-gray-500">{invoice.customer_email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(invoice.invoice_date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {invoice.due_date ? (
                                                            <span className={`text-sm ${getDueDateClass(invoice)}`}>
                                                                {formatDate(invoice.due_date)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                        {formatCurrency(invoice.total_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadgeComponent
                                                            status={invoice.status}
                                                            onUpdate={updateInvoiceStatus}
                                                            invoiceId={invoice.id}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <MahnungStatusComponent invoice={invoice} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="relative dropdown-container">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdown(openDropdown === invoice.id ? null : invoice.id);
                                                                }}
                                                                className="text-gray-400 hover:text-gray-500 focus:outline-none p-2"
                                                            >
                                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                </svg>
                                                            </button>
                                                            {openDropdown === invoice.id && (
                                                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                                                    <div className="py-1">
                                                                        <button
                                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                            onClick={() => {
                                                                                editInvoice(invoice);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                            Bearbeiten
                                                                        </button>
                                                                        <button
                                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                            onClick={() => {
                                                                                downloadInvoicePDF(invoice.id, invoice.invoice_number);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                            </svg>
                                                                            Rechnung herunterladen
                                                                        </button>
                                                                        {/* Mahnung actions */}
                                                                        {Array.isArray(invoice.mahnungen) && invoice.mahnungen.length > 0 && (
                                                                            <>
                                                                                {invoice.mahnungen.map((mahnung) => (
                                                                                    <button
                                                                                        key={`download-${mahnung.id}`}
                                                                                        className="block w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                                                                                        onClick={() => {
                                                                                            downloadMahnungPDF(mahnung.id);
                                                                                            setOpenDropdown(null);
                                                                                        }}
                                                                                    >
                                                                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                        {mahnung.mahnstufe}. Mahnung PDF
                                                                                    </button>
                                                                                ))}
                                                                                <div className="border-t border-gray-100"></div>
                                                                            </>
                                                                        )}
                                                                        <button
                                                                            className="block w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                                                                            onClick={() => {
                                                                                const mahnungen = Array.isArray(invoice.mahnungen) ? invoice.mahnungen : [];
                                                                                const nextMahnstufe = mahnungen.length > 0 ? Math.max(...mahnungen.map(m => m.mahnstufe)) + 1 : 1;
                                                                                createMahnung(invoice.id, nextMahnstufe);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            {Array.isArray(invoice.mahnungen) && invoice.mahnungen.length > 0
                                                                                ? `${Math.max(...invoice.mahnungen.map(m => m.mahnstufe)) + 1}. Mahnung erstellen`
                                                                                : 'Mahnung erstellen'
                                                                            }
                                                                        </button>
                                                                        <button
                                                                            className="block w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                                                            onClick={() => {
                                                                                createPaymentLink(invoice.id);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                            </svg>
                                                                            Payment Link erstellen
                                                                        </button>
                                                                        <div className="border-t border-gray-100"></div>
                                                                        <button
                                                                            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                                                            onClick={() => {
                                                                                if (confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) {
                                                                                    deleteInvoice(invoice.id);
                                                                                }
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                            Löschen
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredInvoices.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                        </svg>
                                                        <p className="mt-2 text-sm text-gray-500">Keine Rechnungen gefunden</p>
                                                        <p className="text-xs text-gray-400">Erstellen Sie Ihre erste Rechnung</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Invoice Cards - Mobile/Tablet */}
                            <div className="lg:hidden space-y-4">
                                {filteredInvoices.map((invoice) => (
                                    <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-4">
                                            {/* Header Row */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                                                    <div className="text-xs text-gray-500">{formatDate(invoice.created_at)}</div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <StatusBadgeComponent
                                                        status={invoice.status}
                                                        onUpdate={updateInvoiceStatus}
                                                        invoiceId={invoice.id}
                                                    />
                                                    <div className="relative dropdown-container">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdown(openDropdown === invoice.id ? null : invoice.id);
                                                            }}
                                                            className="text-gray-400 hover:text-gray-500 focus:outline-none p-2"
                                                        >
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>
                                                        {openDropdown === invoice.id && (
                                                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                                                <div className="py-1">
                                                                    <button
                                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            editInvoice(invoice);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                        Bearbeiten
                                                                    </button>
                                                                    <button
                                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            downloadInvoicePDF(invoice.id, invoice.invoice_number);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                        Rechnung herunterladen
                                                                    </button>
                                                                    {/* Mahnung actions */}
                                                                    {Array.isArray(invoice.mahnungen) && invoice.mahnungen.length > 0 && (
                                                                        <>
                                                                            {invoice.mahnungen.map((mahnung) => (
                                                                                <button
                                                                                    key={`download-${mahnung.id}`}
                                                                                    className="block w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                                                                                    onClick={() => {
                                                                                        downloadMahnungPDF(mahnung.id);
                                                                                        setOpenDropdown(null);
                                                                                    }}
                                                                                >
                                                                                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                    </svg>
                                                                                    {mahnung.mahnstufe}. Mahnung PDF
                                                                                </button>
                                                                            ))}
                                                                            <div className="border-t border-gray-100"></div>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        className="block w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                                                                        onClick={() => {
                                                                            const mahnungen = Array.isArray(invoice.mahnungen) ? invoice.mahnungen : [];
                                                                            const nextMahnstufe = mahnungen.length > 0 ? Math.max(...mahnungen.map(m => m.mahnstufe)) + 1 : 1;
                                                                            createMahnung(invoice.id, nextMahnstufe);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        {Array.isArray(invoice.mahnungen) && invoice.mahnungen.length > 0
                                                                            ? `${Math.max(...invoice.mahnungen.map(m => m.mahnstufe)) + 1}. Mahnung erstellen`
                                                                            : 'Mahnung erstellen'
                                                                        }
                                                                    </button>
                                                                    <button
                                                                        className="block w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                                                        onClick={() => {
                                                                            createPaymentLink(invoice.id);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                        </svg>
                                                                        Payment Link erstellen
                                                                    </button>
                                                                    <div className="border-t border-gray-100"></div>
                                                                    <button
                                                                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                                                        onClick={() => {
                                                                            if (confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) {
                                                                                deleteInvoice(invoice.id);
                                                                            }
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Löschen
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Customer Info */}
                                            <div className="mb-3">
                                                <div className="text-sm font-medium text-gray-900">{invoice.customer_name}</div>
                                                <div className="text-xs text-gray-500">{invoice.customer_email}</div>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Datum</div>
                                                    <div className="text-gray-900">{formatDate(invoice.invoice_date)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Fällig</div>
                                                    <div className={invoice.due_date ? getDueDateClass(invoice) : 'text-gray-400'}>
                                                        {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount and Mahnungen */}
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Betrag</div>
                                                    <div className="text-lg font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <MahnungStatusComponent invoice={invoice} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredInvoices.length === 0 && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                                        <div className="text-center text-gray-500">
                                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <p className="text-sm text-gray-500">Keine Rechnungen gefunden</p>
                                            <p className="text-xs text-gray-400 mt-1">Erstellen Sie Ihre erste Rechnung</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}