class UserExportService
  def self.to_xlsx(users)
    package = Axlsx::Package.new
    workbook = package.workbook

    # Define styles
    header_style = workbook.styles.add_style(
      bg_color: "4472C4",
      fg_color: "FFFFFF",
      b: true,
      alignment: { horizontal: :center, vertical: :center }
    )

    text_style = workbook.styles.add_style(
      alignment: { horizontal: :left, vertical: :center }
    )

    centered_style = workbook.styles.add_style(
      alignment: { horizontal: :center, vertical: :center }
    )

    workbook.add_worksheet(name: "Usuarios") do |sheet|
      # Add header row
      sheet.add_row(
        [
          "#",
          "Nombre Completo",
          "Usuario",
          "Correo Electrónico",
          "Identificación",
          "Teléfono",
          "Roles",
          "Estado de Cuenta",
          "Verificado",
          "Fecha de Creación",
          "Última Actualización"
        ],
        style: header_style
      )

      # Add data rows
      users.each_with_index do |user, index|
        sheet.add_row(
          [
            index + 1,
            user.fullname,
            user.username,
            user.account.email,
            user.identification,
            user.phone_number,
            user.roles.pluck(:name).join(", "),
            user.account.status,
            user.account.status == "verified" ? "Sí" : "No",
            user.created_at.strftime("%d/%m/%Y %H:%M"),
            user.updated_at.strftime("%d/%m/%Y %H:%M")
          ],
          style: [centered_style, text_style, text_style, text_style, text_style, text_style, text_style, centered_style, centered_style, centered_style, centered_style]
        )
      end

      # Set column widths
      sheet.column_widths(8, 25, 18, 30, 15, 15, 20, 18, 12, 20, 20)
    end

    package.to_stream.read
  end
end