class ApplicationController < ActionController::API
  before_action :enforce_basic_rate_limit

  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity

  private

  def enforce_basic_rate_limit
    key = "rate-limit:#{request.remote_ip}:#{Time.current.to_i / 60}"
    count = Rails.cache.read(key).to_i + 1
    Rails.cache.write(key, count, expires_in: 1.minute)

    render json: { error: "rate limit exceeded" }, status: :too_many_requests if count > 120
  end

  def render_unprocessable_entity(error)
    render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
  end
end
