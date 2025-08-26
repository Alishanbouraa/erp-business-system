import { createClient } from '@supabase/supabase-js'
import Joi from 'joi'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation schema for alert configuration
const alertConfigSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  low_stock_threshold: Joi.number().min(0).required(),
  critical_stock_threshold: Joi.number().min(0).required(),
  enabled: Joi.boolean().default(true),
  notification_channels: Joi.array().items(
    Joi.string().valid('email', 'sms', 'in_app')
  ).default(['in_app'])
})

export default defineEventHandler(async (event) => {
  try {
    const method = getMethod(event)
    
    if (method === 'GET') {
      return await getInventoryAlerts(event)
    } else if (method === 'POST') {
      return await createAlertRule(event)
    } else if (method === 'PUT') {
      return await updateAlertRule(event)
    } else if (method === 'DELETE') {
      return await deleteAlertRule(event)
    }
    
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  } catch (error) {
    console.error('Inventory alerts API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

/**
 * Get all active inventory alerts
 */
async function getInventoryAlerts(event) {
  const query = getQuery(event)
  const { store_id, severity, limit = 50 } = query

  let queryBuilder = supabase
    .from('inventory_alerts_view')
    .select(`
      *,
      products (
        name,
        sku,
        category_id
      ),
      stores (
        name,
        location
      )
    `)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Filter by store if specified
  if (store_id) {
    queryBuilder = queryBuilder.eq('store_id', store_id)
  }

  // Filter by severity level
  if (severity) {
    queryBuilder = queryBuilder.eq('severity', severity)
  }

  const { data: alerts, error } = await queryBuilder

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to fetch alerts: ${error.message}`
    })
  }

  // Get summary statistics
  const { data: summary } = await supabase
    .from('inventory_alerts_summary')
    .select('*')
    .single()

  return {
    success: true,
    data: alerts,
    summary: summary || {
      total_alerts: alerts?.length || 0,
      critical_alerts: alerts?.filter(a => a.severity === 'critical').length || 0,
      low_stock_alerts: alerts?.filter(a => a.severity === 'low').length || 0,
      out_of_stock_alerts: alerts?.filter(a => a.severity === 'out_of_stock').length || 0
    },
    meta: {
      total_count: alerts?.length || 0,
      limit: parseInt(limit),
      filtered_by: { store_id, severity }
    }
  }
}

/**
 * Create new alert rule for a product
 */
async function createAlertRule(event) {
  const body = await readBody(event)
  
  // Validate input
  const { error: validationError, value } = alertConfigSchema.validate(body)
  if (validationError) {
    throw createError({
      statusCode: 400,
      statusMessage: `Validation error: ${validationError.details[0].message}`
    })
  }

  // Check if product exists
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('id', value.product_id)
    .single()

  if (productError || !product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found'
    })
  }

  // Create alert rule
  const { data: alertRule, error } = await supabase
    .from('inventory_alert_rules')
    .insert([{
      product_id: value.product_id,
      low_stock_threshold: value.low_stock_threshold,
      critical_stock_threshold: value.critical_stock_threshold,
      enabled: value.enabled,
      notification_channels: value.notification_channels,
      created_by: event.context.user?.id // Assuming auth middleware sets this
    }])
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to create alert rule: ${error.message}`
    })
  }

  // Trigger immediate check for this product
  await triggerStockCheck(value.product_id)

  return {
    success: true,
    data: alertRule,
    message: `Alert rule created for product: ${product.name} (${product.sku})`
  }
}

/**
 * Update existing alert rule
 */
async function updateAlertRule(event) {
  const body = await readBody(event)
  const { rule_id, ...updates } = body

  if (!rule_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Alert rule ID is required'
    })
  }

  // Validate updates
  const updateSchema = alertConfigSchema.fork(['product_id'], (schema) => schema.optional())
  const { error: validationError, value } = updateSchema.validate(updates)
  
  if (validationError) {
    throw createError({
      statusCode: 400,
      statusMessage: `Validation error: ${validationError.details[0].message}`
    })
  }

  const { data: alertRule, error } = await supabase
    .from('inventory_alert_rules')
    .update({
      ...value,
      updated_at: new Date().toISOString()
    })
    .eq('id', rule_id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to update alert rule: ${error.message}`
    })
  }

  // Re-check stock levels if thresholds changed
  if (value.low_stock_threshold || value.critical_stock_threshold) {
    await triggerStockCheck(alertRule.product_id)
  }

  return {
    success: true,
    data: alertRule,
    message: 'Alert rule updated successfully'
  }
}

/**
 * Delete alert rule
 */
async function deleteAlertRule(event) {
  const query = getQuery(event)
  const { rule_id } = query

  if (!rule_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Alert rule ID is required'
    })
  }

  const { error } = await supabase
    .from('inventory_alert_rules')
    .delete()
    .eq('id', rule_id)

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to delete alert rule: ${error.message}`
    })
  }

  return {
    success: true,
    message: 'Alert rule deleted successfully'
  }
}

/**
 * Trigger immediate stock level check for a product
 */
async function triggerStockCheck(productId: string) {
  try {
    // Call the stock check function (this would typically be a database function)
    const { data, error } = await supabase.rpc('check_product_stock_levels', {
      p_product_id: productId
    })

    if (error) {
      console.error('Stock check error:', error)
    }

    return data
  } catch (error) {
    console.error('Failed to trigger stock check:', error)
  }
}