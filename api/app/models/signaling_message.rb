class SignalingMessage < ApplicationRecord
  ALLOWED_TYPES = %w[answer candidate encrypted-metadata offer].freeze
  FORBIDDEN_BODY_KEYS = %w[
    content
    file
    key
    payload
    plaintext
    raw_key
    secret
    string
    text
  ].freeze
  MAX_BODY_BYTES = 16.kilobytes

  belongs_to :signaling_room

  before_validation :assign_expiration, on: :create

  validates :body, presence: true
  validates :expires_at, presence: true
  validates :message_type, inclusion: { in: ALLOWED_TYPES }
  validates :sender_id, length: { maximum: 128 }, presence: true
  validate :body_is_metadata_only
  validate :body_size_is_bounded
  validate :room_accepts_messages

  scope :expired, -> { where(expires_at: ..Time.current) }

  def self.cleanup_expired!
    expired.destroy_all
  end

  def signaling_payload
    {
      id: id,
      sender_id: sender_id,
      type: message_type,
      body: body,
      created_at: created_at.iso8601
    }
  end

  private

  def assign_expiration
    self.expires_at ||= signaling_room&.expires_at
  end

  def body_is_metadata_only
    return if body.blank?

    forbidden_keys = flatten_keys(body).map(&:downcase) & FORBIDDEN_BODY_KEYS
    return if forbidden_keys.empty?

    errors.add(:body, "must not contain payloads, plaintext, raw keys, or transferred content")
  end

  def body_size_is_bounded
    return if body.blank?

    errors.add(:body, "is too large for signaling metadata") if JSON.generate(body).bytesize > MAX_BODY_BYTES
  end

  def flatten_keys(value)
    case value
    when Hash
      value.flat_map { |key, nested_value| [ key.to_s, *flatten_keys(nested_value) ] }
    when Array
      value.flat_map { |nested_value| flatten_keys(nested_value) }
    else
      []
    end
  end

  def room_accepts_messages
    return if signaling_room.blank?

    errors.add(:signaling_room, "has expired") unless signaling_room.active?
    errors.add(:signaling_room, "message limit reached") if signaling_room.message_limit_reached?
  end
end
