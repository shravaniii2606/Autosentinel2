"""Google Earth Engine authentication for AutoSentinel.

Headless service-account setup:
1. Open the GCP console for the `ee-autosentinel` project.
2. Go to IAM & Admin > Service Accounts > Create service account.
3. Grant the service account the `Earth Engine Resource Writer` role. The live
   scan creates temporary download/thumbnail resources; `Resource Viewer` is
   enough to initialize, but not enough to download scan rasters. Depending on
   project configuration, GEE may also require `Service Usage Consumer`.
4. Ensure the Earth Engine API is enabled and the Cloud project is registered
   for Earth Engine access. If prompted, register the service account at:
   https://signup.earthengine.google.com/#!/service_accounts
5. Create a JSON key for the service account, download it, and set the whole
   JSON document as the single-line `GEE_SERVICE_ACCOUNT_KEY` env var.

Never commit the downloaded JSON key or paste real key material into
`.env.example`.
"""

import json
import os
import threading

from dotenv import dotenv_values

GEE_PROJECT = "ee-autosentinel"
SERVICE_ACCOUNT_EMAIL_ENV = "GEE_SERVICE_ACCOUNT_EMAIL"
SERVICE_ACCOUNT_KEY_ENV = "GEE_SERVICE_ACCOUNT_KEY"
BACKEND_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
SERVICE_USAGE_CONSUMER_ROLE = "roles/serviceusage.serviceUsageConsumer"
EARTH_ENGINE_VIEWER_ROLE = "roles/earthengine.viewer"
EARTH_ENGINE_WRITER_ROLE = "roles/earthengine.writer"

_env_lock = threading.Lock()
_env_loaded = False
_env_values = {}
_init_lock = threading.Lock()
_initialized = False


def load_backend_env():
    """Load backend/.env once from an explicit path."""
    global _env_loaded, _env_values

    if _env_loaded:
        return BACKEND_ENV_PATH

    with _env_lock:
        if not _env_loaded:
            _env_values = {
                key: value
                for key, value in dotenv_values(BACKEND_ENV_PATH).items()
                if value is not None
            }
            for key, value in _env_values.items():
                os.environ.setdefault(key, value)
            _env_loaded = True

    return BACKEND_ENV_PATH


def _service_account_env_value(name: str) -> str:
    load_backend_env()
    dotenv_value = _env_values.get(name)
    if dotenv_value is not None and dotenv_value.strip():
        return dotenv_value
    return os.getenv(name, "")


def get_configured_service_account_email() -> str:
    return _service_account_env_value(SERVICE_ACCOUNT_EMAIL_ENV).strip()


def _normalize_service_account_key(key_data: str) -> str:
    """Validate service-account JSON and return normalized JSON text."""
    try:
        parsed_key = json.loads(key_data)
    except ValueError as exc:
        raise RuntimeError(
            f"`{SERVICE_ACCOUNT_KEY_ENV}` must be the complete Google service-account "
            "JSON object. The configured value could not be parsed as JSON at the "
            f"Earth Engine auth boundary: {exc}. Paste the key as one single-line "
            "JSON value and keep `private_key` newlines escaped as `\\n`."
        ) from exc

    if not isinstance(parsed_key, dict):
        raise RuntimeError(
            f"`{SERVICE_ACCOUNT_KEY_ENV}` must parse to a JSON object, not "
            f"{type(parsed_key).__name__}."
        )

    missing_fields = [
        field
        for field in ("client_email", "private_key", "token_uri")
        if not parsed_key.get(field)
    ]
    if missing_fields:
        raise RuntimeError(
            f"`{SERVICE_ACCOUNT_KEY_ENV}` is missing required service-account "
            f"field(s): {', '.join(missing_fields)}."
        )

    return json.dumps(parsed_key)


def _is_service_usage_permission_error(exc: Exception) -> bool:
    error_text = str(exc)
    return (
        "USER_PROJECT_DENIED" in error_text
        or "serviceusage.services.use" in error_text
        or SERVICE_USAGE_CONSUMER_ROLE in error_text
    )


def _is_earth_engine_computation_permission_error(exc: Exception) -> bool:
    error_text = str(exc)
    return "earthengine.computations.create" in error_text


def _is_earth_engine_thumbnail_permission_error(exc: Exception) -> bool:
    error_text = str(exc)
    return "earthengine.thumbnails.create" in error_text


