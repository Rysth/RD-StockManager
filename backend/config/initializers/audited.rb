# The `audited` gem serializes `audited_changes` as YAML. Rails' safe YAML
# loader rejects classes that aren't explicitly permitted, and our audited
# models include BigDecimal (prices/costs) and time/symbol values, so we add
# them to the permitted list.
Rails.application.config.after_initialize do
  ActiveRecord.yaml_column_permitted_classes |= [
    BigDecimal,
    Symbol,
    Date,
    Time,
    ActiveSupport::TimeWithZone,
    ActiveSupport::TimeZone
  ]
end
