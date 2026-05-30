require "test_helper"

class BusinessTest < ActiveSupport::TestCase
  def setup
    @business = businesses(:test_business)
  end

  # === VALIDATIONS ===

  test "should be valid with valid attributes" do
    assert @business.valid?, "Business should be valid with proper attributes"
  end

  test "should require name" do
    @business.name = nil
    assert_not @business.valid?, "Business should not be valid without name"
    assert_includes @business.errors[:name], "es requerido"
    
    @business.name = ""
    assert_not @business.valid?, "Business should not be valid with empty name"
    assert_includes @business.errors[:name], "es requerido"
  end

  test "should validate name length" do
    @business.name = "a" * 101  # 101 characters
    assert_not @business.valid?, "Business should not be valid with name longer than 100 characters"
    assert_includes @business.errors[:name], "no puede tener más de 100 caracteres"
    
    @business.name = "a" * 100  # 100 characters
    assert @business.valid?, "Business should be valid with name of 100 characters"
  end

  test "should validate slogan length" do
    @business.slogan = "a" * 201  # 201 characters
    assert_not @business.valid?, "Business should not be valid with slogan longer than 200 characters"
    assert_includes @business.errors[:slogan], "no puede tener más de 200 caracteres"
    
    @business.slogan = "a" * 200  # 200 characters
    assert @business.valid?, "Business should be valid with slogan of 200 characters"
    
    @business.slogan = nil
    assert @business.valid?, "Business should be valid with nil slogan"
  end

  # === SOCIAL MEDIA VALIDATIONS ===

  test "should validate whatsapp format" do
    valid_numbers = ["+1234567890", "+521234567890", "+12345678901234"]
    invalid_numbers = ["+0123456789", "abc123", "+123-456-7890"]
    
    valid_numbers.each do |number|
      @business.whatsapp = number
      assert @business.valid?, "#{number} should be a valid WhatsApp number"
    end
    
    invalid_numbers.each do |number|
      @business.whatsapp = number
      assert_not @business.valid?, "#{number} should be an invalid WhatsApp number"
      assert_includes @business.errors[:whatsapp], "debe ser un número de teléfono válido"
    end
    
    # Test empty/nil values are allowed
    @business.whatsapp = ""
    assert @business.valid?, "Empty WhatsApp should be valid (allow_blank: true)"
    
    @business.whatsapp = nil
    assert @business.valid?, "Nil WhatsApp should be valid (allow_blank: true)"
  end

  test "should validate instagram format" do
    valid_usernames = ["username", "user.name", "user_name", "user123", "a"]
    invalid_usernames = ["user name", "user-name", "user@name", "user#name", ""]
    
    valid_usernames.each do |username|
      @business.instagram = username
      assert @business.valid?, "#{username} should be a valid Instagram username"
    end
    
    invalid_usernames.each do |username|
      @business.instagram = username
      if username.empty?
        assert @business.valid?, "Empty Instagram should be valid (allow_blank: true)"
      else
        assert_not @business.valid?, "#{username} should be an invalid Instagram username"
        assert_includes @business.errors[:instagram], "debe ser un nombre de usuario de Instagram válido"
      end
    end
  end

  test "should validate facebook format" do
    valid_usernames = ["username", "user.name", "user123", "a"]
    invalid_usernames = ["user name", "user-name", "user@name", "user_name", ""]
    
    valid_usernames.each do |username|
      @business.facebook = username
      assert @business.valid?, "#{username} should be a valid Facebook username"
    end
    
    invalid_usernames.each do |username|
      @business.facebook = username
      if username.empty?
        assert @business.valid?, "Empty Facebook should be valid (allow_blank: true)"
      else
        assert_not @business.valid?, "#{username} should be an invalid Facebook username"
        assert_includes @business.errors[:facebook], "debe ser un nombre de usuario de Facebook válido"
      end
    end
  end

  test "should validate tiktok format" do
    valid_usernames = ["username", "user.name", "user_name", "user123", "a"]
    invalid_usernames = ["user name", "user-name", "user@name", "user#name", ""]
    
    valid_usernames.each do |username|
      @business.tiktok = username
      assert @business.valid?, "#{username} should be a valid TikTok username"
    end
    
    invalid_usernames.each do |username|
      @business.tiktok = username
      if username.empty?
        assert @business.valid?, "Empty TikTok should be valid (allow_blank: true)"
      else
        assert_not @business.valid?, "#{username} should be an invalid TikTok username"
        assert_includes @business.errors[:tiktok], "debe ser un nombre de usuario de TikTok válido"
      end
    end
  end

  # === LOGO ATTACHMENT ===

  test "should have logo attachment" do
    assert_respond_to @business, :logo
    assert @business.logo.respond_to?(:attached?)
  end

  # Note: Logo validation tests would require actual file attachments
  # which are complex to set up in unit tests. These would be better
  # tested in integration tests with actual file uploads.

  # === SINGLETON PATTERN ===

  test "should implement current singleton pattern" do
    assert_respond_to Business, :current
    
    # Clear all businesses to test creation
    Business.delete_all
    
    current_business = Business.current
    assert current_business.persisted?, "Current should return a persisted business"
    assert_equal "MicroBiz", current_business.name
    assert_equal "Powered by RysthDesign", current_business.slogan
    
    # Should return the same business on subsequent calls
    same_business = Business.current
    assert_equal current_business.id, same_business.id
  end

  test "should return existing business if one exists" do
    # Ensure we have at least one business
    existing_business = @business
    current_business = Business.current
    
    # Should return the first business (not necessarily the fixture one)
    assert current_business.persisted?, "Current should return a persisted business"
    assert_equal Business.first.id, current_business.id
  end

  # === DEFAULT VALUE METHODS ===

  test "should return name or default" do
    @business.name = "Custom Business"
    assert_equal "Custom Business", @business.name_or_default
    
    @business.name = nil
    assert_equal "MenuChat", @business.name_or_default
    
    @business.name = ""
    assert_equal "MenuChat", @business.name_or_default
  end

  test "should return slogan or default" do
    @business.slogan = "Custom Slogan"
    assert_equal "Custom Slogan", @business.slogan_or_default
    
    @business.slogan = nil
    assert_equal "Powered by RysthDesign", @business.slogan_or_default
    
    @business.slogan = ""
    assert_equal "Powered by RysthDesign", @business.slogan_or_default
  end

  # === CALLBACKS ===

  test "should have after_update callback for sync_storage_async" do
    # Verify the callback exists
    callbacks = Business._update_callbacks.map(&:filter)
    assert_includes callbacks, :sync_storage_async, "Business should have sync_storage_async callback"
  end

  # === EDGE CASES ===

  test "should handle nil social media fields" do
    @business.whatsapp = nil
    @business.instagram = nil
    @business.facebook = nil
    @business.tiktok = nil
    
    assert @business.valid?, "Business should be valid with nil social media fields"
  end

  test "should handle empty string social media fields" do
    @business.whatsapp = ""
    @business.instagram = ""
    @business.facebook = ""
    @business.tiktok = ""
    
    assert @business.valid?, "Business should be valid with empty social media fields"
  end

  test "should handle whitespace in name" do
    @business.name = "   "
    assert_not @business.valid?, "Business should not be valid with whitespace-only name"
  end
end