<template>
  <div class="inventory-alert-center">
    <!-- Header Section -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Inventory Alerts</h1>
        <p class="text-gray-600">Monitor stock levels and manage alert rules</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="refreshAlerts"
          :disabled="loading"
          class="btn-secondary flex items-center gap-2"
        >
          <Icon name="heroicons:arrow-path" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button
          @click="showCreateRuleModal = true"
          class="btn-primary flex items-center gap-2"
        >
          <Icon name="heroicons:plus" />
          New Alert Rule
        </button>
      </div>
    </div>

    <!-- Alert Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Alerts</p>
            <p class="text-2xl font-bold text-gray-900">{{ alertSummary.total_alerts }}</p>
          </div>
          <Icon name="heroicons:bell" class="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Critical</p>
            <p class="text-2xl font-bold text-red-600">{{ alertSummary.critical_alerts }}</p>
          </div>
          <Icon name="heroicons:exclamation-triangle" class="h-8 w-8 text-red-500" />
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Low Stock</p>
            <p class="text-2xl font-bold text-yellow-600">{{ alertSummary.low_stock_alerts }}</p>
          </div>
          <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-yellow-500" />
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Out of Stock</p>
            <p class="text-2xl font-bold text-gray-600">{{ alertSummary.out_of_stock_alerts }}</p>
          </div>
          <Icon name="heroicons:x-circle" class="h-8 w-8 text-gray-500" />
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Store</label>
          <select
            v-model="filters.store_id"
            @change="applyFilters"
            class="form-select"
          >
            <option value="">All Stores</option>
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <select
            v-model="filters.severity"
            @change="applyFilters"
            class="form-select"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="low">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div class="ml-auto">
          <button
            @click="clearFilters"
            class="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Alerts List -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Active Alerts</h3>
      </div>

      <div v-if="loading && alerts.length === 0" class="p-6 text-center">
        <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p class="mt-2 text-gray-600">Loading alerts...</p>
      </div>

      <div v-else-if="alerts.length === 0" class="p-6 text-center">
        <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
        <p class="text-gray-600">All inventory levels are within acceptable ranges.</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="p-6 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-4 flex-1">
              <!-- Severity Indicator -->
              <div class="mt-1">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="{
                    'bg-red-500': alert.severity === 'critical',
                    'bg-yellow-500': alert.severity === 'low',
                    'bg-gray-500': alert.severity === 'out_of_stock'
                  }"
                ></div>
              </div>

              <!-- Alert Details -->
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-gray-900">{{ alert.products?.name }}</h4>
                  <span class="text-sm text-gray-500">({{ alert.products?.sku }})</span>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                    :class="{
                      'bg-red-100 text-red-800': alert.severity === 'critical',
                      'bg-yellow-100 text-yellow-800': alert.severity === 'low',
                      'bg-gray-100 text-gray-800': alert.severity === 'out_of_stock'
                    }"
                  >
                    {{ alert.severity.replace('_', ' ') }}
                  </span>
                </div>

                <div class="text-sm text-gray-600 mb-2">
                  <span class="font-medium">Current Stock:</span>
                  {{ alert.current_stock }} units
                  <span class="mx-2">•</span>
                  <span class="font-medium">Threshold:</span>
                  {{ alert.threshold }} units
                  <span v-if="alert.stores" class="mx-2">•</span>
                  <span v-if="alert.stores" class="font-medium">Store:</span>
                  <span v-if="alert.stores">{{ alert.stores.name }}</span>
                </div>

                <p class="text-sm text-gray-700">{{ alert.message }}</p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 ml-4">
              <button
                @click="acknowledgeAlert(alert.id)"
                class="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                Acknowledge
              </button>
              <button
                @click="viewProduct(alert.products?.id)"
                class="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              >
                View Product
              </button>
            </div>
          </div>

          <!-- Alert Timestamp -->
          <div class="mt-3 text-xs text-gray-400 ml-7">
            Alert created {{ formatDateTime(alert.created_at) }}
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMoreAlerts" class="p-4 border-t border-gray-200 text-center">
        <button
          @click="loadMoreAlerts"
          :disabled="loading"
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Load More Alerts
        </button>
      </div>
    </div>

    <!-- Create Alert Rule Modal -->
    <div
      v-if="showCreateRuleModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Create Alert Rule</h3>
        </div>
        <div class="p-6">
          <form @submit.prevent="createAlertRule">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                v-model="newRule.product_id"
                required
                class="form-select w-full"
              >
                <option value="">Select a product</option>
                <option v-for="product in products" :key="product.id" :value="product.id">
                  {{ product.name }} ({{ product.sku }})
                </option>
              </select>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
              <input
                v-model.number="newRule.low_stock_threshold"
                type="number"
                min="0"
                required
                class="form-input w-full"
                placeholder="10"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Critical Stock Threshold</label>
              <input
                v-model.number="newRule.critical_stock_threshold"
                type="number"
                min="0"
                required
                class="form-input w-full"
                placeholder="5"
              />
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notification Channels</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="newRule.notification_channels"
                    type="checkbox"
                    value="in_app"
                    class="mr-2"
                  />
                  In-App Notifications
                </label>
                <label class="flex items-center">
                  <input
                    v-model="newRule.notification_channels"
                    type="checkbox"
                    value="email"
                    class="mr-2"
                  />
                  Email Alerts
                </label>
                <label class="flex items-center">
                  <input
                    v-model="newRule.notification_channels"
                    type="checkbox"
                    value="sms"
                    class="mr-2"
                  />
                  SMS Notifications
                </label>
              </div>
            </div>

            <div class="flex gap-3">
              <button
                type="submit"
                :disabled="creatingRule"
                class="btn-primary flex-1"
              >
                {{ creatingRule ? 'Creating...' : 'Create Rule' }}
              </button>
              <button
                type="button"
                @click="showCreateRuleModal = false"
                class="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useInventoryAlertsStore } from '@/stores/inventoryAlerts'
