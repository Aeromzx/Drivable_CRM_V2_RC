<template>
    <div class="relative">
        <select
            :value="status"
            @change="$emit('update', $event.target.value)"
            :class="[
                'text-xs font-medium rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-offset-2 cursor-pointer',
                statusClass
            ]"
        >
            <option value="draft">Entwurf</option>
            <option value="sent">Versendet</option>
            <option value="paid">Bezahlt</option>
            <option value="overdue">Überfällig</option>
            <option value="collection">Zu Inkasso abgegeben</option>
        </select>
    </div>
</template>

<script>
export default {
    name: 'StatusBadge',
    props: {
        status: {
            type: String,
            required: true
        }
    },
    emits: ['update'],
    computed: {
        statusClass() {
            const classes = {
                'draft': 'bg-gray-100 text-gray-800 focus:ring-gray-500',
                'sent': 'bg-blue-100 text-blue-800 focus:ring-blue-500',
                'paid': 'bg-green-100 text-green-800 focus:ring-green-500',
                'overdue': 'bg-red-100 text-red-800 focus:ring-red-500',
                'collection': 'bg-purple-100 text-purple-800 focus:ring-purple-500'
            };
            return classes[this.status] || 'bg-gray-100 text-gray-800 focus:ring-gray-500';
        }
    }
}
</script>