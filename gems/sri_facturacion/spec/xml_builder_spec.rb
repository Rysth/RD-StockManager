# frozen_string_literal: true

require "nokogiri"

RSpec.describe SriFacturacion::XmlBuilder do
  let(:factura) { build_sample_factura }
  let(:clave) do
    SriFacturacion::AccessKey.generate(
      fecha_emision: factura.fecha_emision, ruc: factura.emisor.ruc,
      establecimiento: "001", punto_emision: "001", secuencial: factura.secuencial
    )
  end
  let(:xml) { described_class.new(factura, clave_acceso: clave, ambiente: "1").build }
  let(:doc) { Nokogiri::XML(xml) }

  it "genera una factura 1.1.0 con id=comprobante" do
    expect(doc.root.name).to eq("factura")
    expect(doc.root["version"]).to eq("1.1.0")
    expect(doc.root["id"]).to eq("comprobante")
  end

  it "incluye la infoTributaria con RUC, ambiente y clave de acceso" do
    expect(doc.at_xpath("//infoTributaria/ruc").text).to eq("0924383631001")
    expect(doc.at_xpath("//infoTributaria/ambiente").text).to eq("1")
    expect(doc.at_xpath("//infoTributaria/codDoc").text).to eq("01")
    expect(doc.at_xpath("//infoTributaria/claveAcceso").text).to eq(clave)
  end

  it "formatea la fecha de emisión dd/mm/aaaa" do
    expect(doc.at_xpath("//infoFactura/fechaEmision").text).to eq("31/05/2026")
  end

  it "calcula los totales de la factura" do
    # 2*20 + (55-5) = 40 + 50 = 90 sin impuestos; IVA 15% de 90 = 13.5; total 103.5
    expect(doc.at_xpath("//infoFactura/totalSinImpuestos").text).to eq("90.00")
    expect(doc.at_xpath("//infoFactura/importeTotal").text).to eq("103.50")
  end

  it "incluye un detalle por línea con su impuesto" do
    detalles = doc.xpath("//detalles/detalle")
    expect(detalles.length).to eq(2)
    expect(detalles.first.at_xpath("descripcion").text).to eq("Gorra 9FORTY")
    expect(detalles.first.at_xpath("cantidad").text).to eq("2.000000")
    expect(detalles.first.at_xpath("impuestos/impuesto/codigoPorcentaje").text).to eq("4")
  end
end
