<template>
    <div class="flex items-center space-x-2">
        <!-- Mahnung Status Badge -->
        <span :class="getMahnungStatusClass(invoice.mahnung_status)"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
            {{ getMahnungStatusText(invoice.mahnung_status) }}
        </span>

        <!-- Mahnung Action Buttons -->
        <div v-if="canCreateMahnung(invoice) || hasExistingMahnungen(invoice)" class="flex space-x-1">
            <!-- Create First Mahnung -->
            <button v-if="canCreateMahnung(invoice)"
                    @click="$emit('create-mahnung', invoice.id, 1)"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                    title="1. Mahnung erstellen">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span class="hidden sm:inline">1. Mahnung</span>
                <span class="sm:hidden">1.M</span>
            </button>

            <!-- Create Second Mahnung -->
            <button v-if="canCreateSecondMahnung(invoice)"
                    @click="$emit('create-mahnung', invoice.id, 2)"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    title="2. Mahnung erstellen">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span class="hidden sm:inline">2. Mahnung</span>
                <span class="sm:hidden">2.M</span>
            </button>

            <!-- Create Third Mahnung -->
            <button v-if="canCreateThirdMahnung(invoice)"
                    @click="$emit('create-mahnung', invoice.id, 3)"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                    title="Letzte Mahnung erstellen">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span class="hidden sm:inline">Letzte</span>
                <span class="sm:hidden">3.M</span>
            </button>

            <!-- Show existing Mahnungen count -->
            <div v-if="hasExistingMahnungen(invoice)" class="flex items-center space-x-1">
                <div class="w-px h-4 bg-gray-300"></div>
                <span class="text-xs text-gray-500">
                    {{ invoice.mahnungen.length }} Mahnung{{ invoice.mahnungen.length > 1 ? 'en' : '' }}
                </span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'MahnungStatus',
    props: {
        invoice: {
            type: Object,
            required: true
        }
    },
    emits: ['create-mahnung'],
    methods: {
        canCreateMahnung(invoice) {
            if (invoice.status === 'paid') return false;
            if (!invoice.due_date) return false;

            const dueDate = new Date(invoice.due_date);
            const today = new Date();

            return dueDate < today &&
                   ['none', 'due'].includes(invoice.mahnung_status || 'none');
        },

        hasExistingMahnungen(invoice) {
            return invoice.mahnungen && invoice.mahnungen.length > 0;
        },

        canCreateSecondMahnung(invoice) {
            if (invoice.status === 'paid') return false;
            if (!invoice.mahnungen || invoice.mahnungen.length === 0) return false;

            // Check if first Mahnung exists
            const firstMahnung = invoice.mahnungen.find(m => m.mahnstufe === 1);
            if (!firstMahnung) return false;

            // Check if second Mahnung already exists
            const secondMahnung = invoice.mahnungen.find(m => m.mahnstufe === 2);
            return !secondMahnung;
        },

        canCreateThirdMahnung(invoice) {
            if (invoice.status === 'paid') return false;
            if (!invoice.mahnungen || invoice.mahnungen.length < 2) return false;

            // Check if second Mahnung exists
            const secondMahnung = invoice.mahnungen.find(m => m.mahnstufe === 2);
            if (!secondMahnung) return false;

            // Check if third Mahnung already exists
            const thirdMahnung = invoice.mahnungen.find(m => m.mahnstufe === 3);
            return !thirdMahnung;
        },

        getMahnungStatusText(status) {
            const statusTexts = {
                'none': 'Keine',
                'due': 'Fällig',
                'reminded_1': '1. Mahnung',
                'reminded_2': '2. Mahnung',
                'reminded_3': 'Letzte Mahnung',
                'collection': 'Inkasso',
                'paid_after_reminder': 'Bezahlt'
            };
            return statusTexts[status] || '-';
        },

        getMahnungStatusClass(status) {
            const statusClasses = {
                'none': 'bg-gray-100 text-gray-800',
                'due': 'bg-yellow-100 text-yellow-800',
                'reminded_1': 'bg-orange-100 text-orange-800',
                'reminded_2': 'bg-red-100 text-red-800',
                'reminded_3': 'bg-red-200 text-red-900',
                'collection': 'bg-red-300 text-red-900',
                'paid_after_reminder': 'bg-green-100 text-green-800'
            };
            return statusClasses[status] || 'bg-gray-100 text-gray-800';
        }
    }
}
</script>