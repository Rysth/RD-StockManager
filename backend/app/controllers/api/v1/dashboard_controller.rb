module Api
  module V1
    class DashboardController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_DASHBOARD) }

      # GET /api/v1/dashboard/stats
      def stats
        cache_key = "dashboard:stats:#{current_rodauth_user&.id}"

        data = Rails.cache.fetch(cache_key, expires_in: 2.minutes) do
          build_dashboard_stats
        end

        render_success(data)
      end

      private

      def build_dashboard_stats
        now = Time.current

        # ── User counts ─────────────────────────────────────────
        total_users      = User.count
        verified_users   = User.joins(:account).where(accounts: { status: 2 }).count
        unverified_users = User.joins(:account).where(accounts: { status: 1 }).count

        # ── Growth ───────────────────────────────────────────────
        users_this_month    = User.where(created_at: now.beginning_of_month..now).count
        users_last_month    = User.where(created_at: now.last_month.beginning_of_month..now.last_month.end_of_month).count
        users_this_week     = User.where(created_at: now.beginning_of_week..now).count
        users_today         = User.where(created_at: now.beginning_of_day..now).count

        growth_percentage = if users_last_month > 0
                              ((users_this_month - users_last_month).to_f / users_last_month * 100).round(1)
                            else
                              users_this_month > 0 ? 100.0 : 0.0
                            end

        # ── Role distribution ────────────────────────────────────
        role_counts = User.joins(:roles).group("roles.name").count
        roles_distribution = Role.pluck(:name).map do |name|
          { name: role_label(name), key: name, count: role_counts[name] || 0 }
        end

        # ── Account status distribution ──────────────────────────
        status_map = { 1 => "unverified", 2 => "verified", 3 => "closed" }
        status_counts = Account.group(:status).count
        account_statuses = status_map.map do |code, label|
          { status: label, label: status_label(label), count: status_counts[code] || 0 }
        end

        # ── Registration trend (last 6 months) ──────────────────
        registration_trend = (0..5).map do |i|
          month_start = (now - i.months).beginning_of_month
          month_end   = (now - i.months).end_of_month
          {
            date: I18n.l(month_start, format: "%b %Y", locale: :es, default: month_start.strftime("%b %Y")),
            month: month_start.strftime("%Y-%m"),
            total: User.where(created_at: month_start..month_end).count,
            verified: User.joins(:account).where(accounts: { status: 2 }, created_at: month_start..month_end).count
          }
        end.reverse

        # ── Recent users ─────────────────────────────────────────
        recent_users = User.includes(:account, :roles)
                           .order(created_at: :desc)
                           .limit(5)
                           .map do |u|
          {
            id: u.id,
            fullname: u.fullname,
            username: u.username,
            email: u.account.email,
            roles: u.roles.pluck(:name),
            verified: u.account.status == "verified",
            created_at: u.created_at.iso8601
          }
        end

        # ── Permissions / Roles summary ──────────────────────────
        total_roles       = Role.count
        total_permissions = Permission.count

        {
          stats: {
            total_users: total_users,
            verified_users: verified_users,
            unverified_users: unverified_users,
            users_today: users_today,
            users_this_week: users_this_week,
            users_this_month: users_this_month,
            users_last_month: users_last_month,
            growth_percentage: growth_percentage,
            total_roles: total_roles,
            total_permissions: total_permissions,
            verification_rate: total_users > 0 ? (verified_users.to_f / total_users * 100).round(1) : 0.0
          },
          roles_distribution: roles_distribution,
          account_statuses: account_statuses,
          registration_trend: registration_trend,
          recent_users: recent_users
        }
      end

      def role_label(name)
        case name
        when "admin"    then "Administradores"
        when "manager"  then "Gerentes"
        when "operator" then "Operadores"
        when "user"     then "Usuarios"
        else name.capitalize
        end
      end

      def status_label(status)
        case status
        when "verified"   then "Verificados"
        when "unverified" then "Sin verificar"
        when "closed"     then "Cerrados"
        else status.capitalize
        end
      end
    end
  end
end
