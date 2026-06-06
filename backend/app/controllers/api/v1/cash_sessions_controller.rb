module Api
  module V1
    # Caja por turno de cajero: apertura, cierre y arqueo. Una caja abierta por
    # usuario+sucursal. Las ventas al contado se asocian a la caja abierta.
    class CashSessionsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_SALES) }
      before_action :set_cash_session, only: [:show, :close]

      # GET /api/v1/cash_sessions/current?location_id=
      def current
        location = resolve_location
        return render_error("Sucursal no encontrada", :not_found) unless location

        session = CashSession.current_for(current_rodauth_user, location)
        render_success(cash_session: session ? serialize(session) : nil)
      end

      # GET /api/v1/cash_sessions/:id
      def show
        render_success(cash_session: serialize(@cash_session, with_sales: true))
      end

      # POST /api/v1/cash_sessions/open
      # Body: { cash_session: { location_id, opening_amount } }
      def open
        location = resolve_location
        return render_error("Sucursal no encontrada", :not_found) unless location

        session = CashSession.new(
          user: current_rodauth_user,
          location: location,
          opening_amount: open_params[:opening_amount].presence || 0,
          status: :open
        )
        session.save!
        render_success({ cash_session: serialize(session) }, "Caja abierta correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo abrir la caja", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/cash_sessions/:id/close
      # Body: { cash_session: { counted_amount, notes } }
      def close
        if @cash_session.session_closed?
          return render_error("La caja ya está cerrada", :unprocessable_entity)
        end

        @cash_session.close!(close_params[:counted_amount].presence || 0, close_params[:notes])
        render_success({ cash_session: serialize(@cash_session, with_sales: true) }, "Caja cerrada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo cerrar la caja", :unprocessable_entity, e.record.errors.full_messages)
      end

      private

      def set_cash_session
        @cash_session = CashSession.includes(:user, :location).find(params[:id])
        # Los empleados restringidos solo pueden ver/cerrar sus propias cajas.
        if current_rodauth_user.restricted_to_location? && @cash_session.user_id != current_rodauth_user.id
          render_error("No tienes acceso a esta caja", :forbidden)
        end
      rescue ActiveRecord::RecordNotFound
        render_error("Caja no encontrada", :not_found)
      end

      # Empleados restringidos quedan atados a su sucursal asignada.
      def resolve_location
        user = current_rodauth_user
        location_id =
          if user.restricted_to_location? && user.location_id.present?
            user.location_id
          else
            (open_params[:location_id].presence || params[:location_id].presence)
          end
        location_id ? Location.find_by(id: location_id) : Location.default
      end

      def open_params
        params.fetch(:cash_session, {}).permit(:location_id, :opening_amount)
      end

      def close_params
        params.fetch(:cash_session, {}).permit(:counted_amount, :notes)
      end

      def serialize(session, with_sales: false)
        data = {
          id: session.id,
          status: session.status,
          location_id: session.location_id,
          location_name: session.location&.name,
          user_id: session.user_id,
          user_name: session.user&.fullname,
          opening_amount: session.opening_amount,
          counted_amount: session.counted_amount,
          # Para cajas abiertas el esperado se calcula en vivo; para cerradas se usa el guardado.
          expected_amount: session.session_open? ? session.expected_cash : session.expected_amount,
          variance: session.variance,
          notes: session.notes,
          sales_count: session.sales.count,
          opened_at: session.opened_at,
          closed_at: session.closed_at,
          created_at: session.created_at
        }

        if with_sales
          data[:sales] = session.sales.order(sold_at: :desc).map do |sale|
            {
              id: sale.id,
              code: sale.code,
              total: sale.total,
              payment_method: sale.payment_method,
              status: sale.status,
              sold_at: sale.sold_at
            }
          end
        end

        data
      end
    end
  end
end
