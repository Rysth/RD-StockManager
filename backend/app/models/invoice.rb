class Invoice < ApplicationRecord
  audited

  belongs_to :sale

  # Estados que devuelve el SRI (vía la gema SriFacturacion) + ERROR local cuando
  # nunca se llegó a contactar al SRI.
  ESTADO_RECIBIDA      = "RECIBIDA".freeze
  ESTADO_AUTORIZADO    = "AUTORIZADO".freeze
  ESTADO_NO_AUTORIZADO = "NO AUTORIZADO".freeze
  ESTADO_DEVUELTA      = "DEVUELTA".freeze
  ESTADO_EN_PROCESO    = "EN PROCESO".freeze
  ESTADO_ERROR         = "ERROR".freeze

  ESTADOS = [ESTADO_RECIBIDA, ESTADO_AUTORIZADO, ESTADO_NO_AUTORIZADO,
             ESTADO_DEVUELTA, ESTADO_EN_PROCESO, ESTADO_ERROR].freeze

  # Estados que permiten reintentar la emisión (con un secuencial nuevo).
  RETRYABLE = [ESTADO_NO_AUTORIZADO, ESTADO_DEVUELTA, ESTADO_EN_PROCESO, ESTADO_ERROR].freeze

  validates :estado, inclusion: { in: ESTADOS }
  validates :secuencial, presence: true

  scope :authorized, -> { where(estado: ESTADO_AUTORIZADO) }

  def authorized?
    estado == ESTADO_AUTORIZADO
  end

  def retryable?
    RETRYABLE.include?(estado)
  end

  # "001-001-000000001"
  def numero_comprobante
    [establecimiento, punto_emision, secuencial.to_s.rjust(9, "0")].join("-")
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id sale_id clave_acceso estado secuencial ambiente numero_autorizacion fecha_autorizacion created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[sale]
  end
end
