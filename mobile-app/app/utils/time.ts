// Time utility functions for consistent time formatting across the app

/**
 * Formats a date/time value to Manila timezone format
 * This assumes the backend has already converted the timestamp to Manila timezone
 * @param value - Date string or Date object
 * @returns Formatted string like "Jan 15, 2024, 2:30 PM"
 */
export const formatManilaTime = (value: any): string => {
  if (!value) return ''

  try {
    // Parse the timestamp as-is (backend should handle timezone conversion)
    const dateObj = new Date(value)
    if (Number.isNaN(dateObj.getTime())) return String(value)

    // Manual formatting for consistent display
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = months[dateObj.getMonth()]
    const day = String(dateObj.getDate()).padStart(2, '0')
    const year = dateObj.getFullYear()

    let hours = dateObj.getHours()
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // 0 should be 12

    return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`
  } catch {
    return String(value)
  }
}

/**
 * Formats a date/time value for schedules
 * @param value - Date string or Date object
 * @returns Formatted string
 */
export const formatScheduleTime = (value: any): string => {
  return formatManilaTime(value)
}

/**
 * Formats a date/time value for general date time display
 * @param value - Date string or Date object
 * @returns Formatted string
 */
export const formatDateTime = (value: any): string => {
  return formatManilaTime(value)
}
