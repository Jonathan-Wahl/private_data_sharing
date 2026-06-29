require "test_helper"

class SignalingMessageTest < ActiveSupport::TestCase
  test "allows WebRTC signaling metadata" do
    room = SignalingRoom.create!
    message = room.signaling_messages.build(
      body: { candidate: "candidate:0 1 udp 2122260223 192.0.2.1 54400 typ host" },
      message_type: "candidate",
      sender_id: "peer-a"
    )

    assert message.valid?
  end

  test "rejects raw secrets and payload fields" do
    room = SignalingRoom.create!
    message = room.signaling_messages.build(
      body: { secret: "raw-key", payload: "file bytes" },
      message_type: "encrypted-metadata",
      sender_id: "peer-a"
    )

    assert_not message.valid?
    assert_includes message.errors[:body].join, "must not contain"
  end

  test "rejects unknown signaling message types" do
    room = SignalingRoom.create!
    message = room.signaling_messages.build(
      body: { sdp: "v=0..." },
      message_type: "chat",
      sender_id: "peer-a"
    )

    assert_not message.valid?
  end
end
