<template>
    <div class="relative inline-block text-left">
        <button @click="toggleDropdown"
                class="inline-flex justify-center items-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
        </button>

        <div v-if="showDropdown"
             v-click-outside="closeDropdown"
             class="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
            <div class="py-2">
                <!-- Edit Option -->
                <button @click="editInvoice"
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Rechnung bearbeiten
                </button>

                <div class="border-t border-gray-100 my-1"></div>

                <!-- Download Options -->
                <div class="px-4 py-2">
                    <div class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                        Downloads
                    </div>
                </div>

                <button @click="downloadInvoicePDF"
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Rechnung PDF
                </button>

                <!-- Mahnung Downloads -->
                <div v-if="invoice.mahnungen && invoice.mahnungen.length > 0">
                    <button v-for="mahnung in invoice.mahnungen" :key="mahnung.id"
                            @click="downloadMahnungPDF(mahnung.id)"
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                        <svg class="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {{ getMahnstufeText(mahnung.mahnstufe) }} PDF
                        <span class="text-xs text-gray-500 ml-auto">{{ formatDate(mahnung.mahnung_date) }}</span>
                    </button>
                </div>

                <div class="border-t border-gray-100 my-1"></div>

                <!-- Payment Links -->
                <div v-if="!invoice.stripe_payment_link_url || invoice.stripe_payment_link_url" class="px-4 py-2">
                    <div class="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                        Online Zahlung
                    </div>
                </div>

                <!-- Create Payment Link for Invoice -->
                <button v-if="!invoice.stripe_payment_link_url && invoice.status !== 'paid'"
                        @click="createPaymentLink"
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Payment Link erstellen
                </button>

                <!-- Copy Payment Link -->
                <button v-if="invoice.stripe_payment_link_url"
                        @click="copyPaymentLink"
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Payment Link kopieren
                </button>

                <div class="border-t border-gray-100 my-1"></div>

                <!-- Delete Option -->
                <button @click="deleteInvoice"
                        class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Rechnung löschen
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ActionDropdown',
    props: {
        invoice: {
            type: Object,
            required: true
        }
    },
    emits: ['edit', 'delete', 'download-pdf', 'download-mahnung', 'create-payment-link', 'copy-payment-link'],
    data() {
        return {
            showDropdown: false
        }
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    },
    methods: {
        toggleDropdown() {
            this.showDropdown = !this.showDropdown;
        },

        closeDropdown() {
            this.showDropdown = false;
        },

        handleClickOutside(event) {
            if (!this.$el.contains(event.target)) {
                this.showDropdown = false;
            }
        },

        editInvoice() {
            this.$emit('edit', this.invoice);
            this.closeDropdown();
        },

        deleteInvoice() {
            this.$emit('delete', this.invoice.id);
            this.closeDropdown();
        },

        downloadInvoicePDF() {
            this.$emit('download-pdf', this.invoice.id, this.invoice.invoice_number);
            this.closeDropdown();
        },

        downloadMahnungPDF(mahnungId) {
            this.$emit('download-mahnung', mahnungId);
            this.closeDropdown();
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

        formatDate(date) {
            return new Date(date).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        },

        createPaymentLink() {
            this.$emit('create-payment-link', this.invoice.id);
            this.closeDropdown();
        },

        async copyPaymentLink() {
            try {
                await navigator.clipboard.writeText(this.invoice.stripe_payment_link_url);
                this.$emit('copy-payment-link', 'Payment Link wurde in die Zwischenablage kopiert');
            } catch (err) {
                this.$emit('copy-payment-link', 'Fehler beim Kopieren des Links');
            }
            this.closeDropdown();
        }
    },
    directives: {
        'click-outside': {
            bind(el, binding) {
                el.clickOutsideEvent = function (event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        binding.value(event, el);
                    }
                };
                document.addEventListener('click', el.clickOutsideEvent);
            },
            unbind(el) {
                document.removeEventListener('click', el.clickOutsideEvent);
            }
        }
    }
}
</script>