# Configuración de la facturación electrónica SRI Ecuador (gema SriFacturacion).
#
# IMPORTANTE: el RUC del emisor (Business.current.ruc) DEBE coincidir con el RUC para
# el que fue emitido el certificado .p12; de lo contrario el SRI rechaza el comprobante
# (DEVUELTA / NO AUTORIZADO). El certificado se carga de forma perezosa al emitir, por lo
# que su ausencia no rompe el arranque de la app.
#
# Variables de entorno (ver .env.example):
#   SRI_AMBIENTE        "1" pruebas (default) / "2" producción
#   SRI_CERT_PATH       ruta absoluta al .p12 DENTRO del contenedor
#   SRI_CERT_PASSWORD   clave del .p12
#   SRI_MAX_RETRIES     reintentos de autorización (default 3)
#   SRI_RETRY_DELAY     segundos entre reintentos (default 2)
SriFacturacion.configure do |c|
  c.ambiente      = ENV.fetch("SRI_AMBIENTE", "1")
  c.cert_path     = ENV["SRI_CERT_PATH"]
  c.cert_password = ENV["SRI_CERT_PASSWORD"]
  c.max_retries   = Integer(ENV.fetch("SRI_MAX_RETRIES", "3"))
  c.retry_delay   = Integer(ENV.fetch("SRI_RETRY_DELAY", "2"))
end
