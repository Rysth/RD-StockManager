class DropAccountOtpKeys < ActiveRecord::Migration[8.0]
  def change
    drop_table :account_otp_keys, if_exists: true
  end
end
