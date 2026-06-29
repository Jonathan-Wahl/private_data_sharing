require "test_helper"

class ExpireSignalingRoomsJobTest < ActiveJob::TestCase
  test "removes expired signaling records" do
    expired_room = SignalingRoom.create!(expires_at: 1.minute.ago)
    active_room = SignalingRoom.create!

    ExpireSignalingRoomsJob.perform_now

    assert_not SignalingRoom.exists?(expired_room.id)
    assert SignalingRoom.exists?(active_room.id)
  end
end
