# Configuración de la facturación electrónica SRI Ecuador (gema SriFacturacion).
#
# IMPORTANTE: el RUC del emisor (Business.current.ruc) DEBE coincidir con el RUC para
# el que fue emitido el certificado .p12; de lo contrario el SRI rechaza el comprobante
# (DEVUELTA / NO AUTORIZADO). El certificado se carga de forma perezosa al emitir, por lo
# que su ausencia no rompe el arranque de la app.
#
# La configuración del emisor, ambiente, certificado .p12/.pfx y clave se administra
# desde Business. Estos valores globales son solo defaults técnicos para timeouts/reintentos.
SriFacturacion.configure do |c|
  c.ambiente      = "1"
  c.cert_path     = nil
  c.cert_password = nil
  c.max_retries   = 3
  c.retry_delay   = 2
  c.open_timeout  = 15
  c.read_timeout  = 90
  if c.respond_to?(:ride_verification_url=)
    c.ride_verification_url = ENV["SRI_RIDE_VERIFICATION_URL"].presence ||
                              "#{ENV.fetch("API_PUBLIC_URL", "http://localhost:3000")}/api/v1/public/invoices/verify"
  end
end
