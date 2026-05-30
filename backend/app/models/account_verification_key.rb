class AccountVerificationKey < ApplicationRecord
  self.table_name = 'account_verification_keys'
  self.primary_key = 'id' # same as accounts.id
end