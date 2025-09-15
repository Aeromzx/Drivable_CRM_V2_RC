<template>
    <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-10 mx-auto p-6 border w-11/12 max-w-6xl shadow-lg rounded-xl bg-white mb-20">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900">
                        {{ isEditing ? 'Rechnung bearbeiten' : 'Neue Rechnung erstellen' }}
                    </h3>
                </div>
                <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Error Display -->
            <div v-if="validationErrors.length > 0" class="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div class="ml-3">
                        <h4 class="text-red-800 font-medium mb-2">Bitte korrigieren Sie folgende Fehler:</h4>
                        <ul class="text-red-700 text-sm space-y-1">
                            <li v-for="error in validationErrors" :key="error" class="flex items-start">
                                <span class="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {{ error }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <form @submit.prevent="saveInvoice" class="space-y-8">
                <!-- Customer Information Section -->
                <div class="bg-gray-50 rounded-xl p-6">
                    <div class="flex items-center mb-4">
                        <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <h4 class="text-lg font-semibold text-gray-900">Kundeninformationen</h4>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Kundenname <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="form.customer_name"
                                type="text"
                                required
                                :class="[
                                    'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                                    hasFieldError('customer_name') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                ]"
                                placeholder="Name des Kunden eingeben"
                            >
                            <p v-if="hasFieldError('customer_name')" class="text-red-500 text-xs mt-1">
                                Kundenname ist erforderlich
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
                            <input
                                v-model="form.customer_email"
                                type="email"
                                :class="[
                                    'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                                    hasFieldError('customer_email') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                ]"
                                placeholder="kunde@example.com"
                            >
                            <p v-if="hasFieldError('customer_email')" class="text-red-500 text-xs mt-1">
                                Bitte geben Sie eine gültige E-Mail-Adresse ein
                            </p>
                        </div>
                    </div>

                    <div class="mt-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rechnungsadresse</label>
                        <textarea
                            v-model="form.customer_address"
                            rows="4"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="Straße, Hausnummer&#10;PLZ Ort&#10;Land"
                        ></textarea>
                    </div>
                </div>

                <!-- Invoice Details Section -->
                <div class="bg-gray-50 rounded-xl p-6">
                    <div class="flex items-center mb-4">
                        <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z"></path>
                        </svg>
                        <h4 class="text-lg font-semibold text-gray-900">Rechnungsdetails</h4>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Rechnungsdatum <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="form.invoice_date"
                                type="date"
                                required
                                :class="[
                                    'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                                    hasFieldError('invoice_date') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                ]"
                            >
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fälligkeitsdatum</label>
                            <input
                                v-model="form.due_date"
                                type="date"
                                :min="form.invoice_date"
                                :class="[
                                    'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                                    hasFieldError('due_date') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                ]"
                            >
                            <p v-if="hasFieldError('due_date')" class="text-red-500 text-xs mt-1">
                                Fälligkeitsdatum muss nach dem Rechnungsdatum liegen
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Invoice Items Section -->
                <div class="bg-white border border-gray-200 rounded-xl p-6">
                    <div class="flex justify-between items-center mb-6">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            <h4 class="text-lg font-semibold text-gray-900">
                                Rechnungspositionen <span class="text-red-500">*</span>
                            </h4>
                        </div>
                        <button
                            type="button"
                            @click="addItem"
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            <span>Position hinzufügen</span>
                        </button>
                    </div>

                    <!-- Items Table Header -->
                    <div class="hidden md:grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 text-sm font-medium text-gray-700">
                        <div class="col-span-1">Pos.</div>
                        <div class="col-span-1">Anzahl</div>
                        <div class="col-span-1">Einheit</div>
                        <div class="col-span-4">Bezeichnung</div>
                        <div class="col-span-2">Einzelpreis (€)</div>
                        <div class="col-span-2">Gesamtpreis (€)</div>
                        <div class="col-span-1"></div>
                    </div>

                    <!-- Items -->
                    <div class="space-y-4 mt-4">
                        <div v-for="(item, index) in form.items" :key="index" 
                             class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 bg-gray-50 rounded-lg border border-gray-200">
                            
                            <!-- Position -->
                            <div class="md:col-span-1">
                                <label class="block text-xs font-medium text-gray-700 mb-1 md:hidden">Position</label>
                                <input
                                    v-model="item.position"
                                    type="number"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                            </div>

                            <!-- Quantity -->
                            <div class="md:col-span-1">
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    Anzahl <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="item.quantity"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    @input="calculateItemTotal(index)"
                                    :class="[
                                        'w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                        hasItemError(index, 'quantity') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                >
                            </div>

                            <!-- Unit -->
                            <div class="md:col-span-1">
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    Einheit <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="item.unit"
                                    type="text"
                                    required
                                    :class="[
                                        'w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                        hasItemError(index, 'unit') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                    placeholder="Stück, Std., kg..."
                                >
                            </div>

                            <!-- Description -->
                            <div class="md:col-span-4">
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    Bezeichnung <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="item.description"
                                    type="text"
                                    required
                                    :class="[
                                        'w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                        hasItemError(index, 'description') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                    placeholder="Beschreibung der Leistung"
                                >
                            </div>

                            <!-- Unit Price -->
                            <div class="md:col-span-2">
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    Einzelpreis (€) <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="item.unit_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    @input="calculateItemTotal(index)"
                                    :class="[
                                        'w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                        hasItemError(index, 'unit_price') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    ]"
                                    placeholder="0,00"
                                >
                            </div>

                            <!-- Total Price -->
                            <div class="md:col-span-2">
                                <label class="block text-xs font-medium text-gray-700 mb-1">Gesamtpreis (€)</label>
                                <input
                                    v-model="item.total_price"
                                    type="number"
                                    step="0.01"
                                    readonly
                                    class="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-100"
                                >
                            </div>

                            <!-- Remove Button -->
                            <div class="md:col-span-1 flex justify-center">
                                <button
                                    type="button"
                                    @click="removeItem(index)"
                                    :disabled="form.items.length === 1"
                                    :class="[
                                        'p-2 rounded-full transition-colors',
                                        form.items.length === 1 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                    ]"
                                    title="Position entfernen"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tax and Totals Section -->
                <div class="bg-gray-50 rounded-xl p-6">
                    <div class="flex items-center mb-4">
                        <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                        <h4 class="text-lg font-semibold text-gray-900">Steuer und Gesamtbeträge</h4>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Steuersatz (%) <span class="text-red-500">*</span>
                            </label>
                            <select
                                v-model="form.tax_rate"
                                @change="calculateTotals"
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="0">0% (steuerfrei)</option>
                                <option value="7">7% (ermäßigt)</option>
                                <option value="19">19% (regulär)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nettobetrag (€)</label>
                            <div class="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-right font-medium text-blue-900">
                                {{ formatCurrency(form.subtotal) }}
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Steuerbetrag (€)</label>
                            <div class="w-full px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-right font-medium text-yellow-900">
                                {{ formatCurrency(form.tax_amount) }}
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Gesamtbetrag (€)</label>
                            <div class="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-right font-bold text-green-900 text-lg">
                                {{ formatCurrency(form.total_amount) }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Notes Section -->
                <div class="bg-gray-50 rounded-xl p-6">
                    <div class="flex items-center mb-4">
                        <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                        </svg>
                        <h4 class="text-lg font-semibold text-gray-900">Notizen und Hinweise</h4>
                    </div>

                    <!-- Text Templates -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Textvorlagen:</label>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="template in noteTemplates"
                                :key="template.id"
                                type="button"
                                @click="insertNoteTemplate(template.text)"
                                class="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full hover:bg-blue-200 transition-colors"
                            >
                                {{ template.name }}
                            </button>
                        </div>
                    </div>

                    <textarea
                        ref="notesTextarea"
                        v-model="form.notes"
                        rows="5"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Zusätzliche Hinweise zur Rechnung... 

Beispiel:
- Zahlungsbedingungen
- Lieferinformationen
- Kontaktdaten für Rückfragen"
                    ></textarea>
                </div>

                <!-- Form Actions -->
                <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        @click="closeModal"
                        class="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        :disabled="submitting"
                        :class="[
                            'px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2',
                            submitting 
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        ]"
                    >
                        <svg v-if="submitting" class="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{{ submitting ? 'Speichern...' : (isEditing ? 'Aktualisieren' : 'Erstellen') }}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    name: 'InvoiceModal',
    props: {
        show: {
            type: Boolean,
            default: false
        },
        invoice: {
            type: Object,
            default: null
        },
        isEditing: {
            type: Boolean,
            default: false
        }
    },
    emits: ['close', 'save'],
    data() {
        return {
            submitting: false,
            validationErrors: [],
            fieldErrors: {},
            form: {
                customer_name: '',
                customer_email: '',
                customer_address: '',
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: '',
                items: [
                    {
                        position: 1,
                        quantity: 1,
                        unit: 'Stück',
                        description: '',
                        unit_price: 0,
                        total_price: 0
                    }
                ],
                subtotal: 0,
                tax_rate: 19,
                tax_amount: 0,
                total_amount: 0,
                notes: '',
                status: 'draft'
            },
            noteTemplates: [
                {
                    id: 1,
                    name: 'Standard',
                    text: 'Vielen Dank für Ihr Vertrauen in unsere Dienstleistungen. Im Folgenden finden Sie die Rechnung für die von Ihnen in Auftrag gegebenen Leistungen.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.'
                },
                {
                    id: 2,
                    name: 'Flyer-Service',
                    text: 'Im Anhang finden Sie die Rechnung für die von Ihnen in Auftrag gegebenen Flyer. Diese werden nach Eingang der Zahlung direkt verschickt!\n\nVielen Dank für Ihre Bestellung.'
                },
                {
                    id: 3,
                    name: 'Chat-Verstoß',
                    text: 'Im Anhang finden Sie die Rechnung für den begangenen Verstoß, einen Kunden von der Platform Drivable runter zu konvertieren.\n\nBitte beachten Sie unsere AGB bezüglich des Verhaltens auf der Plattform.'
                },
                {
                    id: 4,
                    name: 'Vertragsstrafe',
                    text: 'Die Vertragsstrafe wurde gemäß § 9 der Drivable-AGB verhängt. Die Höhe ergibt sich aus der Bewertung des Verstoßes unter Berücksichtigung des Einzelfalls nach billigem Ermessen durch die Drivable-Plattformbetreiber.\n\nBei Rückfragen wenden Sie sich bitte an unser Support-Team.'
                },
                {
                    id: 5,
                    name: 'Zahlungsbedingungen',
                    text: 'Zahlungsbedingungen:\n- Zahlbar innerhalb von 14 Tagen nach Rechnungsdatum\n- Bei Verzug werden Zinsen in Höhe von 9% über dem Basiszinssatz berechnet\n- Skonto: 2% bei Zahlung innerhalb von 7 Tagen'
                }
            ]
        }
    },
    watch: {
        show(newVal) {
            if (newVal) {
                this.initializeForm();
            }
        },
        invoice: {
            handler(newVal) {
                if (newVal && this.show) {
                    this.initializeForm();
                }
            },
            deep: true
        }
    },
    mounted() {
        if (this.show) {
            this.initializeForm();
        }
    },
    methods: {
        initializeForm() {
            if (this.isEditing && this.invoice) {
                this.form = {
                    ...this.invoice,
                    // Ensure items is always an array
                    items: this.invoice.items || [{
                        position: 1,
                        quantity: 1,
                        unit: 'Stück',
                        description: '',
                        unit_price: 0,
                        total_price: 0
                    }]
                };
            } else {
                this.resetForm();
            }
            this.clearErrors();
        },

        resetForm() {
            this.form = {
                customer_name: '',
                customer_email: '',
                customer_address: '',
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: '',
                items: [
                    {
                        position: 1,
                        quantity: 1,
                        unit: 'Stück',
                        description: '',
                        unit_price: 0,
                        total_price: 0
                    }
                ],
                subtotal: 0,
                tax_rate: 19,
                tax_amount: 0,
                total_amount: 0,
                notes: '',
                status: 'draft'
            };
        },

        addItem() {
            const nextPosition = this.form.items.length + 1;
            this.form.items.push({
                position: nextPosition,
                quantity: 1,
                unit: 'Stück',
                description: '',
                unit_price: 0,
                total_price: 0
            });
        },

        removeItem(index) {
            if (this.form.items.length > 1) {
                this.form.items.splice(index, 1);
                // Reorder positions
                this.form.items.forEach((item, idx) => {
                    item.position = idx + 1;
                });
                this.calculateTotals();
            }
        },

        calculateItemTotal(index) {
            const item = this.form.items[index];
            item.total_price = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
            this.calculateTotals();
        },

        calculateTotals() {
            this.form.subtotal = this.form.items.reduce((sum, item) => {
                return sum + (parseFloat(item.total_price) || 0);
            }, 0);

            this.form.tax_amount = this.form.subtotal * (parseFloat(this.form.tax_rate) || 0) / 100;
            this.form.total_amount = this.form.subtotal + this.form.tax_amount;
        },

        insertNoteTemplate(template) {
            const textarea = this.$refs.notesTextarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentValue = this.form.notes;

            // Add template at cursor position or append if no text
            let newValue;
            if (currentValue.trim() === '') {
                newValue = template;
            } else {
                newValue = currentValue.substring(0, start) +
                    (start > 0 && currentValue[start - 1] !== '\n' ? '\n\n' : '') +
                    template +
                    (end < currentValue.length && currentValue[end] !== '\n' ? '\n\n' : '') +
                    currentValue.substring(end);
            }

            this.form.notes = newValue;

            // Focus back to textarea
            this.$nextTick(() => {
                textarea.focus();
                const newCursorPosition = start + template.length + (start > 0 ? 2 : 0);
                textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            });
        },

        validateForm() {
            this.validationErrors = [];
            this.fieldErrors = {};

            // Customer name validation
            if (!this.form.customer_name.trim()) {
                this.validationErrors.push('Kundenname ist erforderlich');
                this.fieldErrors.customer_name = true;
            }

            // Email validation
            if (this.form.customer_email && !this.isValidEmail(this.form.customer_email)) {
                this.validationErrors.push('E-Mail-Adresse ist ungültig');
                this.fieldErrors.customer_email = true;
            }

            // Invoice date validation
            if (!this.form.invoice_date) {
                this.validationErrors.push('Rechnungsdatum ist erforderlich');
                this.fieldErrors.invoice_date = true;
            }

            // Due date validation
            if (this.form.due_date && this.form.invoice_date &&
                new Date(this.form.due_date) < new Date(this.form.invoice_date)) {
                this.validationErrors.push('Fälligkeitsdatum muss nach dem Rechnungsdatum liegen');
                this.fieldErrors.due_date = true;
            }

            // Items validation
            if (this.form.items.length === 0) {
                this.validationErrors.push('Mindestens eine Position ist erforderlich');
            }

            this.form.items.forEach((item, index) => {
                if (!item.quantity || parseFloat(item.quantity) <= 0) {
                    this.validationErrors.push(`Position ${index + 1}: Anzahl muss größer als 0 sein`);
                    this.fieldErrors[`items.${index}.quantity`] = true;
                }
                if (!item.unit.trim()) {
                    this.validationErrors.push(`Position ${index + 1}: Einheit ist erforderlich`);
                    this.fieldErrors[`items.${index}.unit`] = true;
                }
                if (!item.description.trim()) {
                    this.validationErrors.push(`Position ${index + 1}: Bezeichnung ist erforderlich`);
                    this.fieldErrors[`items.${index}.description`] = true;
                }
                if (!item.unit_price || parseFloat(item.unit_price) < 0) {
                    this.validationErrors.push(`Position ${index + 1}: Einzelpreis muss größer oder gleich 0 sein`);
                    this.fieldErrors[`items.${index}.unit_price`] = true;
                }
            });

            // Tax rate validation
            if (this.form.tax_rate === null || this.form.tax_rate === undefined ||
                parseFloat(this.form.tax_rate) < 0 || parseFloat(this.form.tax_rate) > 100) {
                this.validationErrors.push('Steuersatz muss zwischen 0 und 100 liegen');
                this.fieldErrors.tax_rate = true;
            }

            return this.validationErrors.length === 0;
        },

        hasFieldError(fieldName) {
            return this.fieldErrors[fieldName] || false;
        },

        hasItemError(index, field) {
            return this.fieldErrors[`items.${index}.${field}`] || false;
        },

        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        clearErrors() {
            this.validationErrors = [];
            this.fieldErrors = {};
        },

        async saveInvoice() {
            if (!this.validateForm()) {
                // Scroll to top to show errors
                this.$el.querySelector('.relative').scrollTop = 0;
                return;
            }

            try {
                this.submitting = true;
                await this.$emit('save', { ...this.form });
            } catch (error) {
                console.error('Error saving invoice:', error);
            } finally {
                this.submitting = false;
            }
        },

        closeModal() {
            this.clearErrors();
            this.$emit('close');
        },

        formatCurrency(amount) {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount || 0);
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

/* Custom scrollbar for the modal */
.relative {
    max-height: 90vh;
    overflow-y: auto;
}

.relative::-webkit-scrollbar {
    width: 6px;
}

.relative::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.relative::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 10px;
}

.relative::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
}
</style>