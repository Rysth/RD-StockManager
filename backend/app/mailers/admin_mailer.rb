class AdminMailer < ApplicationMailer
  def new_user_registration(user)
    @user = user
    @admin_email = 'johnpalacios.t@gmail.com'
    
    mail(
      to: @admin_email,
      subject: "Nuevo usuario registrado en la plataforma: #{@user.email}"
    )
  end

end