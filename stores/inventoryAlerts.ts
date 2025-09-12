import { defineStore } from 'pinia'
import type { InventoryAlert, InventoryAlertRule, AlertSummary } from '@/types/inventory'

interface InventoryAlertsState {
  alerts: InventoryAlert[]
  summary: AlertSummary
  loading: boolean
  error: string | null
  currentPage: number
  hasMore: boolean
  totalCount: number
}

interface AlertFilters {
  store_id?: string
  severity?: 'critical' | 'low' | 'out_of_stock'
  limit?: number
}

export const useInventoryAlertsStore = defineStore('inventoryAlerts', {
  state: (): InventoryAlertsState => ({
    alerts: [],
    summary: {
      total_alerts: 0,
      critical_alerts: 0,
      low_stock_alerts: 0,
      out_of_stock_alerts: 0
    },
    loading: false,
    error: null,
    currentPage: 1,
    hasMore: true,
    totalCount: 0
  }),

  getters: {
    /**
     * Get alerts by severity level
     */
    criticalAlerts: (state) => state.alerts.filter(alert => alert.severity === 'critical'),
    
    lowStockAlerts: (state) => state.alerts.filter(alert => alert.severity === 'low'),
    
    outOfStockAlerts: (state) => state.alerts.filter(alert => alert.severity === 'out_of_stock'),

    /**
     * Get alerts by store
     */
    alertsByStore: (state) => {
      const grouped = state.alerts.reduce((acc, alert) => {
        const storeId = alert.store_id || 'unknown'
        if (!acc[storeId]) {
          acc[storeId] = []
        }
        acc[storeId].push(alert)
        return acc
      }, {} as Record<string, InventoryAlert[]>)
      
      return grouped
    },

    /**
     * Check if there are any critical alerts
     */
    hasCriticalAlerts: (state) => state.summary.critical_alerts > 0,

    /**
     * Get total alert count for badge display
     */
    totalAlertCount: (state) => state.summary.total_alerts
  },

  actions: {
    /**
     * Fetch inventory alerts with optional filtering
     */
    async fetchAlerts(filters?: AlertFilters) {
      this.loading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        
        if (filters?.store_id) params.append('store_id', filters.store_id)
        if (filters?.severity) params.append('severity', filters.severity)
        if (filters?.limit) params.append('limit', filters.limit.toString())

        const response = await $fetch<{
          success: boolean
          data: InventoryAlert[]
          summary: AlertSummary
          meta: {
            total_count: number
            limit: number
            filtered_by: Record<string, any>
          }
        }>(`/api/v1/inventory/alerts?${params.toString()}`)

        if (response.success) {
          this.alerts = response.data
          this.summary = response.summary
          this.totalCount = response.meta.total_count
          this.hasMore = response.data.length === (filters?.limit || 50)
          this.currentPage = 1
        } else {
          throw new Error('Failed to fetch alerts')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch inventory alerts'
        console.error('Error fetching inventory alerts:', error)
      } finally {
        this.loading = false
      }
    },

    /**
     * Load more alerts (pagination)
     */
    async loadMore(filters?: AlertFilters) {
      if (this.loading || !this.hasMore) return

      this.loading = true

      try {
        const params = new URLSearchParams()
        
        if (filters?.store_id) params.append('store_id', filters.store_id)
        if (filters?.severity) params.append('severity', filters.severity)
        params.append('limit', (filters?.limit || 50).toString())
        params.append('offset', (this.alerts.length).toString())

        const response = await $fetch<{
          success: boolean
          data: InventoryAlert[]
          summary: AlertSummary
        }>(`/api/v1/inventory/alerts?${params.toString()}`)

        if (response.success) {
          this.alerts.push(...response.data)
          this.hasMore = response.data.length === (filters?.limit || 50)
          this.currentPage++
        } else {
          throw new Error('Failed to load more alerts')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to load more alerts'
        console.error('Error loading more alerts:', error)
      } finally {
        this.loading = false
      }
    },

    /**
     * Acknowledge an alert (mark as read)
     */
    async acknowledgeAlert(alertId: string) {
      try {
        const response = await $fetch(`/api/v1/inventory/alerts/${alertId}/acknowledge`, {
          method: 'POST'
        })

        if (response.success) {
          // Remove alert from list or mark as acknowledged
          const alertIndex = this.alerts.findIndex(alert => alert.id === alertId)
          if (alertIndex !== -1) {
            this.alerts.splice(alertIndex, 1)
            this.summary.total_alerts = Math.max(0, this.summary.total_alerts - 1)
          }

          // Show success message
          useNuxtApp().$toast?.success('Alert acknowledged successfully')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to acknowledge alert'
        useNuxtApp().$toast?.error('Failed to acknowledge alert')
        console.error('Error acknowledging alert:', error)
      }
    },

    /**
     * Create new alert rule
     */
    async createAlertRule(rule: {
      product_id: string
      low_stock_threshold: number
      critical_stock_threshold: number
      notification_channels: string[]
      enabled?: boolean
    }) {
      this.loading = true

      try {
        const response = await $fetch<{
          success: boolean
          data: InventoryAlertRule
          message: string
        }>('/api/v1/inventory/alerts', {
          method: 'POST',
          body: {
            ...rule,
            enabled: rule.enabled ?? true
          }
        })

        if (response.success) {
          // Show success message
          useNuxtApp().$toast?.success(response.message || 'Alert rule created successfully')
          
          // Optionally refresh alerts to show any new ones triggered
          await this.fetchAlerts()
        } else {
          throw new Error('Failed to create alert rule')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to create alert rule'
        useNuxtApp().$toast?.error('Failed to create alert rule')
        console.error('Error creating alert rule:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update existing alert rule
     */
    async updateAlertRule(ruleId: string, updates: Partial<InventoryAlertRule>) {
      this.loading = true

      try {
        const response = await $fetch<{
          success: boolean
          data: InventoryAlertRule
          message: string
        }>('/api/v1/inventory/alerts', {
          method: 'PUT',
          body: {
            rule_id: ruleId,
            ...updates
          }
        })

        if (response.success) {
          useNuxtApp().$toast?.success(response.message || 'Alert rule updated successfully')
          
          // Refresh alerts if thresholds were changed
          if (updates.low_stock_threshold || updates.critical_stock_threshold) {
            await this.fetchAlerts()
          }
        } else {
          throw new Error('Failed to update alert rule')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update alert rule'
        useNuxtApp().$toast?.error('Failed to update alert rule')
        console.error('Error updating alert rule:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete alert rule
     */
    async deleteAlertRule(ruleId: string) {
      try {
        const response = await $fetch<{
          success: boolean
          message: string
        }>(`/api/v1/inventory/alerts?rule_id=${ruleId}`, {
          method: 'DELETE'
        })

        if (response.success) {
          useNuxtApp().$toast?.success(response.message || 'Alert rule deleted successfully')
        } else {
          throw new Error('Failed to delete alert rule')
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete alert rule'
        useNuxtApp().$toast?.error('Failed to delete alert rule')
        console.error('Error deleting alert rule:', error)
        throw error
      }
    },

    /**
     * Subscribe to real-time alert updates via Supabase
     */
    subscribeToAlerts() {
      const supabase = useSupabaseClient()
      
      // Subscribe to inventory_alerts table changes
      const subscription = supabase
        .channel('inventory_alerts')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inventory_alerts'
        }, (payload) => {
          console.log('Real-time alert update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // Add new alert to the beginning of the list
            const newAlert = payload.new as InventoryAlert
            this.alerts.unshift(newAlert)
            
            // Update summary counts
            this.summary.total_alerts++
            if (newAlert.severity === 'critical') {
              this.summary.critical_alerts++
            } else if (newAlert.severity === 'low') {
              this.summary.low_stock_alerts++
            } else if (newAlert.severity === 'out_of_stock') {
              this.summary.out_of_stock_alerts++
            }

            // Show toast notification for new alerts
            const message = `${newAlert.severity.toUpperCase()}: ${newAlert.message}`
            if (newAlert.severity === 'critical') {
              useNuxtApp().$toast?.error(message)
            } else {
              useNuxtApp().$toast?.warning(message)
            }
          }
          
          if (payload.eventType === 'DELETE') {
            // Remove alert from list
            const alertId = payload.old.id
            const alertIndex = this.alerts.findIndex(alert => alert.id === alertId)
            
            if (alertIndex !== -1) {
              const removedAlert = this.alerts.splice(alertIndex, 1)[0]
              
              // Update summary counts
              this.summary.total_alerts = Math.max(0, this.summary.total_alerts - 1)
              if (removedAlert.severity === 'critical') {
                this.summary.critical_alerts = Math.max(0, this.summary.critical_alerts - 1)
              } else if (removedAlert.severity === 'low') {
                this.summary.low_stock_alerts = Math.max(0, this.summary.low_stock_alerts - 1)
              } else if (removedAlert.severity === 'out_of_stock') {
                this.summary.out_of_stock_alerts = Math.max(0, this.summary.out_of_stock_alerts - 1)
              }
            }
          }
        })
        .subscribe()

      // Return unsubscribe function
      return () => {
        supabase.removeChannel(subscription)
      }
    },

    /**
     * Clear all alerts and reset state
     */
    clearAlerts() {
      this.alerts = []
      this.summary = {
        total_alerts: 0,
        critical_alerts: 0,
        low_stock_alerts: 0,
        out_of_stock_alerts: 0
      }
      this.error = null
      this.currentPage = 1
      this.hasMore = true
      this.totalCount = 0
    },

    /**
     * Set error state
     */
    setError(error: string) {
      this.error = error
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null
    }
  }
})