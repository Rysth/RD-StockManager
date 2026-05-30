module Api
  module V1
    module Auth
      class OtpController < ApplicationController

        # POST /api/v1/auth/send-otp
        def send_otp
          # Check if we have a partial login session
          unless session[:otp_required] && session[:partial_login_account_id]
            render json: {
              error: "Sesión inválida. Por favor, inicia sesión nuevamente."
            }, status: :unauthorized
            return
          end

          # Validate the otp_token sent by the frontend
          unless params[:otp_token] == session[:otp_token]
            render json: {
              error: "Token OTP inválido. Por favor, inicia sesión nuevamente."
            }, status: :unauthorized
            return
          end

          account = Account.find_by(id: session[:partial_login_account_id])

          unless account
            render json: {
              error: "Cuenta no encontrada"
            }, status: :not_found
            return
          end

          begin
            # Generate OTP code
            otp_code = OtpCode.generate_for_account(account)

            # Send email asynchronously (or immediately in test)
            if Rails.env.test?
              OtpMailer.send_code(account.email, otp_code.code, otp_code.expires_at).deliver_now
            else
              OtpMailer.send_code(account.email, otp_code.code, otp_code.expires_at).deliver_later
            end

            # Log success (without code value)
            Rails.logger.info("[OTP] Code generated and email queued for account #{account.id}")

            render json: {
              success: true,
              message: "Código enviado al correo electrónico"
            }, status: :ok
          rescue => e
            Rails.logger.error("[OTP] Failed to send OTP: #{e.message}")
            Rails.logger.error(e.backtrace.join("\n"))

            # Return success to avoid revealing account existence
            render json: {
              success: true,
              message: "Si la cuenta existe, recibirás un código"
            }, status: :ok
          end
        end

        # POST /api/v1/auth/verify-otp
        def verify_otp
          # Check if we have a partial login session
          unless session[:otp_required] && session[:partial_login_account_id]
            render json: {
              success: false,
              error: "Sesión inválida. Por favor, inicia sesión nuevamente."
            }, status: :unauthorized
            return
          end

          # Validate the otp_token sent by the frontend
          unless params[:otp_token] == session[:otp_token]
            render json: {
              success: false,
              error: "Token OTP inválido. Por favor, inicia sesión nuevamente."
            }, status: :unauthorized
            return
          end

          account = Account.find_by(id: session[:partial_login_account_id])

          unless account
            render json: {
              success: false,
              error: "Código inválido o expirado"
            }, status: :unprocessable_entity
            return
          end

          otp_code = account.otp_codes.active.find_by(code: params[:code])

          if otp_code && otp_code.valid_code?
            # Mark code as used
            otp_code.mark_as_used!

            # Complete the authentication by setting the session properly
            # This is what Rodauth does internally after successful login
            session[:account_id] = account.id

            # Clear OTP session flags
            session.delete(:otp_required)
            session.delete(:otp_email)
            session.delete(:partial_login_account_id)
            session.delete(:otp_token)

            Rails.logger.info("[OTP] Successful verification for account #{account.id}")

            render json: {
              success: true
            }, status: :ok
          else
            Rails.logger.warn("[OTP] Failed verification attempt for account #{account.id}")

            render json: {
              success: false,
              error: "Código inválido o expirado"
            }, status: :unprocessable_entity
          end
        end
      end
    end
  end
end