def describe_earth_engine_permission_error(
    exc: Exception,
    service_account_email: str | None = None,
) -> str | None:
    principal = (
        f"`{service_account_email}`"
        if service_account_email
        else "the configured service account"
    )

    if _is_service_usage_permission_error(exc):
        return (
            f"The service account {principal} authenticated, but it is not "
            f"allowed to use quota project `{GEE_PROJECT}`. Grant {principal} "
            "the Service Usage Consumer role "
            f"(`{SERVICE_USAGE_CONSUMER_ROLE}`) on Google Cloud project "
            f"`{GEE_PROJECT}`, then retry after IAM propagation. Also confirm "
            "the account has an Earth Engine role and the project/service "
            "account is registered for Earth Engine access."
        )

    if _is_earth_engine_computation_permission_error(exc):
        return (
            f"The service account {principal} authenticated, but Earth Engine "
            "denied the required `earthengine.computations.create` permission "
            f"on `projects/{GEE_PROJECT}`. Grant {principal} an Earth Engine "
            f"project role such as Resource Viewer (`{EARTH_ENGINE_VIEWER_ROLE}`) "
            f"or Resource Writer (`{EARTH_ENGINE_WRITER_ROLE}`). If that role "
            "is already present, confirm the project ID is correct, the Earth "
            "Engine API is enabled, and the project/service account is "
            "registered for Earth Engine access."
        )

    if _is_earth_engine_thumbnail_permission_error(exc):
        return (
            f"The service account {principal} initialized Earth Engine, but "
            "`getDownloadURL()` needs `earthengine.thumbnails.create` on "
            f"`projects/{GEE_PROJECT}`. Resource Viewer can read thumbnails, "
            "but it cannot create the temporary download resource used by this "
            f"scan. Grant {principal} the Earth Engine Resource Writer role "
            f"(`{EARTH_ENGINE_WRITER_ROLE}`) on Google Cloud project "
            f"`{GEE_PROJECT}`, then retry after IAM propagation."
        )

    return None


def init_earth_engine():
    """Initialize Earth Engine once, preferring service-account auth.

    Returns the imported `ee` module so callers can use it if convenient.
    """
    global _initialized

    if _initialized:
        import ee

        return ee

    with _init_lock:
        if _initialized:
            import ee

            return ee

        import ee

        service_account_email = _service_account_env_value(
            SERVICE_ACCOUNT_EMAIL_ENV
        ).strip()
        service_account_key = _service_account_env_value(SERVICE_ACCOUNT_KEY_ENV)
        has_email = bool(service_account_email)
        has_key = bool(service_account_key.strip())

        try:
            if has_email and has_key:
                normalized_key_data = _normalize_service_account_key(
                    service_account_key
                )
                credentials = ee.ServiceAccountCredentials(
                    service_account_email,
                    key_data=normalized_key_data,
                )
                ee.Initialize(credentials, project=GEE_PROJECT)
            elif has_email or has_key:
                missing = (
                    SERVICE_ACCOUNT_KEY_ENV
                    if has_email
                    else SERVICE_ACCOUNT_EMAIL_ENV
                )
                raise RuntimeError(
                    "Earth Engine service-account auth is partially configured. "
                    f"Set `{missing}` too, or remove both "
                    f"`{SERVICE_ACCOUNT_EMAIL_ENV}` and `{SERVICE_ACCOUNT_KEY_ENV}` "
                    "to use local personal OAuth."
                )
            else:
                ee.Initialize(project=GEE_PROJECT)
        except Exception as exc:
            permission_hint = (
                describe_earth_engine_permission_error(exc, service_account_email)
                if has_email and has_key
                else None
            )
            mode = (
                "service-account environment variables"
                if has_email or has_key
                else "local personal OAuth"
            )
            if permission_hint:
                raise RuntimeError(
                    f"Failed to initialize Google Earth Engine for project "
                    f"`{GEE_PROJECT}` using service-account environment variables. "
                    f"{permission_hint} Original error: {exc}"
                ) from exc

            raise RuntimeError(
                f"Failed to initialize Google Earth Engine for project "
                f"`{GEE_PROJECT}` using {mode}. "
                f"For deploys, set `{SERVICE_ACCOUNT_EMAIL_ENV}` to the service "
                f"account email and `{SERVICE_ACCOUNT_KEY_ENV}` to the complete "
                "single-line JSON key. Confirm the account has the Earth Engine "
                "Resource Writer role, the Earth Engine API is enabled, and the "
                "project/service account is registered for Earth Engine access. "
                "For local OAuth fallback, unset both service-account env vars "
                f"and run `earthengine authenticate`. Original error: {exc}"
            ) from exc

        _initialized = True
        return ee
