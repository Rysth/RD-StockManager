# frozen_string_literal: true

require 'test_helper'

class PublicRoutesTest < ActionDispatch::IntegrationTest
  include AuthenticationHelpers

  def setup
    # The public endpoint returns Business.current which is the first business
    @business = Business.current
  end

  # Test public business endpoint routing
  test "public business show route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/public/business' }, 
                   { controller: 'api/v1/public/businesses', action: 'show' })
  end

  # Test public routes work without authentication
  test "public business endpoint accessible without authentication" do
    get '/api/v1/public/business'
    assert_response :success
    
    response_data = JSON.parse(response.body)
    assert_not_nil response_data['business']
    assert_equal @business.name_or_default, response_data['business']['name']
  end

  test "public business endpoint returns business data" do
    get '/api/v1/public/business'
    assert_response :success
    
    response_data = JSON.parse(response.body)
    business_data = response_data['business']
    
    assert_equal @business.name_or_default, business_data['name']
    assert_equal @business.slogan_or_default, business_data['slogan']
    assert_equal @business.whatsapp, business_data['whatsapp']
    assert_equal @business.instagram, business_data['instagram']
    assert_equal @business.facebook, business_data['facebook']
    assert_equal @business.tiktok, business_data['tiktok']
  end

  test "public business endpoint works with authenticated users too" do
    user = create_authenticated_user
    
    authenticated_request(:get, '/api/v1/public/business', user: user)
    assert_response :success
    
    response_data = JSON.parse(response.body)
    assert_not_nil response_data['business']
    assert_equal @business.name_or_default, response_data['business']['name']
  end

  # Test that public routes don't require specific HTTP headers
  test "public business endpoint works without API headers" do
    get '/api/v1/public/business', headers: {}
    assert_response :success
  end

  test "public business endpoint works with standard headers" do
    get '/api/v1/public/business', headers: { 
      'Content-Type' => 'application/json',
      'Accept' => 'application/json'
    }
    assert_response :success
  end

  # Test public routes are truly public (no authentication checks)
  test "public routes bypass authentication middleware" do
    # Make request without any authentication setup
    get '/api/v1/public/business'
    assert_response :success
    
    response_data = JSON.parse(response.body)
    assert_not_nil response_data['business']
  end

  # Test public routes handle errors gracefully
  test "public business endpoint handles missing business gracefully" do
    # Temporarily remove all businesses
    Business.delete_all
    
    get '/api/v1/public/business'
    # Should still respond successfully but with empty/default data
    assert_response :success
    
    response_data = JSON.parse(response.body)
    assert_not_nil response_data['business']
  end
end