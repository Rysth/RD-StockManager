# frozen_string_literal: true

require "prawn"
require "prawn/table"
require "rqrcode"

module SriFacturacion
  # Genera el RIDE (Representación Impresa del Documento Electrónico) en PDF.
  # PDF en Ruby puro con Prawn; QR con la clave de acceso vía rqrcode.
  class Ride
    def initialize(factura, clave_acceso:, numero_autorizacion: nil, fecha_autorizacion: nil, ambiente: "1")
      @factura = factura
      @clave_acceso = clave_acceso
      @numero_autorizacion = numero_autorizacion
      @fecha_autorizacion = fecha_autorizacion
      @ambiente = ambiente.to_s
    end

    # Devuelve el PDF como string binario.
    def render
      f = @factura
      emisor = f.emisor
      comprador = f.comprador
      totales = f.totales

      Prawn::Document.new(page_size: "A4", margin: 36) do |pdf|
        Prawn::Fonts::AFM.hide_m17n_warning = true if defined?(Prawn::Fonts::AFM)
        navy = "0F2742"
        blue = "2563EB"
        gray = "64748B"
        light = "F1F5F9"
        border = "CBD5E1"

        pdf.fill_color navy
        pdf.text emisor.razon_social.to_s.upcase, size: 17, style: :bold
        pdf.fill_color gray
        pdf.text emisor.nombre_comercial.to_s, size: 10 if emisor.nombre_comercial
        pdf.text "RUC: #{emisor.ruc}", size: 9
        pdf.text emisor.dir_matriz.to_s, size: 9
        pdf.fill_color "000000"

        top = pdf.cursor + 42
        pdf.bounding_box([330, top], width: 195, height: 118) do
          pdf.stroke_color border
          pdf.fill_color light
          pdf.fill_rounded_rectangle [0, 118], 195, 118, 8
          pdf.stroke_rounded_rectangle [0, 118], 195, 118, 8
          pdf.fill_color navy
          pdf.text_box "FACTURA", at: [12, 102], size: 16, style: :bold
          pdf.fill_color "000000"
          pdf.text_box "No. #{emisor.establecimiento}-#{emisor.punto_emision}-#{f.secuencial}", at: [12, 80], size: 10, style: :bold
          pdf.text_box "Ambiente: #{@ambiente == '2' ? 'PRODUCCION' : 'PRUEBAS'}", at: [12, 62], size: 9
          pdf.text_box "Emision: #{format_fecha(f.fecha_emision)}", at: [12, 47], size: 9
          pdf.fill_color blue
          pdf.text_box "DOCUMENTO AUTORIZADO", at: [12, 27], size: 8, style: :bold
        end

        pdf.move_down 18
        pdf.stroke_color border
        pdf.stroke_horizontal_rule
        pdf.move_down 14

        pdf.bounding_box([0, pdf.cursor], width: 340, height: 94) do
          pdf.fill_color navy
          pdf.text "Cliente", size: 9, style: :bold
          pdf.fill_color "000000"
          pdf.move_down 4
          pdf.text comprador.razon_social.to_s, size: 12, style: :bold
          pdf.text "Identificacion: #{comprador.identificacion}", size: 9
          pdf.text "Direccion: #{comprador.direccion}", size: 9 if comprador.direccion
          pdf.move_down 8
          pdf.fill_color gray
          pdf.text "Autorizacion", size: 8, style: :bold
          pdf.fill_color "000000"
          pdf.text (@numero_autorizacion || @clave_acceso).to_s, size: 7.5
          pdf.fill_color gray
          pdf.text "Clave de acceso", size: 8, style: :bold
          pdf.fill_color "000000"
          pdf.text @clave_acceso.to_s, size: 7.5
        end

        pdf.bounding_box([410, pdf.cursor + 94], width: 115, height: 115) do
          pdf.stroke_color border
          pdf.stroke_rounded_rectangle [0, 115], 115, 115, 8
          pdf.image qr_png_io(@clave_acceso), width: 95, at: [10, 105]
        end

        pdf.move_down 24

        rows = [["Codigo", "Descripcion", "Cant.", "P. Unit.", "Desc.", "Total"]]
        f.detalles.each do |d|
          rows << [
            d.codigo_principal.to_s,
            d.descripcion.to_s,
            fmt(d.cantidad),
            fmt(d.precio_unitario),
            fmt(d.descuento),
            fmt(d.precio_total_sin_impuesto)
          ]
        end
        table_width = pdf.bounds.width
        pdf.table(rows, header: true, width: table_width,
                        cell_style: { size: 8, padding: 6, border_color: border },
                        column_widths: [50, table_width - 263, 50, 60, 50, 53]) do
          row(0).font_style = :bold
          row(0).background_color = navy
          row(0).text_color = "FFFFFF"
          columns(2..5).align = :right
        end

        pdf.move_down 16
        totals_rows = [
          ["Subtotal sin impuestos", "$#{fmt(totales.total_sin_impuestos)}"],
          ["Descuento", "$#{fmt(totales.total_descuento)}"]
        ]
        totales.total_con_impuestos.each do |imp|
          totals_rows << ["IVA #{fmt(imp.tarifa)}%", "$#{fmt(imp.valor)}"]
        end
        totals_rows << ["VALOR TOTAL", "$#{fmt(totales.importe_total)}"]

        pdf.bounding_box([315, pdf.cursor], width: 210) do
          pdf.table(totals_rows, width: 210, cell_style: { size: 9, padding: 6, border_color: border },
                                column_widths: [130, 80]) do
            columns(1).align = :right
            row(-1).font_style = :bold
            row(-1).background_color = light
          end
        end

        pdf.repeat(:all) do
          pdf.bounding_box([0, 28], width: pdf.bounds.width, height: 20) do
            pdf.stroke_color border
            pdf.stroke_horizontal_rule
            pdf.move_down 6
            pdf.fill_color gray
            pdf.text "RIDE generado por StockManager by RysthDesign", size: 8, align: :center
          end
        end
      end.render
    end

    private

    def qr_png_io(content)
      qr = RQRCode::QRCode.new(content)
      png = qr.as_png(size: 220, border_modules: 2)
      StringIO.new(png.to_s)
    end

    def fmt(value)
      format("%.2f", value.to_f)
    end

    def format_fecha(date)
      d = date.respond_to?(:to_date) ? date.to_date : date
      format("%02d/%02d/%04d", d.day, d.month, d.year)
    end
  end
end
