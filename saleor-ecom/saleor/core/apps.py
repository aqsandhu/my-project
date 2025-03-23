from collections.abc import Callable

from django.apps import AppConfig
from django.conf import settings
from django.db.models import CharField, TextField
from django.utils.module_loading import import_string

from .db.filters import PostgresILike


class CoreAppConfig(AppConfig):
    name = "saleor.core"

    def ready(self) -> None:
        CharField.register_lookup(PostgresILike)
        TextField.register_lookup(PostgresILike)
        
        # Initialize Sentry if configured
        self.initialize_sentry()
        self.validate_jwt_manager()

    def initialize_sentry(self) -> None:
        """Initialize Sentry if it's properly configured."""
        if not hasattr(settings, 'SENTRY_DSN') or not settings.SENTRY_DSN:
            return
            
        if not hasattr(settings, 'SENTRY_INIT'):
            import warnings
            warnings.warn(
                "SENTRY_INIT function not found in settings. "
                "Error tracking is disabled.",
                ImportWarning,
            )
            return
            
        try:
            settings.SENTRY_INIT(settings.SENTRY_DSN, settings.SENTRY_OPTS)
        except Exception as e:
            import warnings
            warnings.warn(
                f"Error initializing Sentry: {e}. Error tracking is disabled.",
                ImportWarning,
            )

    def validate_jwt_manager(self) -> None:
        jwt_manager_path = getattr(settings, "JWT_MANAGER_PATH", None)
        if not jwt_manager_path:
            raise ImportError(
                "Missing setting value for JWT Manager path - JWT_MANAGER_PATH"
            )
        try:
            jwt_manager = import_string(jwt_manager_path)
        except ImportError as e:
            raise ImportError(f"Failed to import JWT manager: {e}.") from e

        validate_method: Callable[[], None] | None = getattr(
            jwt_manager, "validate_configuration", None
        )
        if validate_method is None:
            return
        validate_method()
