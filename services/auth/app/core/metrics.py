from prometheus_client import Counter

# Count number of successful user logins
user_login_counter = Counter(
    "app_user_logins_total",
    "Total number of successful user logins",
    ["method"]
)

# Count number of successful user registrations
user_registration_counter = Counter(
    "app_user_registrations_total",
    "Total number of successful user registrations",
    ["method"]
)

# Count number of successful refresh token usages
refresh_token_usage_counter = Counter(
    "app_refresh_token_usage_total",
    "Total number of successful refresh token usages",
    ["method"]
)

# Count number of admin actions performed
# Currently only used when accessing the "/admin-only" test endpoint
admin_action_counter = Counter(
    "app_admin_actions_total",
    "Total number of admin actions performed",
    ["action"]
)

# Count number of guest user logins
# Currently unused!
guest_login_counter = Counter(
    "app_guest_logins_total",
    "Total number of guest user logins",
    ["method"]
)
