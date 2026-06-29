class SignalingRoom < ApplicationRecord
  ROOM_TTL = 10.minutes
  MAX_MESSAGES = 64

  has_many :signaling_messages, dependent: :destroy

  before_validation :assign_token, on: :create
  before_validation :assign_expiration, on: :create

  validates :expires_at, presence: true
  validates :token, presence: true, uniqueness: true
  validate :expiration_is_short_lived

  scope :expired, -> { where(expires_at: ..Time.current) }
  scope :active, -> { where(expires_at: Time.current..) }

  def self.cleanup_expired!
    expired.destroy_all
  end

  def active?
    expires_at.future?
  end

  def message_limit_reached?
    signaling_messages.size >= MAX_MESSAGES
  end

  def signaling_payload
    {
      created_at: created_at.iso8601,
      id: token,
      expires_at: expires_at.iso8601,
      messages: signaling_messages.order(:created_at).map(&:signaling_payload)
    }
  end

  private

  def assign_expiration
    self.expires_at ||= ROOM_TTL.from_now
  end

  def assign_token
    self.token ||= SecureRandom.urlsafe_base64(24)
  end

  def expiration_is_short_lived
    return if expires_at.blank?

    max_expiration = (created_at || Time.current) + ROOM_TTL
    errors.add(:expires_at, "must be short-lived") if expires_at > max_expiration
  end
end