import { useProductsStore } from '@/stores/products'
import { useStoresStore } from '@/stores/stores'
import { formatDateTime } from '@/utils/dateHelpers'

// Stores
const alertsStore = useInventoryAlertsStore()
const productsStore = useProductsStore()
const storesStore = useStoresStore()

// Reactive state
const loading = ref(false)
const showCreateRuleModal = ref(false)
const creatingRule = ref(false)

// Filters
const filters = reactive({
  store_id: '',
  severity: ''
})

// New alert rule form
const newRule = reactive({
  product_id: '',
  low_stock_threshold: 10,
  critical_stock_threshold: 5,
  notification_channels: ['in_app'] as string[]
})

// Computed properties
const alerts = computed(() => alertsStore.alerts)
const alertSummary = computed(() => alertsStore.summary)
const hasMoreAlerts = computed(() => alertsStore.hasMore)
const products = computed(() => productsStore.products)
const stores = computed(() => storesStore.stores)

// Methods
async function refreshAlerts() {
  loading.value = true
  try {
    await alertsStore.fetchAlerts({
      store_id: filters.store_id || undefined,
      severity: filters.severity || undefined
    })
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  refreshAlerts()
}

function clearFilters() {
  filters.store_id = ''
  filters.severity = ''
  refreshAlerts()
}

async function loadMoreAlerts() {
  loading.value = true
  try {
    await alertsStore.loadMore({
      store_id: filters.store_id || undefined,
      severity: filters.severity || undefined
    })
  } finally {
    loading.value = false
  }
}

async function acknowledgeAlert(alertId: string) {
  try {
    await alertsStore.acknowledgeAlert(alertId)
  } catch (error) {
    console.error('Failed to acknowledge alert:', error)
  }
}

function viewProduct(productId: string) {
  if (productId) {
    navigateTo(`/products/${productId}`)
  }
}

async function createAlertRule() {
  if (!newRule.product_id || newRule.notification_channels.length === 0) {
    return
  }

  creatingRule.value = true
  try {
    await alertsStore.createAlertRule({
      product_id: newRule.product_id,
      low_stock_threshold: newRule.low_stock_threshold,
      critical_stock_threshold: newRule.critical_stock_threshold,
      notification_channels: newRule.notification_channels
    })

    // Reset form and close modal
    Object.assign(newRule, {
      product_id: '',
      low_stock_threshold: 10,
      critical_stock_threshold: 5,
      notification_channels: ['in_app']
    })
    showCreateRuleModal.value = false

    // Refresh alerts to show any new ones
    await refreshAlerts()
  } catch (error) {
    console.error('Failed to create alert rule:', error)
  } finally {
    creatingRule.value = false
  }
}

// Initialize component
onMounted(async () => {
  loading.value = true
  try {
    // Load initial data
    await Promise.all([
      refreshAlerts(),
      productsStore.fetchProducts(),
      storesStore.fetchStores()
    ])
  } finally {
    loading.value = false
  }
})

// Set page meta
definePageMeta({
  title: 'Inventory Alerts',
  requiresAuth: true,
  layout: 'dashboard'
})
</script>

<style scoped>
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.btn-secondary {
  @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.form-select {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
}

.form-input {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
}
</style>