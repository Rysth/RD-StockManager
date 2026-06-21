# frozen_string_literal: true

require "sri_facturacion"

# The upstream gem builds XAdES by hand. SRI production is stricter than the
# local self-checks and expects the comprobante reference to declare the same
# canonicalization transform used to compute its digest.
module SriFacturacion
  class Signer
    private

    def signature_template(ids:, ref_uri:, digest_comprobante:, cert_b64:, cert_digest:, signing_time:)
      modulus = base64(certificate.public_key.n.to_s(2))
      exponent = base64(certificate.public_key.e.to_s(2))
      issuer = certificate.issuer.to_s(OpenSSL::X509::Name::RFC2253)
      serial = certificate.serial.to_s

      <<~XML
        <ds:Signature xmlns:ds="#{DS}" xmlns:etsi="#{ETSI}" Id="#{ids[:signature]}">
          <ds:SignedInfo Id="#{ids[:signed_info]}">
            <ds:CanonicalizationMethod Algorithm="#{C14N_ALG}"></ds:CanonicalizationMethod>
            <ds:SignatureMethod Algorithm="#{RSA_SHA1}"></ds:SignatureMethod>
            <ds:Reference Id="#{ids[:signed_props_ref]}" Type="#{SIGNED_PROPS_TYPE}" URI="##{ids[:signed_props]}">
              <ds:DigestMethod Algorithm="#{SHA1_ALG}"></ds:DigestMethod>
              <ds:DigestValue></ds:DigestValue>
            </ds:Reference>
            <ds:Reference URI="##{ids[:certificate]}">
              <ds:DigestMethod Algorithm="#{SHA1_ALG}"></ds:DigestMethod>
              <ds:DigestValue></ds:DigestValue>
            </ds:Reference>
            <ds:Reference Id="#{ids[:reference_id]}" URI="##{ref_uri}">
              <ds:Transforms>
                <ds:Transform Algorithm="#{ENVELOPED}"></ds:Transform>
                <ds:Transform Algorithm="#{C14N_ALG}"></ds:Transform>
              </ds:Transforms>
              <ds:DigestMethod Algorithm="#{SHA1_ALG}"></ds:DigestMethod>
              <ds:DigestValue>#{digest_comprobante}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue Id="#{ids[:signature_value]}"></ds:SignatureValue>
          <ds:KeyInfo Id="#{ids[:certificate]}">
            <ds:X509Data>
              <ds:X509Certificate>#{cert_b64}</ds:X509Certificate>
            </ds:X509Data>
            <ds:KeyValue>
              <ds:RSAKeyValue>
                <ds:Modulus>#{modulus}</ds:Modulus>
                <ds:Exponent>#{exponent}</ds:Exponent>
              </ds:RSAKeyValue>
            </ds:KeyValue>
          </ds:KeyInfo>
          <ds:Object Id="#{ids[:object]}">
            <etsi:QualifyingProperties Target="##{ids[:signature]}">
              <etsi:SignedProperties Id="#{ids[:signed_props]}">
                <etsi:SignedSignatureProperties>
                  <etsi:SigningTime>#{signing_time}</etsi:SigningTime>
                  <etsi:SigningCertificate>
                    <etsi:Cert>
                      <etsi:CertDigest>
                        <ds:DigestMethod Algorithm="#{SHA1_ALG}"></ds:DigestMethod>
                        <ds:DigestValue>#{cert_digest}</ds:DigestValue>
                      </etsi:CertDigest>
                      <etsi:IssuerSerial>
                        <ds:X509IssuerName>#{issuer}</ds:X509IssuerName>
                        <ds:X509SerialNumber>#{serial}</ds:X509SerialNumber>
                      </etsi:IssuerSerial>
                    </etsi:Cert>
                  </etsi:SigningCertificate>
                </etsi:SignedSignatureProperties>
                <etsi:SignedDataObjectProperties>
                  <etsi:DataObjectFormat ObjectReference="##{ids[:reference_id]}">
                    <etsi:Description>contenido comprobante</etsi:Description>
                    <etsi:MimeType>text/xml</etsi:MimeType>
                  </etsi:DataObjectFormat>
                </etsi:SignedDataObjectProperties>
              </etsi:SignedProperties>
            </etsi:QualifyingProperties>
          </ds:Object>
        </ds:Signature>
      XML
    end
  end

  class SoapClient
    private

    def extract_mensajes(doc)
      doc.xpath("//mensaje").filter_map do |m|
        mensaje = {
          identificador: m.at_xpath("identificador")&.text,
          mensaje: m.at_xpath("mensaje")&.text,
          informacion_adicional: m.at_xpath("informacionAdicional")&.text,
          tipo: m.at_xpath("tipo")&.text
        }.compact

        mensaje unless mensaje.empty?
      end
    end
  end
end
