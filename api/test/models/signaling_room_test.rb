require "test_helper"

class SignalingRoomTest < ActiveSupport::TestCase
  test "assigns a token and short expiration" do
    room = SignalingRoom.create!

    assert room.token.present?
    assert_operator room.expires_at, :>, Time.current
    assert_operator room.expires_at, :<=, 10.minutes.from_now
  end

  test "cleans up expired rooms and dependent messages" do
    expired_room = SignalingRoom.create!
    active_room = SignalingRoom.create!
    expired_room.signaling_messages.create!(
      body: { candidate: "candidate" },
      message_type: "candidate",
      sender_id: "peer"
    )
    expired_room.update!(expires_at: 1.minute.ago)

    assert_difference -> { SignalingRoom.count }, -1 do
      SignalingRoom.cleanup_expired!
    end

    assert_not SignalingRoom.exists?(expired_room.id)
    assert SignalingRoom.exists?(active_room.id)
    assert_equal 0, SignalingMessage.where(signaling_room_id: expired_room.id).count
  end
end
