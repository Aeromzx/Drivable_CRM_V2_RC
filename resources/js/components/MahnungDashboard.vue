<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-3">
                <button 
                    @click="$emit('back-to-invoices')"
                    class="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    <span>Zurück zu Rechnungen</span>
                </button>
                <div class="h-6 border-l border-gray-300"></div>
                <h2 class="text-2xl font-bold text-gray-900">Mahnung-Verwaltung</h2>
            </div>
        </div>

        <!-- Mahnung Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
                <div class="text-center">
                    <div class="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <span class="text-white font-bold">1</span>
                    </div>
                    <div class="text-3xl font-bold text-blue-900">{{ mahnungStats.by_mahnstufe[1] || 0 }}</div>
                    <div class="text-sm font-medium text-blue-700">1. Mahnung</div>
                </div>
            </div>
            <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200 shadow-sm">
                <div class="text-center">
                    <div class="w-12 h-12 bg-yellow-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <span class="text-white font-bold">2</span>
                    </div>
                    <div class="text-3xl font-bold text-yellow-900">{{ mahnungStats.by_mahnstufe[2] || 0 }}</div>
                    <div class="text-sm font-medium text-yellow-700">2. Mahnung</div>
                </div>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 shadow-sm">
                <div class="text-center">
                    <div class="w-12 h-12 bg-orange-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <span class="text-white font-bold">3</span>
                    </div>
                    <div class="text-3xl font-bold text-orange-900">{{ mahnungStats.by_mahnstufe[3] || 0 }}</div>
                    <div class="text-sm font-medium text-orange-700">Letzte Mahnung</div>
                </div>
            </div>
            <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm">
                <div class="text-center">
                    <div class="w-12 h-12 bg-red-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <div class="text-3xl font-bold text-red-900">{{ mahnungStats.by_mahnstufe[4] || 0 }}</div>
                    <div class="text-sm font-medium text-red-700">Inkasso</div>
                </div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm">
                <div class="text-center">
                    <div class="w-12 h-12 bg-green-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <div class="text-3xl font-bold text-green-900">{{ mahnungStats.paid_mahnungen || 0 }}</div>
                    <div class="text-sm font-medium text-green-700">Bezahlt</div>
                </div>
            </div>
        </div>

        <!-- Quick Actions for Overdue Invoices -->
        <div v-if="overdueInvoices.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div class="flex items-center space-x-3 mb-4">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="text-lg font-semibold text-yellow-800">Rechnungen benötigen Mahnung</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="invoice in overdueInvoices.slice(0, 6)" :key="invoice.id" class="bg-white rounded-lg p-4 border border-yellow-200">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="font-medium text-gray-900">{{ invoice.invoice_number }}</div>
                            <div class="text-sm text-gray-600">{{ invoice.customer_name }}</div>
                        </div>
                        <div class="text-sm font-medium text-red-600">
                            {{ formatCurrency(invoice.total_amount) }}
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 mb-3">
                        Fällig: {{ formatDate(invoice.due_date) }}
                    </div>
                    <button 
                        @click="createMahnung(invoice.id)"
                        class="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                    >
                        1. Mahnung erstellen
                    </button>
                </div>
            </div>
            <div v-if="overdueInvoices.length > 6" class="mt-4 text-center">
                <button @click="$emit('back-to-invoices')" class="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                    Alle {{ overdueInvoices.length }} überfälligen Rechnungen anzeigen →
                </button>
            </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1">
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Suche nach Rechnung, Kunde, Mahnung-Nr..."
                            class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                    </div>
                </div>
                <div class="flex space-x-3">
                    <select v-model="statusFilter" @change="loadMahnungen" class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Alle Status</option>
                        <option value="draft">Entwurf</option>
                        <option value="sent">Versendet</option>
                        <option value="paid">Bezahlt</option>
                        <option value="cancelled">Storniert</option>
                    </select>
                    <select v-model="mahnstufenFilter" @change="loadMahnungen" class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Alle Mahnstufen</option>
                        <option value="1">1. Mahnung</option>
                        <option value="2">2. Mahnung</option>
                        <option value="3">Letzte Mahnung</option>
                        <option value="4">Inkasso</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Mahnungen Table -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Alle Mahnungen</h3>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahnung Nr.</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rechnung</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahnstufe</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fällig</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="mahnung in filteredMahnungen" :key="mahnung.id" class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {{ mahnung.mahnung_number }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">{{ mahnung.invoice.invoice_number }}</div>
                                <div class="text-xs text-gray-500">{{ formatDate(mahnung.invoice.invoice_date) }}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">{{ mahnung.invoice.customer_name }}</div>
                                <div class="text-xs text-gray-500">{{ mahnung.invoice.customer_email }}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span :class="getMahnstufeClass(mahnung.mahnstufe)"
                                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium">
                                    {{ getMahnstufeText(mahnung.mahnstufe) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ formatDate(mahnung.mahnung_date) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span :class="isOverdue(mahnung.due_date) ? 'text-red-600 font-medium' : 'text-gray-900'" class="text-sm">
                                    {{ formatDate(mahnung.due_date) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {{ formatCurrency(mahnung.total_amount) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span :class="getMahnungStatusClass(mahnung.status)"
                                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium">
                                    {{ getMahnungStatusText(mahnung.status) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right">
                                <div class="flex justify-end items-center space-x-2">
                                    <button v-if="mahnung.status === 'draft'"
                                            @click="editMahnung(mahnung)"
                                            class="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                            title="Bearbeiten">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                    </button>
                                    <button v-if="mahnung.status === 'draft'"
                                            @click="sendMahnung(mahnung.id)"
                                            class="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                                            title="Senden">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                        </svg>
                                    </button>
                                    <button v-if="mahnung.status === 'sent'"
                                            @click="markMahnungAsPaid(mahnung.id)"
                                            class="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                                            title="Als bezahlt markieren">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    </button>
                                    <button @click="downloadMahnungPDF(mahnung.id)"
                                            class="text-purple-600 hover:text-purple-800 p-2 rounded-lg hover:bg-purple-50 transition-colors"
                                            title="PDF herunterladen">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </button>
                                    <button v-if="mahnung.status === 'draft'"
                                            @click="deleteMahnung(mahnung.id)"
                                            class="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Löschen">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="filteredMahnungen.length === 0">
                            <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <p class="mt-2 text-sm text-gray-500">Keine Mahnungen gefunden</p>
                                <p class="text-xs text-gray-400">Erstellen Sie Ihre erste Mahnung</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div v-if="mahnungen.last_page > 1" class="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-700">
                        Zeige {{ mahnungen.from || 0 }} bis {{ mahnungen.to || 0 }} von {{ mahnungen.total || 0 }} Einträgen
                    </div>
                    <div class="flex space-x-2">
                        <button v-if="mahnungen.current_page > 1"
                                @click="loadMahnungen(mahnungen.current_page - 1)"
                                class="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Vorherige
                        </button>
                        <button v-if="mahnungen.current_page < mahnungen.last_page"
                                @click="loadMahnungen(mahnungen.current_page + 1)"
                                class="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Nächste
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Mahnung Modal -->
        <div v-if="showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-900">Mahnung bearbeiten</h3>
                    <button @click="showEditModal = false" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form @submit.prevent="saveMahnung" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
                        <textarea v-model="mahnungForm.notes" rows="4"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Zusätzliche Hinweise zur Mahnung..."></textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Zahlungsfrist (Tage)</label>
                            <input v-model="mahnungForm.payment_deadline_days" type="number" min="1" max="90"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Mahngebühr (€)</label>
                            <input v-model="mahnungForm.reminder_fee" type="number" step="0.01" min="0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Zusätzliche Gebühr (€)</label>
                        <input v-model="mahnungForm.late_fee" type="number" step="0.01" min="0"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>

                    <div class="flex justify-end space-x-4 pt-6">
                        <button type="button" @click="showEditModal = false"
                                class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                            Abbrechen
                        </button>
                        <button type="submit"
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Speichern
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios';

export default {
    name: 'MahnungDashboard',
    emits: ['back-to-invoices', 'reload-invoices'],
    data() {
        return {
            mahnungStats: {},
            mahnungen: { data: [] },
            overdueInvoices: [],
            searchQuery: '',
            statusFilter: '',
            mahnstufenFilter: '',
            showEditModal: false,
            editingMahnung: null,
            mahnungForm: {
                notes: '',
                payment_deadline_days: 14,
                late_fee: 0,
                reminder_fee: 5.00
            }
        }
    },
    computed: {
        filteredMahnungen() {
            let filtered = this.mahnungen.data || [];

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(mahnung =>
                    mahnung.mahnung_number.toLowerCase().includes(query) ||
                    mahnung.invoice.invoice_number.toLowerCase().includes(query) ||
                    mahnung.invoice.customer_name.toLowerCase().includes(query)
                );
            }

            return filtered;
        }
    },
    async mounted() {
        await Promise.all([
            this.loadMahnungStats(),
            this.loadMahnungen(),
            this.loadOverdueInvoices()
        ]);
    },
    methods: {
        async loadMahnungStats() {
            try {
                const response = await axios.get('/mahnungen/dashboard-stats');
                this.mahnungStats = response.data.stats;
            } catch (error) {
                console.error('Fehler beim Laden der Mahnung-Statistiken:', error);
            }
        },

        async loadMahnungen(page = 1) {
            try {
                const params = new URLSearchParams();
                if (this.statusFilter) params.append('status', this.statusFilter);
                if (this.mahnstufenFilter) params.append('mahnstufe', this.mahnstufenFilter);
                params.append('page', page);

                const response = await axios.get(`/mahnungen?${params}`);
                this.mahnungen = response.data.mahnungen;
            } catch (error) {
                console.error('Fehler beim Laden der Mahnungen:', error);
            }
        },

        async loadOverdueInvoices() {
            try {
                const response = await axios.get('/invoices/needing-reminder');
                this.overdueInvoices = response.data.invoices;
            } catch (error) {
                console.error('Fehler beim Laden der überfälligen Rechnungen:', error);
            }
        },

        async createMahnung(invoiceId) {
            if (!confirm('Möchten Sie eine Mahnung für diese Rechnung erstellen?')) {
                return;
            }

            try {
                const response = await axios.post(`/invoices/${invoiceId}/mahnung`);
                
                if (response.data.success) {
                    this.$emit('reload-invoices');
                    await Promise.all([
                        this.loadMahnungStats(),
                        this.loadMahnungen(),
                        this.loadOverdueInvoices()
                    ]);
                    this.showNotification(response.data.message, 'success');
                }
            } catch (error) {
                this.showNotification('Fehler beim Erstellen der Mahnung', 'error');
                console.error('Fehler beim Erstellen der Mahnung:', error);
            }
        },

        editMahnung(mahnung) {
            this.editingMahnung = { ...mahnung };
            this.mahnungForm = {
                notes: mahnung.notes || '',
                payment_deadline_days: mahnung.payment_deadline_days || 14,
                late_fee: mahnung.late_fee || 0,
                reminder_fee: mahnung.reminder_fee || 5.00
            };
            this.showEditModal = true;
        },

        async saveMahnung() {
            if (!this.editingMahnung) return;

            try {
                const response = await axios.put(`/mahnungen/${this.editingMahnung.id}`, this.mahnungForm);

                if (response.data.success) {
                    this.showNotification(response.data.message, 'success');
                    this.showEditModal = false;
                    this.editingMahnung = null;
                    await this.loadMahnungen();
                }
            } catch (error) {
                this.showNotification('Fehler beim Speichern der Mahnung', 'error');
                console.error('Fehler beim Speichern der Mahnung:', error);
            }
        },

        async sendMahnung(mahnungId) {
            if (!confirm('Möchten Sie diese Mahnung wirklich versenden?')) {
                return;
            }

            try {
                const response = await axios.post(`/mahnungen/${mahnungId}/send`);

                if (response.data.success) {
                    this.showNotification(response.data.message, 'success');
                    await Promise.all([
                        this.loadMahnungen(),
                        this.loadMahnungStats()
                    ]);
                    this.$emit('reload-invoices');
                }
            } catch (error) {
                this.showNotification('Fehler beim Versenden der Mahnung', 'error');
                console.error('Fehler beim Versenden der Mahnung:', error);
            }
        },

        async markMahnungAsPaid(mahnungId) {
            if (!confirm('Möchten Sie diese Mahnung als bezahlt markieren?')) {
                return;
            }

            try {
                const response = await axios.post(`/mahnungen/${mahnungId}/mark-paid`);

                if (response.data.success) {
                    this.showNotification(response.data.message, 'success');
                    await Promise.all([
                        this.loadMahnungen(),
                        this.loadMahnungStats()
                    ]);
                    this.$emit('reload-invoices');
                }
            } catch (error) {
                this.showNotification('Fehler beim Markieren der Mahnung', 'error');
                console.error('Fehler beim Markieren der Mahnung:', error);
            }
        },

        async deleteMahnung(mahnungId) {
            if (!confirm('Möchten Sie diese Mahnung wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) {
                return;
            }

            try {
                const response = await axios.delete(`/mahnungen/${mahnungId}`);

                if (response.data.success) {
                    this.showNotification(response.data.message, 'success');
                    await Promise.all([
                        this.loadMahnungen(),
                        this.loadMahnungStats()
                    ]);
                    this.$emit('reload-invoices');
                }
            } catch (error) {
                this.showNotification('Fehler beim Löschen der Mahnung', 'error');
                console.error('Fehler beim Löschen der Mahnung:', error);
            }
        },

        async downloadMahnungPDF(mahnungId) {
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

                this.showNotification('Mahnung-PDF erfolgreich heruntergeladen!', 'success');
            } catch (error) {
                this.showNotification('Fehler beim Mahnung-PDF Download', 'error');
                console.error('Fehler beim Download der Mahnung-PDF:', error);
            }
        },

        showNotification(message, type = 'info') {
            // This should emit to parent or use a global notification system
            console.log(`${type}: ${message}`);
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

        getMahnstufeText(mahnstufe) {
            const texts = {
                1: '1. Mahnung',
                2: '2. Mahnung',
                3: 'Letzte Mahnung',
                4: 'Inkasso'
            };
            return texts[mahnstufe] || `Stufe ${mahnstufe}`;
        },

        getMahnstufeClass(mahnstufe) {
            const classes = {
                1: 'bg-blue-100 text-blue-800',
                2: 'bg-yellow-100 text-yellow-800',
                3: 'bg-orange-100 text-orange-800',
                4: 'bg-red-100 text-red-800'
            };
            return classes[mahnstufe] || 'bg-gray-100 text-gray-800';
        },

        getMahnungStatusText(status) {
            const statusTexts = {
                'draft': 'Entwurf',
                'sent': 'Versendet',
                'paid': 'Bezahlt',
                'cancelled': 'Storniert'
            };
            return statusTexts[status] || status;
        },

        getMahnungStatusClass(status) {
            const statusClasses = {
                'draft': 'bg-blue-100 text-blue-800',
                'sent': 'bg-orange-100 text-orange-800',
                'paid': 'bg-green-100 text-green-800',
                'cancelled': 'bg-gray-100 text-gray-600'
            };
            return statusClasses[status] || 'bg-gray-100 text-gray-800';
        },

        isOverdue(dueDate) {
            if (!dueDate) return false;
            return new Date(dueDate) < new Date();
        }
    }
}
</script>