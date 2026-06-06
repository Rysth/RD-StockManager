module Api
  module V1
    class PurchasePaymentsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_PURCHASES) }
      before_action :set_purchase

      # GET /api/v1/purchases/:purchase_id/payments
      def index
        payments = @purchase.purchase_payments.order(created_at: :desc)
        render_success(payments: payments.map { |pp| serialize(pp) })
      end

      # POST /api/v1/purchases/:purchase_id/payments
      def create
        amount = payment_params[:amount].to_d
        if amount > @purchase.balance_due.to_d
          return render_error("El pago no puede exceder el saldo pendiente", :unprocessable_entity)
        end

        pp = @purchase.purchase_payments.new(
          amount: amount,
          payment_method: payment_params[:payment_method].presence || "cash"
        )

        if params[:proof_image].present?
          pp.proof_image.attach(params[:proof_image])
        end

        ActiveRecord::Base.transaction do
          pp.save!
          @purchase.reload
          @purchase.sync_payment_status!
        end

        render_success({ payment: serialize(pp.reload) }, "Pago registrado correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo registrar el pago", :unprocessable_entity, e.record.errors.full_messages)
      end

      private

      def set_purchase
        @purchase = Purchase.find(params[:purchase_id])
      rescue ActiveRecord::RecordNotFound
        render_error("Compra no encontrada", :not_found)
      end

      def payment_params
        params.fetch(:payment, {}).permit(:amount, :payment_method)
      end

      def serialize(pp)
        {
          id: pp.id,
          amount: pp.amount,
          payment_method: pp.payment_method,
          proof_image_url: pp.proof_image.attached? ? url_for(pp.proof_image) : nil,
          created_at: pp.created_at
        }
      end
    end
  end
end
