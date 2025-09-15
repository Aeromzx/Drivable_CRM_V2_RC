import { createApp } from 'vue';
import InvoicingDashboard from './components/InvoicingDashboard.vue';

const app = createApp({});

// Register components globally
app.component('InvoicingDashboard', InvoicingDashboard);

// Mount the app
app.mount('#app');