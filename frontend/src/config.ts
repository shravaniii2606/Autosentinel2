export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '587625014477-hnlc80el9ee7ctvjmmnfem25us88gvv2.apps.googleusercontent.com'
).trim()

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/$/, '')
