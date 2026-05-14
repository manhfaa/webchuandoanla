from django.contrib import admin

from .models import User, UserSetting


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "current_plan", "is_active", "updated_at")
    search_fields = ("username", "email", "full_name", "phone")


@admin.register(UserSetting)
class UserSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "theme", "language", "email_notifications", "push_notifications")
    search_fields = ("user__username", "user__email")
