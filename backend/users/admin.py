from django.contrib import admin

from .models import RegistrationAttempt, User, UserSetting


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "email_verified_at", "current_plan", "is_active", "updated_at")
    search_fields = ("username", "email", "full_name", "phone")


@admin.register(UserSetting)
class UserSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "theme", "language", "email_notifications", "push_notifications")
    search_fields = ("user__username", "user__email")


@admin.register(RegistrationAttempt)
class RegistrationAttemptAdmin(admin.ModelAdmin):
    list_display = ("created_at", "outcome", "ip_hash", "agent_hash", "email_pattern_hash")
    list_filter = ("outcome", "created_at")
    readonly_fields = ("created_at", "outcome", "ip_hash", "agent_hash", "email_pattern_hash")

    def has_add_permission(self, request):
        return False
