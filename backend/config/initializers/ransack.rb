Ransack.configure do |c|
  # Default is :q, but you can change it if needed
  # c.search_key = :q
  
  # Enable custom predicates
  c.custom_arrows = {
    up_arrow: '↑',
    down_arrow: '↓'
  }
  
  # Add default search predicates
  c.add_predicate 'cont_any',
    arel_predicate: 'matches_any',
    formatter: proc { |v| v.split(/\s+/).map { |t| "%#{t}%" } },
    validator: proc { |v| v.present? },
    type: :string
end