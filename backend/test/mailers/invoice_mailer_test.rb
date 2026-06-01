require "test_helper"

class InvoiceMailerTest < ActionMailer::TestCase
  setup do
    @business = businesses(:test_business)
    @user = users(:john)
    @sale = Sale.create!(user: @user, status: :completed, total: 100, paid_amount: 100)
    @invoice = Invoice.create!(
      sale: @sale,
      secuencial: 12,
      ambiente: "1",
      estado: Invoice::ESTADO_AUTORIZADO,
      numero_autorizacion: "1234567890",
      fecha_autorizacion: Time.current,
      importe_total: 100
    )

    Business.stubs(:current).returns(@business)
  end

  test "renders authorized email even when sale has no customer" do
    mail = InvoiceMailer.authorized(@invoice, "john@acme.inc")

    assert_equal ["john@acme.inc"], mail.to
    assert_match /Hola, Cliente/i, mail.html_part.body.to_s
    assert_match /Hola, Cliente/i, mail.text_part.body.to_s
  end
end
