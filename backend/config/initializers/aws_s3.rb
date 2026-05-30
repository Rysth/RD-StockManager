# Configuración específica para Cloudflare R2 - Solución para checksums
if Rails.env.development? || Rails.env.production?
  begin
    require 'aws-sdk-s3'
    
    # Configuración específica para resolver el problema de checksums con R2
    Aws.config.update({
      s3: {
        signature_version: 'v4',
        force_path_style: true,
        # Configuraciones para resolver conflicto de checksums con R2
        compute_checksums: false,  # Deshabilitar cálculo automático de checksums
        use_accelerate_endpoint: false,
        use_dualstack_endpoint: false
      }
    })
    
    Rails.logger.info "AWS SDK S3 configurado para Cloudflare R2 con solución de checksums"
  rescue LoadError => e
    Rails.logger.warn "AWS SDK S3 no disponible: #{e.message}"
  end
end