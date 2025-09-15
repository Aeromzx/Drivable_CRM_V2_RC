<template>
    <div>
        <!-- Action Buttons -->
        <div class="flex justify-end mb-6">
            <div class="flex items-center space-x-3">
                <button
                    @click="showMahnungDashboard = !showMahnungDashboard"
                    :class="showMahnungDashboard ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'"
                    class="text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors shadow-lg"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{{ showMahnungDashboard ? 'Rechnungen anzeigen' : 'Mahnung-Übersicht' }}</span>
                </button>
                <button
                    @click="showCreateModal = true"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors shadow-lg"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span>Neue Rechnung</span>
                </button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center h-64">
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span class="text-gray-600">Daten werden geladen...</span>
            </div>
        </div>

        <!-- Mahnung Dashboard -->
        <div v-else-if="showMahnungDashboard">
            <MahnungDashboard
                @back-to-invoices="showMahnungDashboard = false"
                @reload-invoices="loadInvoices"
            />
        </div>

        <!-- Invoice Dashboard -->
        <div v-else>
            <!-- Search and Filters -->
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
                <div class="flex flex-col lg:flex-row gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                            </div>
                            <input
                                v-model="searchQuery"
                                type="text"
                                placeholder="Suche nach Kundenname, Rechnungsnummer..."
                                class="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                            >
                        </div>
                    </div>
                    <div class="flex space-x-3">
                        <select v-model="statusFilter" @change="loadInvoices" class="min-w-[160px] px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors">
                            <option value="">Alle Status</option>
                            <option value="draft">Entwurf</option>
                            <option value="sent">Versendet</option>
                            <option value="paid">Bezahlt</option>
                            <option value="overdue">Überfällig</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Invoice Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rechnung
                                </th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kunde
                                </th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Datum
                                </th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fällig
                                </th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Betrag
                                </th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mahnungen
                                </th>
                                <th class="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Aktionen
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900">{{ invoice.invoice_number }}</div>
                                    <div class="text-xs text-gray-500">{{ formatDate(invoice.created_at) }}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900">{{ invoice.customer_name }}</div>
                                    <div class="text-xs text-gray-500">{{ invoice.customer_email }}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {{ formatDate(invoice.invoice_date) }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span v-if="invoice.due_date" :class="getDueDateClass(invoice)" class="text-sm">
                                        {{ formatDate(invoice.due_date) }}
                                    </span>
                                    <span v-else class="text-sm text-gray-400">-</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {{ formatCurrency(invoice.total_amount) }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge :status="invoice.status" @update="updateInvoiceStatus(invoice.id, $event)" />
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <MahnungStatus :invoice="invoice" @create-mahnung="createMahnung" />
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <ActionDropdown 
                                        :invoice="invoice" 
                                        @edit="editInvoice" 
                                        @delete="deleteInvoice" 
                                        @download-pdf="downloadInvoicePDF"
                                        @download-mahnung="downloadMahnungPDF"
                                        @create-payment-link="createPaymentLink"
                                        @copy-payment-link="showNotification"
                                    />
                                </td>
                            </tr>
                            <tr v-if="filteredInvoices.length === 0">
                                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <p class="mt-2 text-sm text-gray-500">Keine Rechnungen gefunden</p>
                                    <p class="text-xs text-gray-400">Erstellen Sie Ihre erste Rechnung</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Create/Edit Invoice Modal -->
        <InvoiceModal 
            v-if="showCreateModal || showEditModal"
            :show="showCreateModal || showEditModal"
            :invoice="editingInvoice"
            :is-editing="showEditModal"
            @close="closeModal"
            @save="saveInvoice"
        />

        <!-- Toast Notifications -->
        <div v-if="notification" class="fixed bottom-4 right-4 z-50">
            <div :class="notificationClass" class="rounded-lg p-4 shadow-lg max-w-sm">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <svg v-if="notification.type === 'success'" class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <svg v-else-if="notification.type === 'error'" class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">{{ notification.message }}</p>
                    </div>
                    <div class="ml-4 flex-shrink-0">
                        <button @click="notification = null" class="text-gray-400 hover:text-gray-600">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import MahnungDashboard from './MahnungDashboard.vue';
import InvoiceModal from './InvoiceModal.vue';
import StatusBadge from './StatusBadge.vue';
import MahnungStatus from './MahnungStatus.vue';
import ActionDropdown from './ActionDropdown.vue';

export default {
    name: 'InvoicingDashboard',
    components: {
        MahnungDashboard,
        InvoiceModal,
        StatusBadge,
        MahnungStatus,
        ActionDropdown
    },
    data() {
        return {
            loading: true,
            invoices: [],
            statistics: null,
            mahnungStats: null,
            searchQuery: '',
            statusFilter: '',
            showMahnungDashboard: false,
            showCreateModal: false,
            showEditModal: false,
            editingInvoice: null,
            notification: null
        }
    },
    computed: {
        filteredInvoices() {
            let filtered = this.invoices;

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(invoice =>
                    invoice.customer_name.toLowerCase().includes(query) ||
                    invoice.customer_email.toLowerCase().includes(query) ||
                    invoice.invoice_number.toLowerCase().includes(query)
                );
            }

            if (this.statusFilter) {
                filtered = filtered.filter(invoice => invoice.status === this.statusFilter);
            }

            return filtered;
        },
        notificationClass() {
            if (!this.notification) return '';
            return {
                'success': 'bg-green-50 border border-green-200 text-green-800',
                'error': 'bg-red-50 border border-red-200 text-red-800',
                'info': 'bg-blue-50 border border-blue-200 text-blue-800'
            }[this.notification.type] || 'bg-gray-50 border border-gray-200 text-gray-800';
        }
    },
    async mounted() {
        await Promise.all([
            this.loadInvoices(),
            this.loadStatistics(),
            this.loadMahnungStats()
        ]);
        this.loading = false;
    },
    methods: {
        async loadInvoices() {
            try {
                const response = await axios.get('/invoices');
                this.invoices = response.data;
            } catch (error) {
                this.showNotification('Fehler beim Laden der Rechnungen', 'error');
                console.error('Fehler beim Laden der Rechnungen:', error);
            }
        },

        async loadStatistics() {
            try {
                const response = await axios.get('/invoices/statistics');
                this.statistics = response.data.statistics;
            } catch (error) {
                console.error('Fehler beim Laden der Statistiken:', error);
            }
        },

        async loadMahnungStats() {
            try {
                const response = await axios.get('/mahnungen/dashboard-stats');
                this.mahnungStats = response.data.stats;
            } catch (error) {
                console.error('Fehler beim Laden der Mahnung-Statistiken:', error);
            }
        },

        async createMahnung(invoiceId, mahnstufe = null) {
            const mahnungText = mahnstufe ? `${mahnstufe}. Mahnung` : 'eine Mahnung';
            
            if (!confirm(`Möchten Sie ${mahnungText} für diese Rechnung erstellen?`)) {
                return;
            }

            try {
                const requestData = { invoice_id: invoiceId };
                if (mahnstufe) {
                    requestData.mahnstufe = mahnstufe;
                }

                const response = await axios.post(`/invoices/${invoiceId}/mahnung`, requestData);

                if (response.data.success) {
                    this.showNotification(response.data.message, 'success');
                    await Promise.all([
                        this.loadInvoices(),
                        this.loadMahnungStats()
                    ]);
                }
            } catch (error) {
                this.showNotification(error.response?.data?.message || 'Fehler beim Erstellen der Mahnung', 'error');
                console.error('Fehler beim Erstellen der Mahnung:', error);
            }
        },

        async updateInvoiceStatus(invoiceId, newStatus) {
            try {
                const invoice = this.invoices.find(inv => inv.id === invoiceId);
                const requestData = { status: newStatus };

                if (newStatus === 'paid' && !invoice.paid_date) {
                    requestData.paid_date = new Date().toISOString().split('T')[0];
                }

                const response = await axios.patch(`/invoices/${invoiceId}/status`, requestData);

                if (response.data.success) {
                    this.showNotification('Status erfolgreich aktualisiert', 'success');
                    await this.loadInvoices();
                }
            } catch (error) {
                this.showNotification('Fehler beim Aktualisieren des Status', 'error');
                await this.loadInvoices();
            }
        },

        editInvoice(invoice) {
            this.editingInvoice = { ...invoice };
            this.showEditModal = true;
        },

        async deleteInvoice(invoiceId) {
            if (!confirm('Sind Sie sicher, dass Sie diese Rechnung löschen möchten?')) {
                return;
            }

            try {
                const response = await axios.delete(`/invoices/${invoiceId}`);
                if (response.data.success) {
                    this.showNotification('Rechnung erfolgreich gelöscht', 'success');
                    await this.loadInvoices();
                }
            } catch (error) {
                this.showNotification('Fehler beim Löschen der Rechnung', 'error');
                console.error('Fehler beim Löschen:', error);
            }
        },

        async createPaymentLink(invoiceId) {
            try {
                this.showNotification('Payment Link wird erstellt...', 'info');

                const response = await axios.post(`/invoices/${invoiceId}/payment-link`);

                if (response.data.success) {
                    this.showNotification(response.data.message, 'success');
                    await this.loadInvoices(); // Reload to get updated payment link data
                }
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen des Payment Links';
                this.showNotification(errorMessage, 'error');
                console.error('Fehler beim Erstellen des Payment Links:', error);
            }
        },

        async downloadInvoicePDF(invoiceId, invoiceNumber) {
            try {
                this.showNotification('PDF wird generiert...', 'info');

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

                this.showNotification('PDF erfolgreich heruntergeladen!', 'success');
            } catch (error) {
                this.showNotification('Fehler beim PDF-Download', 'error');
                console.error('Fehler beim PDF-Download:', error);
            }
        },

        async downloadMahnungPDF(mahnungId) {
            try {
                this.showNotification('Mahnung-PDF wird generiert...', 'info');

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

                this.showNotification('Mahnung-PDF erfolgreich heruntergeladen!', 'success');
            } catch (error) {
                this.showNotification('Fehler beim Mahnung-PDF Download', 'error');
                console.error('Fehler beim Download der Mahnung-PDF:', error);
            }
        },

        async saveInvoice(invoiceData) {
            try {
                let response;
                if (this.showEditModal && this.editingInvoice) {
                    response = await axios.put(`/invoices/${this.editingInvoice.id}`, invoiceData);
                } else {
                    response = await axios.post('/invoices', invoiceData);
                }

                if (response.data.success) {
                    this.showNotification(
                        this.showEditModal ? 'Rechnung erfolgreich aktualisiert' : 'Rechnung erfolgreich erstellt',
                        'success'
                    );
                    this.closeModal();
                    await this.loadInvoices();
                }
            } catch (error) {
                this.showNotification('Fehler beim Speichern der Rechnung', 'error');
                console.error('Fehler beim Speichern:', error);
            }
        },

        closeModal() {
            this.showCreateModal = false;
            this.showEditModal = false;
            this.editingInvoice = null;
        },

        showNotification(message, type = 'info') {
            this.notification = { message, type };
            setTimeout(() => {
                this.notification = null;
            }, 5000);
        },

        formatDate(date) {
            return new Date(date).toLocaleDateString('de-DE');
        },

        formatCurrency(amount) {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount || 0);
        },

        getDueDateClass(invoice) {
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
        }
    }
}
</script>

<style scoped>
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>