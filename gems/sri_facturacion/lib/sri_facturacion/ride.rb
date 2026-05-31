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
        pdf.font_size 10

        pdf.text emisor.razon_social, size: 16, style: :bold
        pdf.text emisor.nombre_comercial.to_s if emisor.nombre_comercial
        pdf.text "RUC: #{emisor.ruc}"
        pdf.text emisor.dir_matriz.to_s
        pdf.move_down 8

        pdf.text "FACTURA", size: 13, style: :bold
        pdf.text "No. #{emisor.establecimiento}-#{emisor.punto_emision}-#{f.secuencial}"
        pdf.text "Ambiente: #{@ambiente == '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}"
        pdf.text "Fecha de emisión: #{format_fecha(f.fecha_emision)}"
        pdf.text "Autorización: #{@numero_autorizacion || @clave_acceso}"
        pdf.text "Clave de acceso:", style: :bold
        pdf.text @clave_acceso, size: 8

        pdf.move_down 6
        pdf.image qr_png_io(@clave_acceso), width: 110, position: :right
        pdf.move_up 90

        pdf.text "Cliente: #{comprador.razon_social}", style: :bold
        pdf.text "Identificación: #{comprador.identificacion}"
        pdf.text "Dirección: #{comprador.direccion}" if comprador.direccion
        pdf.move_down 12

        rows = [["Cód.", "Descripción", "Cant.", "P. Unit.", "Desc.", "Total"]]
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
        pdf.table(rows, header: true, width: pdf.bounds.width,
                        cell_style: { size: 8, padding: 4 },
                        column_widths: [50, 220, 50, 60, 50, 53]) do
          row(0).font_style = :bold
          row(0).background_color = "EEEEEE"
        end

        pdf.move_down 12
        pdf.text "Subtotal sin impuestos: $#{fmt(totales.total_sin_impuestos)}", align: :right
        pdf.text "Descuento: $#{fmt(totales.total_descuento)}", align: :right
        totales.total_con_impuestos.each do |imp|
          pdf.text "IVA #{fmt(imp.tarifa)}%: $#{fmt(imp.valor)}", align: :right
        end
        pdf.text "VALOR TOTAL: $#{fmt(totales.importe_total)}", align: :right, style: :bold, size: 12
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
