class ExpireSignalingRoomsJob < ApplicationJob
  queue_as :default

  def perform
    SignalingMessage.cleanup_expired!
    SignalingRoom.cleanup_expired!
  end
end
