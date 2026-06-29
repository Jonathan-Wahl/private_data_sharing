require "test_helper"

class Api::SignalingRoomsControllerTest < ActionDispatch::IntegrationTest
  test "creates a short-lived signaling room" do
    post api_signaling_rooms_url, as: :json

    assert_response :created

    response_body = JSON.parse(response.body)
    assert response_body.fetch("id").present?
    assert_operator Time.zone.parse(response_body.fetch("expires_at")), :>, Time.current
    assert_equal [], response_body.fetch("messages")
  end

  test "appends signaling metadata messages" do
    room = SignalingRoom.create!

    post messages_api_signaling_room_url(room.token), params: {
      sender_id: "sender-device",
      type: "offer",
      body: {
        sdp: "v=0...",
        type: "offer"
      }
    }, as: :json

    assert_response :created

    response_body = JSON.parse(response.body)
    assert_equal 1, response_body.dig("room", "messages").length
    assert_equal "offer", response_body.dig("message", "type")
    assert_equal "v=0...", response_body.dig("message", "body", "sdp")
  end

  test "rejects payload-like message bodies" do
    room = SignalingRoom.create!

    post messages_api_signaling_room_url(room.token), params: {
      sender_id: "sender-device",
      type: "encrypted-metadata",
      body: {
        plaintext: "this does not belong in signaling"
      }
    }, as: :json

    assert_response :unprocessable_entity
    assert_includes JSON.parse(response.body).fetch("errors").join, "must not contain"
  end

  test "does not return expired rooms" do
    room = SignalingRoom.create!(expires_at: 1.minute.ago)

    get api_signaling_room_url(room.token), as: :json

    assert_response :not_found
  end
end
