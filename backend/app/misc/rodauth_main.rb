require "sequel/core"

class RodauthMain < Rodauth::Rails::Auth
  configure do
    # List of authentication features that are loaded.
    enable :create_account, :verify_account, :verify_account_grace_period,
      :login, :logout, :remember, :json,
      :reset_password, :change_password, :change_login, :verify_login_change,
      :close_account

    # See the Rodauth documentation for the list of available config options:
    # http://rodauth.jeremyevans.net/documentation.html

    # ==> General
    # Initialize Sequel and have it reuse Active Record's database connection.
    db Sequel.postgres(extensions: :activerecord_connection, keep_reference: false)
    # Avoid DB query that checks accounts table schema at boot time.
    convert_token_id_to_integer? { Account.columns_hash["id"].type == :integer }

    # Change prefix of table and foreign key column names from default "account"
    # accounts_table :users
    # verify_account_table :user_verification_keys
    # verify_login_change_table :user_login_change_keys
    # reset_password_table :user_password_reset_keys
    # remember_table :user_remember_keys

    # The secret key used for hashing public-facing tokens for various features.
    # Defaults to Rails `secret_key_base`, but you can use your own secret key.
    # hmac_secret "ad4b5d1380f8022bff27b93baa3d86ad223aac90018329bdd2776acc585aaf91f5f9980cee525ed04f3c9227264dece43697601f53d3658c06b5dc03b68d44c9"

    # Accept only JSON requests.
    only_json? true

    # Handle login and password confirmation fields on the client side.
    require_password_confirmation? false
    # require_login_confirmation? false

    # Use path prefix for all routes.
    prefix "/api/v1/auth"

    # Customize route paths to match frontend expectations
    create_account_route "register"
    reset_password_request_route "request-password-reset"

    # Specify the controller used for view rendering, CSRF, and callbacks.
    rails_controller { RodauthController }

    # Store account status in an integer column without foreign key constraint.
    account_status_column :status

    # Store password hash in a column instead of a separate table.
    account_password_hash_column :password_hash

    # Set password when creating account instead of when verifying.
    verify_account_set_password? false

    # Change some default param keys.
    login_param "email"
    login_confirm_param "email-confirm"
    # password_confirm_param "confirm_password"

    # Redirect back to originally requested location after authentication.
    # login_return_to_requested_location? true
    # two_factor_auth_return_to_requested_location? true # if using MFA

    # Autologin the user after they have reset their password.
    # reset_password_autologin? true

    # Delete the account record when the user has closed their account.
    # delete_account_on_close? true

    # Redirect to the app from login and registration pages if already logged in.
    # already_logged_in { redirect login_redirect }

    # ==> Emails
    send_email do |email|
      # queue email delivery on the mailer after the transaction commits
      db.after_commit { email.deliver_later }
    end

    # ==> Flash
    # Override default flash messages.
    # create_account_notice_flash "Your account has been created. Please verify your account by visiting the confirmation link sent to your email address."
    # require_login_error_flash "Login is required for accessing this page"
    # login_notice_flash nil

    # ==> Validation & Error Messages (Spanish)
    no_matching_login_message "No existe una cuenta con este correo electrónico"
    already_an_account_with_this_login_message "Ya existe una cuenta con este correo electrónico"
    invalid_password_message "Contraseña incorrecta"
    unverified_account_message "Tu cuenta no está verificada. Por favor, verifica tu correo electrónico antes de iniciar sesión"
    
    # Password validation messages
    password_too_short_message { "La contraseña debe tener al menos #{password_minimum_length} caracteres" }
    login_does_not_meet_requirements_message "Formato de correo electrónico inválido"
    
    # Account creation specific errors
    passwords_do_not_match_message "Las contraseñas no coinciden"
    
    # Custom field validation errors (handled in hooks)
    before_create_account do
      # Validate fullname
      if param_or_nil("fullname").to_s.strip.empty?
        throw_error_status(422, "fullname", "El nombre completo es requerido")
      end
      
      # Validate username
      if param_or_nil("username").to_s.strip.empty?
        throw_error_status(422, "username", "El nombre de usuario es requerido")
      end
      
      # Check if username is unique
      if User.exists?(username: param("username"))
        throw_error_status(422, "username", "Este nombre de usuario ya está en uso")
      end
      
      # Validate username format
      unless param("username").match?(/\A[a-zA-Z0-9_]+\z/)
        throw_error_status(422, "username", "Solo se permiten letras, números y guiones bajos")
      end
    end

    # Create user profile after account creation
    after_create_account do
      user = User.create!(
        account_id: account_id,
        fullname: param("fullname"),
        username: param("username")
      )
      
      # Assign default 'user' role
      user_role = Role.find_by(name: 'user')
      user.add_role(:user) if user_role
    end

    # ==> OTP (2FA por correo) — SOLO para administradores
    # Tras un login válido, si la cuenta pertenece a un admin convertimos el login en
    # "parcial": generamos y enviamos un código OTP por correo y exigimos verificarlo
    # (POST /api/v1/auth/verify-otp) antes de completar la sesión. Los demás roles
    # (business_owner, business_employee, user) inician sesión normalmente.
    after_login do
      account_record = Account.find(account_id)
      user_record = User.find_by(account_id: account_id)

      if user_record&.has_role?(:admin)
        # Generar y enviar el código OTP
        otp_code = OtpCode.generate_for_account(account_record)
        if Rails.env.test?
          OtpMailer.send_code(account_record.email, otp_code.code, otp_code.expires_at).deliver_now
        else
          OtpMailer.send_code(account_record.email, otp_code.code, otp_code.expires_at).deliver_later
        end

        # Token que el frontend reenviará para identificar esta sesión OTP
        otp_token = SecureRandom.hex(32)

        # Marcar el login como parcial y limpiar la sesión autenticada de Rodauth
        session[:otp_required] = true
        session[:otp_email] = account[:email]
        session[:partial_login_account_id] = account_id

        clear_session

        # Restaurar los datos de la sesión OTP tras el clear
        session[:otp_required] = true
        session[:otp_email] = account[:email]
        session[:partial_login_account_id] = account_id
        session[:otp_token] = otp_token

        # Responder "OTP requerido" y detener el flujo normal de login
        response.status = 200
        response['Content-Type'] = 'application/json'
        response.write(JSON.generate({
          otp_required: true,
          otp_token: otp_token,
          email: account[:email],
          message: "Código OTP enviado a tu correo electrónico"
        }))
        request.halt
      end
    end

    # ==> Param translation (frontend sends 'token', Rodauth expects 'key')
    before_verify_account_route do
      request.params['key'] ||= request.params['token']
    end

    before_reset_password_route do
      request.params['key'] ||= request.params['token']
    end

    # ==> Deadlines
    # Change default deadlines for some actions.
    # verify_account_grace_period 3.days.to_i
    # reset_password_deadline_interval Hash[hours: 6]
    # verify_login_change_deadline_interval Hash[days: 2]
    remember_deadline_interval Hash[days: 14]

    # Fix email link generation to use proper token format
    verify_account_email_link do
       token = token_param_value(verify_account_key)
       puts "DEBUG TOKEN: #{token}"
      "#{FrontendUrls.admin_url}/identity/email_verification?token=#{account_id}_#{token}"
    end

    reset_password_email_link do
      token = token_param_value(reset_password_key)
      puts "DEBUG RESET TOKEN: #{token}"
      "#{FrontendUrls.admin_url}/identity/reset_password?token=#{account_id}_#{token}"
    end
    
    # ==> Email Configuration
    create_verify_account_email do
      RodauthMailer.verify_account(
        account[:email], 
        "Verifica tu cuenta en R&R Template",
        "#{token_param_value(verify_account_key_value)}"# Remove account_id parameter
      )
    end

    create_reset_password_email do
      RodauthMailer.reset_password(
        account[:email],
        "Restablece tu contraseña en R&R Template", 
        "#{token_param_value(reset_password_key_value)}"
      )
    end

    # Email subjects in Spanish
    verify_account_email_subject "Verifica tu cuenta en R&R Template"
    reset_password_email_subject "Restablece tu contraseña en R&R Template"

  end
end
