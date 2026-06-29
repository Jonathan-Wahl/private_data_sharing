class Api::SignalingRoomsController < ApplicationController
  before_action :cleanup_expired_records
  before_action :set_room, only: %i[show create_message]

  def create
    room = SignalingRoom.create!

    render json: room.signaling_payload, status: :created
  end

  def show
    render json: @room.signaling_payload
  end

  def create_message
    message = @room.signaling_messages.create!(
      body: message_params.fetch(:body),
      message_type: message_params.fetch(:type),
      sender_id: message_params.fetch(:sender_id)
    )

    render json: { room: @room.signaling_payload, message: message.signaling_payload }, status: :created
  end

  private

  def cleanup_expired_records
    ExpireSignalingRoomsJob.perform_now
  end

  def message_params
    params.permit(:sender_id, :type, body: {})
  end

  def set_room
    @room = SignalingRoom.active.find_by!(token: params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "signaling room not found or expired" }, status: :not_found
  end
end
