output "service_url" {
  description = "Public URL of the deployed demo"
  value       = google_cloud_run_v2_service.app.uri
}
