variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "autoapply-demo"
}

variable "repo_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "autoapply-demo"
}

variable "image_name" {
  description = "Container image name"
  type        = string
  default     = "autoapply-demo"
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}
