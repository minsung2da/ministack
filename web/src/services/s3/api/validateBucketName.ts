/**
 * Synchronous client-side bucket-name validator.
 *
 * Returns `null` when `name` is a valid S3 bucket name, or the exact
 * user-facing error message (per Phase 3 UI-SPEC "Create Bucket Modal Copy")
 * when a rule is violated. Rules are checked in a fixed order and the first
 * violation is returned.
 *
 * Authoritative validation lives in the server (`_validate_bucket_name`); this
 * helper exists to give immediate feedback in the Create Bucket modal.
 */
export function validateBucketName(name: string): string | null {
  if (name.length < 3) {
    return 'Bucket name must be at least 3 characters.'
  }
  if (name.length > 63) {
    return 'Bucket name must be 63 characters or fewer.'
  }
  if (/[A-Z]/.test(name)) {
    return 'Bucket name cannot contain uppercase letters.'
  }
  if (!/^[a-z0-9.-]+$/.test(name)) {
    return 'Bucket name can only contain lowercase letters, numbers, and hyphens.'
  }
  if (name.startsWith('-') || name.endsWith('-')) {
    return 'Bucket name cannot start or end with a hyphen.'
  }
  if (name.includes('..')) {
    return 'Bucket name cannot contain consecutive dots.'
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
    return 'Bucket name cannot be formatted as an IP address.'
  }
  return null
}
