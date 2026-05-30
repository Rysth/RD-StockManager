class UserExportJob < ApplicationJob
  queue_as :default

  def perform(search_params = {})
    Rails.logger.info "Starting user export with params: #{search_params.inspect}"

    begin
      # Build the query with the same logic as the controller
      base_query = User.includes(:roles, :account)
      @q = base_query.ransack(search_params)
      @q.sorts = 'id desc' if @q.sorts.empty?
      users = @q.result(distinct: true)

      # Generate the Excel file
      xlsx_data = UserExportService.to_xlsx(users)

      Rails.logger.info "User export completed successfully. Generated file with #{users.count} users"

      # Return the data for immediate download
      # In a real-world scenario, you might want to:
      # - Upload to S3 and send email with download link
      # - Store in temp directory and send notification
      # - Use Action Cable to notify frontend when ready

      xlsx_data
    rescue StandardError => e
      Rails.logger.error "Error in UserExportJob: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      raise e
    end
  end
end